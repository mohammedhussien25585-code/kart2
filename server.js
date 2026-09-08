const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');
const ADMIN_KEY = process.env.ADMIN_KEY || '';
const SMS_SECRET = process.env.SMS_SECRET || '';

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function nowId() {
  return crypto.randomBytes(8).toString('hex');
}

function cardCode() {
  return 'CARD-' + crypto.randomBytes(5).toString('hex').toUpperCase();
}

function defaultData() {
  const packages = [
    { id: 1, name: 'باقة 100 جيجا', price: 120, active: true },
    { id: 2, name: 'باقة 50 جيجا', price: 70, active: true },
    { id: 3, name: 'باقة 20 جيجا', price: 35, active: true },
    { id: 4, name: 'باقة مكالمات', price: 50, active: true },
    { id: 5, name: 'باقة سوشيال', price: 40, active: true }
  ];
  const cards = [];
  for (let i = 0; i < 142; i++) {
    cards.push({
      id: nowId(),
      code: cardCode(),
      packageId: (i % 5) + 1,
      status: 'available',
      soldAt: null,
      customer: null
    });
  }
  return {
    packages,
    cards,
    sales: [],
    customers: [],
    wallets: [
      { id: 1, name: 'STAR-WiFi كاش', number: '01023545726', balance: 0 }
    ],
    messages: [],
    pending: [],
    offers: [],
    pos: [],
    settings: {
      storeName: 'كرت شبكة',
      phone: '01023545726'
    }
  };
}

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return Object.assign(defaultData(), JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')));
    }
  } catch (e) {
    console.error('load', e.message);
  }
  const data = defaultData();
  saveData(data);
  return data;
}

function saveData(data) {
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, DATA_FILE);
}

let db = loadData();

function stats() {
  const cards = db.cards || [];
  return {
    offers: cards.filter(c => c.status === 'offer').length,
    used: cards.filter(c => c.status === 'used').length,
    available: cards.filter(c => c.status === 'available').length,
    packages: (db.packages || []).length,
    pending: (db.pending || []).length
  };
}

function takeCard(packageId) {
  const card = db.cards.find(c => Number(c.packageId) === Number(packageId) && c.status === 'available');
  if (!card) return null;
  card.status = 'used';
  card.soldAt = new Date().toISOString();
  return card;
}

function upsertCustomer(phone, name) {
  let c = db.customers.find(x => x.phone === phone);
  if (c) {
    c.purchases = (c.purchases || 0) + 1;
    if (name) c.name = name;
  } else {
    db.customers.push({ phone, name: name || '', purchases: 1 });
  }
}

function fulfill(order, type) {
  const card = takeCard(order.packageId);
  if (!card) return { error: 'لا توجد كروت متاحة لهذه الباقة' };
  card.customer = order.phone;
  const sale = {
    id: nowId(),
    orderId: order.id,
    packageId: order.packageId,
    packageName: order.packageName,
    price: order.price,
    phone: order.phone,
    name: order.name || '',
    cardCode: card.code,
    date: new Date().toLocaleString('ar-EG'),
    type: type || 'manual',
    wallet: order.walletName || ''
  };
  db.sales.push(sale);
  upsertCustomer(order.phone, order.name);
  db.pending = db.pending.filter(p => String(p.id) !== String(order.id));
  order.status = 'completed';
  order.cardCode = card.code;
  saveData(db);
  return { sale, card };
}

function parseAmount(text) {
  if (text == null || text === '') return null;
  const raw = String(text).replace(/,/g, '').replace(/٫/g, '.');
  const labeled = raw.match(/(?:مبلغ|استلام|تحويل|استقبلت|received|amount)\s*(\d+(?:\.\d+)?)/i);
  if (labeled) return parseFloat(labeled[1]);
  const withCur = raw.match(/(\d+(?:\.\d+)?)\s*(?:جنيه|ج\.م|ج|EGP|egp)/i);
  if (withCur) return parseFloat(withCur[1]);
  const m = raw.match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : null;
}

function ingestSms(payload, headers) {
  const deviceCode = String(payload.deviceCode || payload.device_token || payload.token || payload.code || headers['x-device-code'] || '').toUpperCase();
  const expected = ensureDevice();
  if (SMS_SECRET) {
    const token = headers['x-sms-secret'] || payload.secret;
    if (token !== SMS_SECRET && deviceCode !== expected) {
      return { status: 401, body: { error: 'unauthorized' } };
    }
  } else if (deviceCode && deviceCode !== expected) {
    return { status: 401, body: { error: 'رمز الجهاز غلط' } };
  }
  db.settings.smsLastSeen = new Date().toISOString();
  const body = payload.body || payload.text || payload.message || payload.sms || '';
  const amount = payload.amount != null && payload.amount !== '' ? parseFloat(payload.amount) : parseAmount(body);
  const from = payload.from || payload.sender || payload.origin || '';
  const msg = {
    id: nowId(),
    body,
    from,
    amount: amount || null,
    matched: false,
    reviewed: false,
    receivedAt: new Date().toISOString()
  };
  let delivered = null;
  if (amount) {
    const order = db.pending
      .filter(o => Number(o.price) === Number(amount))
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))[0];
    if (order) {
      const result = fulfill(order, 'sms');
      if (!result.error) {
        msg.matched = true;
        delivered = { orderId: order.id, cardCode: result.card.code, phone: order.phone };
      }
    }
  }
  db.messages.unshift(msg);
  db.messages = db.messages.slice(0, 200);
  saveData(db);
  return { status: 200, body: { ok: true, matched: msg.matched, delivered } };
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, stats: stats() });
});

app.get('/api/state', (req, res) => {
  res.json({
    packages: db.packages,
    cards: db.cards,
    sales: db.sales,
    customers: db.customers,
    wallets: db.wallets,
    messages: db.messages,
    pending: db.pending,
    offers: db.offers,
    pos: db.pos,
    settings: {
      storeName: (db.settings || {}).storeName,
      phone: (db.settings || {}).phone
    },
    stats: stats()
  });
});

app.get('/api/packages', (req, res) => {
  res.json((db.packages || []).filter(p => p.active !== false));
});

app.get('/api/wallets', (req, res) => {
  res.json(db.wallets || []);
});

app.get('/api/stats', (req, res) => res.json(stats()));

app.get('/api/my-cards', (req, res) => {
  const phone = String(req.query.phone || '').trim();
  if (!phone) return res.json([]);
  const list = (db.sales || []).filter(s => String(s.phone) === phone).map(s => ({
    code: s.cardCode,
    packageName: s.packageName,
    price: s.price,
    date: s.date,
    phone: s.phone
  }));
  res.json(list);
});


app.put('/api/state/:key', (req, res) => {
  const key = req.params.key;
  const allowed = ['packages', 'cards', 'sales', 'customers', 'wallets', 'messages', 'pending', 'offers', 'pos', 'settings'];
  if (!allowed.includes(key)) return res.status(400).json({ error: 'مفتاح غير مسموح' });
  if (key === 'settings' && req.body && typeof req.body === 'object') {
    db.settings = {
      storeName: req.body.storeName || 'كرت شبكة',
      phone: req.body.phone || ''
    };
  } else {
    db[key] = req.body;
  }
  saveData(db);
  res.json({ ok: true, stats: stats() });
});

app.post('/api/orders', (req, res) => {
  const { packageId, phone, name, walletId } = req.body || {};
  if (!phone || String(phone).replace(/\D/g, '').length < 10) {
    return res.status(400).json({ error: 'رقم الهاتف غير صحيح' });
  }
  const pkg = db.packages.find(p => Number(p.id) === Number(packageId) && p.active !== false);
  if (!pkg) return res.status(400).json({ error: 'الباقة غير موجودة' });
  const available = db.cards.some(c => Number(c.packageId) === Number(pkg.id) && c.status === 'available');
  if (!available) return res.status(400).json({ error: 'لا توجد كروت متاحة' });
  const wallet = db.wallets.find(w => String(w.id) === String(walletId)) || db.wallets[0];
  const order = {
    id: nowId(),
    packageId: pkg.id,
    packageName: pkg.name,
    price: pkg.price,
    phone: String(phone).trim(),
    name: (name || '').trim(),
    walletId: wallet ? wallet.id : null,
    walletName: wallet ? wallet.name : '',
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  db.pending.push(order);
  saveData(db);
  res.json({ order });
});

app.get('/api/orders/:id', (req, res) => {
  const id = req.params.id;
  const done = db.sales.find(s => String(s.orderId) === String(id));
  if (done) {
    return res.json({ status: 'completed', cardCode: done.cardCode, phone: done.phone });
  }
  const pending = db.pending.find(p => String(p.id) === String(id));
  if (pending) return res.json({ status: 'pending' });
  res.status(404).json({ status: 'not_found' });
});

app.post('/api/orders/:id/confirm', (req, res) => {
  const order = db.pending.find(p => String(p.id) === String(req.params.id));
  if (!order) return res.status(404).json({ error: 'الطلب غير موجود' });
  const result = fulfill(order, 'manual');
  if (result.error) return res.status(400).json({ error: result.error });
  res.json({ ok: true, cardCode: result.card.code, phone: order.phone });
});

function ensureDevice() {
  db.settings = db.settings || {};
  if (!db.settings.smsDeviceCode) {
    db.settings.smsDeviceCode = crypto.randomBytes(3).toString('hex').toUpperCase();
    saveData(db);
  }
  return db.settings.smsDeviceCode;
}

app.get('/api/device', (req, res) => {
  res.json({
    code: ensureDevice(),
    lastSeen: db.settings.smsLastSeen || null,
    connected: !!(db.settings.smsLastSeen && (Date.now() - new Date(db.settings.smsLastSeen).getTime()) < 5 * 60 * 1000)
  });
});

app.post('/api/device/regen', (req, res) => {
  db.settings = db.settings || {};
  db.settings.smsDeviceCode = crypto.randomBytes(3).toString('hex').toUpperCase();
  saveData(db);
  res.json({ code: db.settings.smsDeviceCode });
});

function handleSms(req, res) {
  const out = ingestSms(req.body || {}, req.headers || {});
  res.status(out.status).json(out.body);
}
app.post('/api/sms', handleSms);
app.post('/api/sms-bridge/events', handleSms);
app.post('/star/api/sms-bridge/events', handleSms);

app.post('/api/payments/:id/approve', (req, res) => {
  const msg = (db.messages || []).find(m => String(m.id) === String(req.params.id));
  if (!msg) return res.status(404).json({ error: 'الرسالة غير موجودة' });
  const amount = msg.amount || parseAmount(msg.body);
  const order = (db.pending || [])
    .filter(o => !amount || Number(o.price) === Number(amount))
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))[0];
  if (!order) return res.status(400).json({ error: 'لا يوجد طلب معلق مطابق' });
  const result = fulfill(order, 'review');
  if (result.error) return res.status(400).json({ error: result.error });
  msg.matched = true;
  msg.reviewed = true;
  saveData(db);
  res.json({ ok: true, cardCode: result.card.code, phone: order.phone });
});

app.post('/api/cards/feed', (req, res) => {
  const packageId = Number(req.body.packageId);
  const codes = Array.isArray(req.body.codes) ? req.body.codes : [];
  const count = parseInt(req.body.count, 10) || 0;
  const pkg = db.packages.find(p => Number(p.id) === packageId);
  if (!pkg) return res.status(400).json({ error: 'باقة غير موجودة' });
  let added = 0;
  const existing = new Set(db.cards.map(c => c.code));
  codes.forEach(raw => {
    const code = String(raw || '').trim().toUpperCase();
    if (!code || existing.has(code)) return;
    db.cards.push({
      id: nowId(),
      code,
      packageId,
      status: 'available',
      soldAt: null,
      customer: null
    });
    existing.add(code);
    added++;
  });
  for (let i = 0; i < count; i++) {
    let code = cardCode();
    while (existing.has(code)) code = cardCode();
    db.cards.push({
      id: nowId(),
      code,
      packageId,
      status: 'available',
      soldAt: null,
      customer: null
    });
    existing.add(code);
    added++;
  }
  saveData(db);
  res.json({ ok: true, added, stats: stats() });
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log('Kart Shabaka running on ' + PORT);
});
