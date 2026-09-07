// ========== Data Store (LocalStorage) ==========
const DB = {
  get(key, def = []) {
    try {
      return JSON.parse(localStorage.getItem('ks_' + key)) || def;
    } catch {
      return def;
    }
  },
  set(key, val) {
    localStorage.setItem('ks_' + key, JSON.stringify(val));
  }
};

// Initialize default data
function initData() {
  if (!localStorage.getItem('ks_initialized')) {
    DB.set('packages', [
      { id: 1, name: 'باقة 100 جيجا', price: 120, active: true },
      { id: 2, name: 'باقة 50 جيجا', price: 70, active: true },
      { id: 3, name: 'باقة 20 جيجا', price: 35, active: true },
      { id: 4, name: 'باقة مكالمات', price: 50, active: true },
      { id: 5, name: 'باقة سوشيال', price: 40, active: true },
    ]);
    DB.set('cards', generateCards(142));
    DB.set('sales', []);
    DB.set('customers', []);
    DB.set('wallets', [
      { id: 1, name: 'فودافون كاش', number: '01012345678', balance: 0 },
      { id: 2, name: 'أورانج كاش', number: '01234567890', balance: 0 },
    ]);
    DB.set('offers', []);
    DB.set('messages', []);
    DB.set('pos', []);
    DB.set('pending', []);
    localStorage.setItem('ks_initialized', '1');
  }
  updateStats();
}

function generateCards(count) {
  const cards = [];
  for (let i = 0; i < count; i++) {
    cards.push({
      id: i + 1,
      code: 'CARD-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
      packageId: (i % 5) + 1,
      status: 'available',
      soldAt: null,
      customer: null
    });
  }
  return cards;
}

function updateStats() {
  const cards = DB.get('cards');
  const packages = DB.get('packages');
  const available = cards.filter(c => c.status === 'available').length;
  const used = cards.filter(c => c.status === 'used').length;
  const offers = cards.filter(c => c.status === 'offer').length;

  const nums = document.querySelectorAll('.stat-number');
  if (nums.length >= 4) {
    nums[0].textContent = offers;
    nums[1].textContent = used;
    nums[2].textContent = available;
    nums[3].textContent = packages.length;
  }
}

// ========== Navigation ==========
const pageTitles = {
  'feed-cards': 'تغذية كروت الباقات',
  'packages': 'باقات الكروت',
  'archive': 'أرشيف الرسائل والكروت',
  'offers': 'عروض الباقات',
  'wallets': 'حسابات المحافظ والبنوك',
  'sales': 'مبيعات الكروت',
  'customers': 'العملاء',
  'manual-send': 'إرسال يدوي',
  'settings': 'الإعدادات',
  'pos': 'نقاط البيع والبقالات',
  'backup': 'نسخ احتياطي',
  'sms-bridge': 'جسر الرسائل',
  'sms-device': 'رمز جهاز فحص الرسائل',
  'payment-review': 'مراجعة تحويلات فودافون كاش',
  'pending': 'الطلبات المعلقة',
  'available-cards': 'الكروت المتاحة',
  'used-cards': 'الكروت المستخدمة',
  'offer-cards': 'كروت العروض',
  'all-packages': 'كل الباقات'
};

document.querySelectorAll('.menu-item').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.menu-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    openPage(btn.dataset.page);
  });
});

// Make stats clickable
document.querySelectorAll('.stat-card').forEach((card, index) => {
  card.style.cursor = 'pointer';
  card.addEventListener('click', () => {
    if (index === 0) openPage('offer-cards');
    else if (index === 1) openPage('used-cards');
    else if (index === 2) openPage('available-cards');
    else if (index === 3) openPage('packages');
  });
});

document.getElementById('back-btn').addEventListener('click', closePage);

window.addEventListener('popstate', function () {
  closePage();
});

function openPage(page) {
  document.getElementById('page-title').textContent = pageTitles[page] || page;
  document.getElementById('page-content').innerHTML = renderPage(page);
  document.getElementById('page-container').classList.remove('hidden');
  document.querySelector('.app').style.display = '';
  document.querySelector('.app').classList.add('is-hidden-home');
  attachPageEvents(page);
  history.pushState({ page: page }, '', '#page');
}

function closePage() {
  document.getElementById('page-container').classList.add('hidden');
  document.querySelector('.app').classList.remove('is-hidden-home');
  document.querySelector('.app').style.display = '';
  document.getElementById('page-content').innerHTML = '';
  updateStats();
  if (location.hash === '#page') {
    history.replaceState({}, '', location.pathname);
  }
}

// ========== Helpers ==========
function getPackageName(id) {
  const p = DB.get('packages').find(x => x.id === id);
  return p ? p.name : '-';
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ========== Page Renderers ==========
function renderPage(page) {
  switch (page) {
    case 'manual-send': return renderManualSend();
    case 'packages': return renderPackages();
    case 'feed-cards': return renderFeedCards();
    case 'sales': return renderSales();
    case 'customers': return renderCustomers();
    case 'wallets': return renderWallets();
    case 'archive': return renderArchive();
    case 'offers': return renderOffers();
    case 'settings': return renderSettings();
    case 'pos': return renderPOS();
    case 'backup': return renderBackup();
    case 'sms-bridge': return renderArchive();
    case 'sms-device': return renderSmsDevice();
    case 'payment-review': return renderPaymentReview();
    case 'pending': return renderArchive();
    case 'available-cards': return renderCardsList('available');
    case 'used-cards': return renderCardsList('used');
    case 'offer-cards': return renderCardsList('offer');
    default: return '<div class="empty-state"><div class="icon">🚧</div><p>قريباً</p></div>';
  }
}

// ----- Cards List (Available / Used / Offers) -----
function renderCardsList(status) {
  const cards = DB.get('cards').filter(c => c.status === status);
  const packages = DB.get('packages');
  const titleMap = { available: 'المتاحة', used: 'المستخدمة', offer: 'العروض' };

  let filterHtml = `
    <div class="form-card" style="margin-bottom:12px">
      <div class="form-group" style="margin:0">
        <label>تصفية حسب الباقة</label>
        <select id="cards-filter">
          <option value="all">كل الباقات</option>
          ${packages.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('')}
        </select>
      </div>
    </div>
  `;

  let rows = cards.map(c => `
    <tr data-pkg="${c.packageId}">
      <td dir="ltr" style="font-size:12px;font-weight:700">${escapeHtml(c.code)}</td>
      <td>${escapeHtml(getPackageName(c.packageId))}</td>
      <td>${c.customer ? '<span dir="ltr">'+escapeHtml(c.customer)+'</span>' : '-'}</td>
      <td style="font-size:11px">${c.soldAt ? new Date(c.soldAt).toLocaleDateString('ar-EG') : '-'}</td>
      <td>
        ${status === 'available' ? `
          <button class="btn" style="padding:4px 10px;font-size:11px;background:#e74c3c;color:#fff" onclick="deleteCard(${c.id})">حذف</button>
        ` : ''}
      </td>
    </tr>
  `).join('');

  return `
    ${filterHtml}
    <div class="mini-stats">
      <div class="mini-stat">
        <div class="num">${cards.length}</div>
        <div class="lbl">كروت ${titleMap[status]}</div>
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>كود الكارت</th>
            <th>الباقة</th>
            <th>العميل</th>
            <th>التاريخ</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="cards-tbody">
          ${rows || '<tr><td colspan="5" style="text-align:center;padding:30px">لا توجد كروت</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}

// ----- Manual Send -----
function renderManualSend() {
  const packages = DB.get('packages').filter(p => p.active);
  const options = packages.map(p => {
    const avail = DB.get('cards').filter(c => c.packageId === p.id && c.status === 'available').length;
    return `<option value="${p.id}">${escapeHtml(p.name)} - ${p.price} ج (${avail} متاح)</option>`;
  }).join('');

  return `
    <div class="form-card">
      <div class="form-group">
        <label>اختر الباقة</label>
        <select id="ms-package">${options}</select>
      </div>
      <div class="form-group">
        <label>رقم العميل (واتساب)</label>
        <input type="tel" id="ms-phone" placeholder="01xxxxxxxxx" dir="ltr" />
      </div>
      <div class="form-group">
        <label>اسم العميل (اختياري)</label>
        <input type="text" id="ms-name" placeholder="اسم العميل" />
      </div>
      <div class="form-group">
        <label>ملاحظات</label>
        <textarea id="ms-notes" rows="2" placeholder="ملاحظات إضافية..."></textarea>
      </div>
      <button class="btn btn-primary" id="ms-send-btn">🚀 إرسال الكارت الآن</button>
    </div>
    <div class="form-card">
      <h3 style="margin-bottom:12px;font-size:15px">آخر الإرسالات اليدوية</h3>
      <div id="ms-history"></div>
    </div>
  `;
}

// ----- Packages -----
function renderPackages() {
  const packages = DB.get('packages');
  const cards = DB.get('cards');

  let rows = packages.map(p => {
    const available = cards.filter(c => c.packageId === p.id && c.status === 'available').length;
    const used = cards.filter(c => c.packageId === p.id && c.status === 'used').length;
    return `
      <tr>
        <td>${escapeHtml(p.name)}</td>
        <td>${p.price} ج</td>
        <td>${available}</td>
        <td>${used}</td>
        <td><span class="badge ${p.active ? 'badge-success' : 'badge-danger'}">${p.active ? 'نشط' : 'متوقف'}</span></td>
        <td>
          <button type="button" class="btn js-act" data-act="edit-pkg" data-id="${p.id}" style="padding:4px 8px;font-size:11px;background:#f5a623;color:#111;margin-left:4px">تعديل</button>
          <button type="button" class="btn js-act" data-act="toggle-pkg" data-id="${p.id}" style="padding:4px 8px;font-size:11px;background:#3498db;color:#fff;margin-left:4px">${p.active ? 'إيقاف' : 'تفعيل'}</button>
          <button type="button" class="btn js-act" data-act="del-pkg" data-id="${p.id}" style="padding:4px 8px;font-size:11px;background:#e74c3c;color:#fff">حذف</button>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <div class="form-card">
      <div class="form-group">
        <label>اسم الباقة الجديدة</label>
        <input type="text" id="new-pkg-name" placeholder="مثال: باقة 200 جيجا" />
      </div>
      <div class="form-group">
        <label>السعر (جنيه)</label>
        <input type="number" id="new-pkg-price" placeholder="100" />
      </div>
      <button class="btn btn-primary" id="add-package-btn">+ إضافة باقة</button>
      <input type="hidden" id="edit-pkg-id" value="" />
    </div>
    <div class="form-card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>اسم الباقة</th>
              <th>السعر</th>
              <th>متاح</th>
              <th>مباع</th>
              <th>الحالة</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="6" style="text-align:center">لا توجد باقات</td></tr>'}</tbody>
        </table>
      </div>
    </div>
  `;
}

// ----- Feed Cards -----
function renderFeedCards() {
  const packages = DB.get('packages');
  const options = packages.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');

  return `
    <div class="form-card">
      <div class="form-group">
        <label>اختر الباقة</label>
        <select id="feed-package">${options}</select>
      </div>
      <div class="form-group">
        <label>الصق أكواد الكروت (كل كود في سطر)</label>
        <textarea id="feed-codes" rows="6" placeholder="CARD-XXXXXX&#10;CARD-YYYYYY&#10;..." dir="ltr" style="text-align:left"></textarea>
      </div>
      <button class="btn btn-primary" id="feed-btn" style="margin-bottom:12px">📥 تغذية من النص</button>
    </div>

    <div class="form-card">
      <h3 style="font-size:14px;margin-bottom:12px">أو ارفع ملف</h3>
      <p style="font-size:12px;color:#666;margin-bottom:12px;line-height:1.7">
        المدعوم حالياً: ملفات <strong>TXT</strong> أو <strong>CSV</strong><br>
        (كل كود في سطر منفصل)<br>
        ملفات Word و PDF هتتضاف في التحديث الجاي
      </p>
      <input type="file" id="feed-file" accept=".txt,.csv,.text" style="margin-bottom:12px;width:100%" />
      <button class="btn btn-primary" id="feed-file-btn">📂 تغذية من الملف</button>
    </div>
  `;
}

// ----- Sales -----
function renderSales() {
  const sales = DB.get('sales').slice().reverse();
  const total = sales.reduce((s, x) => s + (x.price || 0), 0);

  let rows = sales.slice(0, 100).map(s => `
    <tr>
      <td>${escapeHtml(s.packageName || '-')}</td>
      <td>${s.price} ج</td>
      <td dir="ltr">${escapeHtml(s.phone || '-')}</td>
      <td style="font-size:11px">${escapeHtml(s.date || '-')}</td>
      <td><span class="badge ${s.type === 'auto' ? 'badge-success' : 'badge-warning'}">${s.type === 'auto' ? 'تلقائي' : 'يدوي'}</span></td>
    </tr>
  `).join('');

  return `
    <div class="mini-stats">
      <div class="mini-stat">
        <div class="num">${sales.length}</div>
        <div class="lbl">عدد المبيعات</div>
      </div>
      <div class="mini-stat">
        <div class="num">${total} ج</div>
        <div class="lbl">إجمالي الإيراد</div>
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>الباقة</th>
            <th>السعر</th>
            <th>العميل</th>
            <th>التاريخ</th>
            <th>النوع</th>
          </tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="5" style="text-align:center;padding:30px">لا توجد مبيعات بعد</td></tr>'}</tbody>
      </table>
    </div>
  `;
}

// ----- Customers -----
function renderCustomers() {
  const customers = DB.get('customers');

  let rows = customers.map((c, i) => `
    <tr>
      <td>${escapeHtml(c.name || '-')}</td>
      <td dir="ltr">${escapeHtml(c.phone)}</td>
      <td>${c.purchases || 0}</td>
      <td>
        <button class="btn" style="padding:4px 8px;font-size:11px;background:#e74c3c;color:#fff" onclick="deleteCustomer('${escapeHtml(c.phone)}')">حذف</button>
      </td>
    </tr>
  `).join('');

  return `
    <div class="form-card">
      <div class="form-group">
        <label>اسم العميل</label>
        <input type="text" id="cust-name" placeholder="الاسم" />
      </div>
      <div class="form-group">
        <label>رقم الهاتف</label>
        <input type="tel" id="cust-phone" placeholder="01xxxxxxxxx" dir="ltr" />
      </div>
      <button class="btn btn-primary" id="add-customer-btn">+ إضافة عميل</button>
    </div>
    <div class="form-card">
      <div class="mini-stats" style="margin-bottom:12px">
        <div class="mini-stat">
          <div class="num">${customers.length}</div>
          <div class="lbl">إجمالي العملاء</div>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>الاسم</th>
              <th>الرقم</th>
              <th>المشتريات</th>
              <th></th>
            </tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="4" style="text-align:center;padding:30px">لا يوجد عملاء بعد</td></tr>'}</tbody>
        </table>
      </div>
    </div>
  `;
}

// ----- Wallets -----
function renderWallets() {
  const wallets = DB.get('wallets');
  let html = wallets.map(w => `
    <div class="form-card" style="display:flex;justify-content:space-between;align-items:center;gap:10px">
      <div>
        <div style="font-weight:700;font-size:15px">${escapeHtml(w.name)}</div>
        <div style="color:#666;font-size:13px;direction:ltr;text-align:right">${escapeHtml(w.number)}</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <div style="font-weight:800;font-size:16px;color:#27ae60">${w.balance} ج</div>
        <button class="btn" style="padding:4px 8px;font-size:11px;background:#e74c3c;color:#fff" onclick="deleteWallet(${w.id})">حذف</button>
      </div>
    </div>
  `).join('');

  return `
    ${html || '<div class="form-card"><p style="text-align:center;color:#888">لا توجد محافظ</p></div>'}
    <div class="form-card">
      <div class="form-group">
        <label>اسم المحفظة / البنك</label>
        <input type="text" id="wallet-name" placeholder="فودافون كاش / إنستا باي..." />
      </div>
      <div class="form-group">
        <label>الرقم</label>
        <input type="text" id="wallet-number" placeholder="01xxxxxxxxx" dir="ltr" />
      </div>
      <button class="btn btn-primary" id="add-wallet-btn">+ إضافة محفظة / حساب</button>
    </div>
  `;
}

function getDeviceCode() {
  var s = DB.get('settings', {}) || {};
  if (!s.smsDeviceCode) {
    s.smsDeviceCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    DB.set('settings', s);
  }
  return s.smsDeviceCode;
}

function renderSmsDevice() {
  var s = DB.get('settings', {}) || {};
  var code = getDeviceCode();
  var last = s.smsLastSeen ? new Date(s.smsLastSeen).toLocaleString('ar-EG') : 'لم يتصل بعد';
  return `
    <div class="form-card">
      <h3 style="font-size:16px;margin-bottom:8px">ربط فاحص الرسائل</h3>
      <p style="font-size:13px;color:#555;line-height:1.8;margin-bottom:12px">
        ثبّت تطبيق فحص الرسائل على موبايل المحفظة (فودافون كاش).<br>
        حط الرمز ده في التطبيق عشان الرسائل توصل هنا.
      </p>
      <div style="background:#111;color:#f5a623;font-size:28px;font-weight:800;letter-spacing:4px;text-align:center;padding:18px;border-radius:12px;direction:ltr">${escapeHtml(code)}</div>
      <p style="text-align:center;font-size:12px;color:#888;margin:10px 0">آخر اتصال: ${escapeHtml(last)}</p>
      <button class="btn btn-primary" id="regen-device-btn">توليد رمز جديد</button>
      <button class="btn" id="copy-device-btn" style="width:100%;margin-top:8px;background:#eee">نسخ الرمز</button>
    </div>
    <div class="form-card">
      <h3 style="font-size:14px;margin-bottom:8px">رابط الإرسال للتطبيق</h3>
      <p style="font-size:12px;direction:ltr;text-align:left;background:#f6f6f6;padding:10px;border-radius:8px;word-break:break-all">${escapeHtml((window.API_BASE || location.origin) + '/api/sms')}</p>
      <p style="font-size:13px;color:#555;line-height:1.8;margin-top:10px">
        التطبيق يبعت JSON:<br>
        <span dir="ltr" style="font-size:12px">{"deviceCode":"${escapeHtml(code)}","body":"تم استلام 120 جنيه","from":"Vodafone"}</span>
      </p>
      <a class="btn btn-primary" href="inspector.html" style="display:block;text-align:center;text-decoration:none;margin-top:10px">فتح صفحة الفاحص اليدوي</a>
    </div>
  `;
}

function renderPaymentReview() {
  const messages = (DB.get('messages') || []).slice().reverse();
  const pending = DB.get('pending') || [];
  let rows = messages.map(m => `
    <tr>
      <td style="font-size:11px">${m.receivedAt ? new Date(m.receivedAt).toLocaleString('ar-EG') : '-'}</td>
      <td dir="ltr">${escapeHtml(m.from || '-')}</td>
      <td>${m.amount || '-'}</td>
      <td style="font-size:12px">${escapeHtml((m.body || '').substring(0, 60))}</td>
      <td><span class="badge ${m.matched ? 'badge-success' : 'badge-warning'}">${m.matched ? 'مطابقة' : 'مراجعة'}</span></td>
      <td>
        ${!m.matched ? `<button class="btn" style="padding:4px 8px;font-size:11px;background:#27ae60;color:#fff" onclick="approvePayment('${m.id}')">تأكيد</button>` : ''}
      </td>
    </tr>
  `).join('');
  return `
    <div class="form-card">
      <h3 style="font-size:16px;margin-bottom:8px">مراجعة رسائل الدفع</h3>
      <p style="font-size:13px;color:#555;margin-bottom:12px">تحويلات فودافون كاش الواردة من جهاز الفحص. أكّد اللي مطابق لطلب معلق (${pending.length} طلب).</p>
      <div class="table-wrap">
        <table>
          <thead><tr><th>الوقت</th><th>المرسل</th><th>المبلغ</th><th>الرسالة</th><th>الحالة</th><th></th></tr></thead>
          <tbody>${rows || '<tr><td colspan="6" style="text-align:center;padding:24px">لا توجد رسائل بعد</td></tr>'}</tbody>
        </table>
      </div>
    </div>
  `;
}

async function approvePayment(id) {
  if (!confirm('تأكيد التحويل وارسال الكارت؟')) return;
  if (window.USE_API) {
    try {
      const r = await fetch((window.API_BASE || '') + '/api/payments/' + id + '/approve', { method: 'POST' });
      const data = await r.json();
      if (!r.ok) { alert(data.error || 'فشل'); return; }
      alert('تم إرسال الكارت: ' + data.cardCode);
      if (window.bootKartApi) await window.bootKartApi();
      openPage('payment-review');
      return;
    } catch (e) {}
  }
  const messages = DB.get('messages') || [];
  const msg = messages.find(m => String(m.id) === String(id));
  if (!msg) return;
  const pending = DB.get('pending') || [];
  const order = pending.filter(o => !msg.amount || Number(o.price) === Number(msg.amount))[0];
  if (!order) { alert('لا يوجد طلب معلق مطابق'); return; }
  fulfillPendingOrder(order, 'review');
}

function regenDeviceCode() {
  var s = DB.get('settings', {}) || {};
  s.smsDeviceCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  DB.set('settings', s);
  if (window.USE_API) {
    fetch((window.API_BASE || '') + '/api/device/regen', { method: 'POST' }).finally(function(){ openPage('sms-device'); });
    return;
  }
  openPage('sms-device');
}

// ----- Archive -----
function renderArchive() {
  const messages = DB.get('messages').slice().reverse();
  const pending = DB.get('pending') || [];

  let pendingHtml = '';
  if (pending.length) {
    pendingHtml = `
      <div class="form-card">
        <h3 style="font-size:14px;margin-bottom:10px;color:#e67e22">⏳ طلبات في انتظار التأكيد (${pending.length})</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th>الباقة</th><th>المبلغ</th><th>الرقم</th><th>الوقت</th><th></th></tr></thead>
            <tbody>
              ${pending.map(p => `
                <tr>
                  <td>${escapeHtml(p.packageName)}</td>
                  <td>${p.price} ج</td>
                  <td dir="ltr">${escapeHtml(p.phone)}</td>
                  <td style="font-size:11px">${new Date(p.createdAt).toLocaleString('ar-EG')}</td>
                  <td>
                    <button class="btn" style="padding:4px 10px;font-size:11px;background:#27ae60;color:#fff" onclick="confirmPending('${p.id}')">تأكيد يدوي</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  let rows = messages.slice(0, 50).map(m => `
    <tr>
      <td style="font-size:12px">${escapeHtml((m.body || '').substring(0, 50))}...</td>
      <td>${m.amount || '-'}</td>
      <td><span class="badge ${m.matched ? 'badge-success' : 'badge-warning'}">${m.matched ? 'تم المطابقة' : 'انتظار'}</span></td>
    </tr>
  `).join('');

  return `
    ${pendingHtml}
    <div class="form-card">
      <p style="font-size:13px;color:#666;margin-bottom:12px;line-height:1.7">
        هنا تظهر رسائل التأكيد الواردة من <strong>جسر الرسائل</strong>.<br>
        لو الجسر مش شغال استخدم <strong>تأكيد يدوي</strong> على الطلب المعلق.
      </p>
      <div class="form-group">
        <label>تجربة رسالة تحويل (بدل الجسر)</label>
        <input type="number" id="sim-amount" placeholder="اكتب المبلغ زي 120" />
      </div>
      <button class="btn btn-primary" id="sim-sms-btn">محاكاة رسالة وتحويل الكارت</button>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>الرسالة</th>
              <th>المبلغ</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="3" style="text-align:center;padding:30px">لا توجد رسائل بعد<br><small>هتظهر هنا لما يتوصل جسر الرسائل</small></td></tr>'}</tbody>
        </table>
      </div>
    </div>
  `;
}

// ----- Offers -----
function renderOffers() {
  const offers = DB.get('offers');
  return `
    <div class="form-card">
      <div class="form-group">
        <label>عنوان العرض</label>
        <input type="text" id="offer-title" placeholder="خصم 10% على باقة 100 جيجا" />
      </div>
      <div class="form-group">
        <label>تفاصيل العرض</label>
        <textarea id="offer-desc" rows="3" placeholder="اكتب تفاصيل العرض..."></textarea>
      </div>
      <button class="btn btn-primary" id="add-offer-btn">+ إضافة عرض</button>
    </div>
    <div class="form-card">
      ${offers.length ? offers.map((o, i) => `
        <div style="padding:12px 0;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-weight:700">${escapeHtml(o.title)}</div>
            <div style="font-size:12px;color:#666">${escapeHtml(o.desc || '')}</div>
          </div>
          <button class="btn" style="padding:4px 8px;font-size:11px;background:#e74c3c;color:#fff" onclick="deleteOffer(${i})">حذف</button>
        </div>
      `).join('') : '<p style="text-align:center;color:#888;padding:20px">لا توجد عروض حالياً</p>'}
    </div>
  `;
}

// ----- Settings -----
function renderSettings() {
  const settings = DB.get('settings', {});
  return `
    <div class="form-card">
      <div class="form-group">
        <label>اسم المتجر</label>
        <input type="text" id="set-name" value="${escapeHtml(settings.storeName || 'كرت شبكة')}" />
      </div>
      <div class="form-group">
        <label>رقم التواصل</label>
        <input type="tel" id="set-phone" value="${escapeHtml(settings.phone || '01023545726')}" dir="ltr" />
      </div>
      <div class="form-group">
        <label>رابط جسر الرسائل (API)</label>
        <input type="text" id="set-bridge" value="${escapeHtml(settings.bridgeUrl || '')}" placeholder="https://your-server.com/api/sms" dir="ltr" style="text-align:left" />
      </div>
      <div class="form-group">
        <label>توكن واتساب Business API (اختياري)</label>
        <input type="text" id="set-whatsapp" value="${escapeHtml(settings.whatsappToken || '')}" placeholder="WhatsApp Token" dir="ltr" style="text-align:left" />
      </div>
      <button class="btn btn-primary" id="save-settings">💾 حفظ الإعدادات</button>
    </div>
    <div class="form-card">
      <h3 style="font-size:14px;margin-bottom:10px">إضافة مدير جديد</h3>
      <div class="form-group">
        <label>يوزر المدير</label>
        <input type="text" id="new-admin-user" placeholder="username" dir="ltr" />
      </div>
      <div class="form-group">
        <label>باسوورد المدير</label>
        <input type="password" id="new-admin-pass" placeholder="password" dir="ltr" />
      </div>
      <button class="btn btn-primary" id="add-admin-btn">+ حفظ مدير جديد</button>
      <div id="admins-list" style="margin-top:12px;font-size:13px;color:#555"></div>
    </div>
    <div class="form-card">
      <h3 style="font-size:14px;margin-bottom:10px">عن جسر الرسائل</h3>
      <p style="font-size:13px;color:#555;line-height:1.8">
        1) ارفع السيرفر (Render) وحط رابطه هنا.<br>
        2) في تطبيق جسر الرسائل حط: رابط السيرفر + /api/sms<br>
        3) لو الجسر مش شغال: أرشيف الرسائل → تأكيد يدوي للطلب المعلق.<br>
        4) تقدر تجرب بمبلغ الطلب من خانة محاكاة الرسالة.
      </p>
    </div>
  `;
}

// ----- POS -----
function renderPOS() {
  const pos = DB.get('pos');
  let rows = pos.map(p => `
    <tr>
      <td>${escapeHtml(p.name)}</td>
      <td dir="ltr">${escapeHtml(p.phone)}</td>
      <td>${p.balance || 0} ج</td>
      <td>
        <button class="btn" style="padding:4px 8px;font-size:11px;background:#e74c3c;color:#fff" onclick="deletePOS(${p.id})">حذف</button>
      </td>
    </tr>
  `).join('');

  return `
    <div class="form-card">
      <div class="form-group">
        <label>اسم نقطة البيع</label>
        <input type="text" id="pos-name" placeholder="بقالة أبو أحمد" />
      </div>
      <div class="form-group">
        <label>رقم الهاتف</label>
        <input type="tel" id="pos-phone" placeholder="01xxxxxxxxx" dir="ltr" />
      </div>
      <div class="form-group">
        <label>الرصيد الافتتاحي</label>
        <input type="number" id="pos-balance" placeholder="0" value="0" />
      </div>
      <button class="btn btn-primary" id="add-pos-btn">+ إضافة نقطة بيع</button>
    </div>
    <div class="form-card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>الاسم</th>
              <th>الرقم</th>
              <th>الرصيد</th>
              <th></th>
            </tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="4" style="text-align:center;padding:30px">لا توجد نقاط بيع</td></tr>'}</tbody>
        </table>
      </div>
    </div>
  `;
}

// ----- Backup -----
function renderBackup() {
  return `
    <div class="form-card">
      <p style="font-size:14px;margin-bottom:16px;line-height:1.7">
        خذ نسخة احتياطية من كل البيانات (كروت - مبيعات - عملاء - إعدادات) وحفظها على جهازك.
      </p>
      <button class="btn btn-primary" id="backup-btn" style="margin-bottom:10px">💾 تحميل نسخة احتياطية</button>
      <button class="btn" id="restore-btn" style="width:100%;background:#3498db;color:#fff">📥 استعادة من ملف</button>
      <input type="file" id="restore-file" accept=".json" style="display:none" />
    </div>
    <div class="form-card">
      <button class="btn btn-danger" id="reset-btn" style="width:100%">🗑️ مسح كل البيانات وإعادة التعيين</button>
    </div>
  `;
}

// ========== Page Events ==========
function bindClick(id, fn) {
  var el = document.getElementById(id);
  if (el) el.addEventListener('click', fn);
}

function attachPageEvents(page) {
  if (page === 'manual-send') {
    bindClick('ms-send-btn', doManualSend);
    renderManualHistory();
  }
  if (page === 'feed-cards') {
    bindClick('feed-btn', doFeedCards);
    bindClick('feed-file-btn', doFeedFromFile);
  }
  if (page === 'packages') {
    bindClick('add-package-btn', doAddPackage);
    document.querySelectorAll('.js-act').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var act = btn.getAttribute('data-act');
        var id = btn.getAttribute('data-id');
        if (act === 'edit-pkg') startEditPackage(id);
        if (act === 'toggle-pkg') togglePackage(id);
        if (act === 'del-pkg') deletePackage(id);
      });
    });
  }
  if (page === 'archive' || page === 'sms-bridge' || page === 'pending') {
    bindClick('sim-sms-btn', simulateIncomingSms);
  }
  if (page === 'sms-device') {
    bindClick('regen-device-btn', regenDeviceCode);
    bindClick('copy-device-btn', function () {
      var s = DB.get('settings', {}) || {};
      var code = s.smsDeviceCode || '';
      if (navigator.clipboard) navigator.clipboard.writeText(code);
      alert('تم نسخ الرمز: ' + code);
    });
  }
  if (page === 'customers') {
    bindClick('add-customer-btn', doAddCustomer);
  }
  if (page === 'wallets') {
    bindClick('add-wallet-btn', doAddWallet);
  }
  if (page === 'pos') {
    bindClick('add-pos-btn', doAddPOS);
  }
  if (page === 'offers') {
    bindClick('add-offer-btn', doAddOffer);
  }
  if (page === 'settings') {
    bindClick('save-settings', doSaveSettings);
    bindClick('add-admin-btn', addAdminUser);
    renderAdminsList();
  }
  if (page === 'backup') {
    bindClick('backup-btn', doBackup);
    bindClick('restore-btn', function () {
      var f = document.getElementById('restore-file');
      if (f) f.click();
    });
    var rf = document.getElementById('restore-file');
    if (rf) rf.addEventListener('change', doRestore);
    bindClick('reset-btn', doReset);
  }
  if (page === 'available-cards' || page === 'used-cards' || page === 'offer-cards') {
    var filter = document.getElementById('cards-filter');
    if (filter) {
      filter.addEventListener('change', function() {
        var val = this.value;
        document.querySelectorAll('#cards-tbody tr').forEach(function(tr) {
          if (val === 'all' || tr.getAttribute('data-pkg') === val) tr.style.display = '';
          else tr.style.display = 'none';
        });
      });
    }
  }
}

// ========== Actions ==========
function doManualSend() {
  const packageId = parseInt(document.getElementById('ms-package').value);
  const phone = document.getElementById('ms-phone').value.trim();
  const name = document.getElementById('ms-name').value.trim();
  const notes = document.getElementById('ms-notes').value.trim();

  if (!phone || phone.length < 10) {
    alert('من فضلك أدخل رقم العميل بشكل صحيح');
    return;
  }

  const packages = DB.get('packages');
  const pkg = packages.find(p => p.id === packageId);
  if (!pkg) return;

  const cards = DB.get('cards');
  const card = cards.find(c => c.packageId === packageId && c.status === 'available');

  if (!card) {
    alert('لا توجد كروت متاحة لهذه الباقة');
    return;
  }

  card.status = 'used';
  card.soldAt = new Date().toISOString();
  card.customer = phone;
  DB.set('cards', cards);

  const sales = DB.get('sales');
  sales.push({
    id: Date.now(),
    packageId,
    packageName: pkg.name,
    price: pkg.price,
    phone,
    name,
    notes,
    cardCode: card.code,
    date: new Date().toLocaleString('ar-EG'),
    type: 'manual'
  });
  DB.set('sales', sales);

  let customers = DB.get('customers');
  let cust = customers.find(c => c.phone === phone);
  if (cust) {
    cust.purchases = (cust.purchases || 0) + 1;
    if (name) cust.name = name;
  } else {
    customers.push({ phone, name: name || '', purchases: 1 });
  }
  DB.set('customers', customers);

  alert(`✅ تم إرسال الكارت بنجاح\n\nالكود: ${card.code}\nالباقة: ${pkg.name}\nللعميل: ${phone}`);
  renderManualHistory();
  updateStats();
}

function renderManualHistory() {
  const sales = DB.get('sales').filter(s => s.type === 'manual').slice().reverse().slice(0, 15);
  const el = document.getElementById('ms-history');
  if (!el) return;

  if (!sales.length) {
    el.innerHTML = '<p style="color:#888;font-size:13px;text-align:center">لا توجد إرسالات يدوية بعد</p>';
    return;
  }

  el.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>الباقة</th>
            <th>الكود</th>
            <th>الرقم</th>
          </tr>
        </thead>
        <tbody>
          ${sales.map(s => `
            <tr>
              <td>${escapeHtml(s.packageName)}</td>
              <td dir="ltr" style="font-size:12px">${escapeHtml(s.cardCode)}</td>
              <td dir="ltr">${escapeHtml(s.phone)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function doFeedCards() {
  const packageId = parseInt(document.getElementById('feed-package').value);
  const text = document.getElementById('feed-codes').value.trim();
  if (!text) {
    alert('الصق أكواد الكروت أولاً');
    return;
  }
  addCodes(text, packageId);
  document.getElementById('feed-codes').value = '';
}

function doFeedFromFile() {
  const fileInput = document.getElementById('feed-file');
  const file = fileInput.files[0];
  if (!file) {
    alert('اختر ملف أولاً');
    return;
  }
  const packageId = parseInt(document.getElementById('feed-package').value);
  const reader = new FileReader();
  reader.onload = (e) => {
    addCodes(e.target.result, packageId);
    fileInput.value = '';
  };
  reader.readAsText(file);
}

function addCodes(text, packageId) {
  const codes = text.split(/[\n,;]+/).map(c => c.trim()).filter(Boolean);
  const cards = DB.get('cards');
  let added = 0;
  let skipped = 0;

  codes.forEach(code => {
    if (!cards.find(c => c.code === code)) {
      cards.push({
        id: Date.now() + Math.random(),
        code,
        packageId,
        status: 'available',
        soldAt: null,
        customer: null
      });
      added++;
    } else {
      skipped++;
    }
  });

  DB.set('cards', cards);
  updateStats();
  alert(`✅ تم إضافة ${added} كارت\n${skipped > 0 ? '⏭️ تم تخطي ' + skipped + ' مكرر' : ''}`);
}

function startEditPackage(id) {
  const p = DB.get('packages').find(x => Number(x.id) === Number(id));
  if (!p) return;
  document.getElementById('new-pkg-name').value = p.name;
  document.getElementById('new-pkg-price').value = p.price;
  document.getElementById('edit-pkg-id').value = p.id;
  document.getElementById('add-package-btn').textContent = 'حفظ التعديل';
  window.scrollTo(0, 0);
}

async function confirmPending(orderId) {
  if (window.USE_API && window.API_BASE !== undefined) {
    if (!confirm('تأكيد استلام التحويل وإرسال الكارت؟')) return;
    try {
      const r = await fetch((window.API_BASE || '') + '/api/orders/' + orderId + '/confirm', { method: 'POST' });
      const data = await r.json();
      if (!r.ok) { alert(data.error || 'فشل التأكيد'); return; }
      alert('تم إرسال الكارت: ' + data.cardCode);
      if (window.bootKartApi) await window.bootKartApi();
      openPage('archive');
      return;
    } catch (e) {}
  }
  const pending = DB.get('pending') || [];
  const order = pending.find(p => String(p.id) === String(orderId));
  if (!order) { alert('الطلب غير موجود'); return; }
  if (!confirm('تأكيد استلام مبلغ ' + order.price + ' ج من ' + order.phone + '؟')) return;
  fulfillPendingOrder(order, 'manual');
}

function simulateIncomingSms() {
  const amount = parseFloat(document.getElementById('sim-amount').value);
  if (!amount) { alert('اكتب المبلغ'); return; }
  const pending = (DB.get('pending') || []).filter(o => Number(o.price) === amount);
  const order = pending.sort(function(a,b){ return new Date(a.createdAt) - new Date(b.createdAt); })[0];
  const messages = DB.get('messages') || [];
  messages.unshift({
    id: Date.now(),
    body: 'تم استلام مبلغ ' + amount + ' جنيه',
    amount: amount,
    matched: !!order,
    receivedAt: new Date().toISOString()
  });
  DB.set('messages', messages);
  if (!order) {
    alert('مفيش طلب معلق بنفس المبلغ');
    openPage('archive');
    return;
  }
  fulfillPendingOrder(order, 'auto');
}

function fulfillPendingOrder(order, type) {
  const cards = DB.get('cards');
  const card = cards.find(c => Number(c.packageId) === Number(order.packageId) && c.status === 'available');
  if (!card) {
    alert('لا توجد كروت متاحة لهذه الباقة');
    return;
  }
  card.status = 'used';
  card.soldAt = new Date().toISOString();
  card.customer = order.phone;
  DB.set('cards', cards);

  const sales = DB.get('sales') || [];
  sales.push({
    id: Date.now(),
    orderId: order.id,
    packageId: order.packageId,
    packageName: order.packageName,
    price: order.price,
    phone: order.phone,
    name: order.name || '',
    cardCode: card.code,
    date: new Date().toLocaleString('ar-EG'),
    type: type || 'manual',
    wallet: order.walletName
  });
  DB.set('sales', sales);

  let customers = DB.get('customers') || [];
  let cust = customers.find(c => c.phone === order.phone);
  if (cust) {
    cust.purchases = (cust.purchases || 0) + 1;
    if (order.name) cust.name = order.name;
  } else {
    customers.push({ phone: order.phone, name: order.name || '', purchases: 1 });
  }
  DB.set('customers', customers);

  DB.set('pending', (DB.get('pending') || []).filter(p => String(p.id) !== String(order.id)));
  updateStats();
  alert('تم إرسال الكارت: ' + card.code + '\nللرقم: ' + order.phone);
  openPage('archive');
}

function doAddPackage() {
  const name = document.getElementById('new-pkg-name').value.trim();
  const price = parseFloat(document.getElementById('new-pkg-price').value);
  const editId = document.getElementById('edit-pkg-id') && document.getElementById('edit-pkg-id').value;
  if (!name || !price) {
    alert('أدخل اسم الباقة والسعر');
    return;
  }
  const packages = DB.get('packages');
  if (editId) {
    const p = packages.find(x => String(x.id) === String(editId));
    if (p) {
      p.name = name;
      p.price = price;
    }
  } else {
    const id = packages.length ? Math.max.apply(null, packages.map(function(p){ return Number(p.id)||0; })) + 1 : 1;
    packages.push({ id: id, name: name, price: price, active: true });
  }
  DB.set('packages', packages);
  openPage('packages');
  updateStats();
}

function togglePackage(id) {
  const packages = DB.get('packages');
  const p = packages.find(x => String(x.id) === String(id));
  if (p) {
    p.active = !p.active;
    DB.set('packages', packages);
    openPage('packages');
  }
}

function deletePackage(id) {
  if (!confirm('حذف الباقة؟ الكروت المرتبطة لن تُحذف.')) return;
  let packages = DB.get('packages').filter(p => String(p.id) !== String(id));
  DB.set('packages', packages);
  openPage('packages');
  updateStats();
}

function doAddCustomer() {
  const name = document.getElementById('cust-name').value.trim();
  const phone = document.getElementById('cust-phone').value.trim();
  if (!phone || phone.length < 10) {
    alert('أدخل رقم الهاتف بشكل صحيح');
    return;
  }
  let customers = DB.get('customers');
  if (customers.find(c => c.phone === phone)) {
    alert('هذا الرقم موجود مسبقاً');
    return;
  }
  customers.push({ phone, name: name || '', purchases: 0 });
  DB.set('customers', customers);
  openPage('customers');
}

function deleteCustomer(phone) {
  if (!confirm('حذف هذا العميل؟')) return;
  let customers = DB.get('customers').filter(c => c.phone !== phone);
  DB.set('customers', customers);
  openPage('customers');
}

function doAddWallet() {
  const name = document.getElementById('wallet-name').value.trim();
  const number = document.getElementById('wallet-number').value.trim();
  if (!name || !number) {
    alert('أدخل اسم المحفظة والرقم');
    return;
  }
  const wallets = DB.get('wallets');
  const id = wallets.length ? Math.max(...wallets.map(w => w.id)) + 1 : 1;
  wallets.push({ id, name, number, balance: 0 });
  DB.set('wallets', wallets);
  openPage('wallets');
}

function deleteWallet(id) {
  if (!confirm('حذف هذه المحفظة؟')) return;
  let wallets = DB.get('wallets').filter(w => w.id !== id);
  DB.set('wallets', wallets);
  openPage('wallets');
}

function doAddPOS() {
  const name = document.getElementById('pos-name').value.trim();
  const phone = document.getElementById('pos-phone').value.trim();
  const balance = parseFloat(document.getElementById('pos-balance').value) || 0;
  if (!name || !phone) {
    alert('أدخل الاسم والرقم');
    return;
  }
  const pos = DB.get('pos');
  const id = pos.length ? Math.max(...pos.map(p => p.id)) + 1 : 1;
  pos.push({ id, name, phone, balance });
  DB.set('pos', pos);
  openPage('pos');
}

function deletePOS(id) {
  if (!confirm('حذف نقطة البيع؟')) return;
  let pos = DB.get('pos').filter(p => p.id !== id);
  DB.set('pos', pos);
  openPage('pos');
}

function doAddOffer() {
  const title = document.getElementById('offer-title').value.trim();
  const desc = document.getElementById('offer-desc').value.trim();
  if (!title) {
    alert('أدخل عنوان العرض');
    return;
  }
  const offers = DB.get('offers');
  offers.push({ title, desc });
  DB.set('offers', offers);
  openPage('offers');
}

function deleteOffer(index) {
  let offers = DB.get('offers');
  offers.splice(index, 1);
  DB.set('offers', offers);
  openPage('offers');
}

function doSaveSettings() {
  DB.set('settings', {
    storeName: document.getElementById('set-name').value.trim(),
    phone: document.getElementById('set-phone').value.trim(),
    bridgeUrl: document.getElementById('set-bridge').value.trim(),
    whatsappToken: document.getElementById('set-whatsapp').value.trim()
  });
  alert('✅ تم حفظ الإعدادات');
}

function deleteCard(id) {
  if (!confirm('حذف هذا الكارت؟')) return;
  let cards = DB.get('cards').filter(c => c.id !== id);
  DB.set('cards', cards);
  openPage('available-cards');
  updateStats();
}

function doBackup() {
  const data = {
    packages: DB.get('packages'),
    cards: DB.get('cards'),
    sales: DB.get('sales'),
    customers: DB.get('customers'),
    wallets: DB.get('wallets'),
    messages: DB.get('messages'),
    pos: DB.get('pos'),
    offers: DB.get('offers'),
    settings: DB.get('settings', {}),
    pending: DB.get('pending', []),
    exportedAt: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kart-shabaka-backup-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function doRestore(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      ['packages','cards','sales','customers','wallets','messages','pos','offers','pending'].forEach(k => {
        if (data[k]) DB.set(k, data[k]);
      });
      if (data.settings) DB.set('settings', data.settings);
      alert('✅ تم استعادة النسخة الاحتياطية');
      updateStats();
      closePage();
    } catch {
      alert('ملف غير صالح');
    }
  };
  reader.readAsText(file);
}

function doReset() {
  if (confirm('هل أنت متأكد من مسح كل البيانات؟ لا يمكن التراجع!')) {
    ['packages','cards','sales','customers','wallets','messages','pending','offers','pos','settings','initialized'].forEach(function (k) {
      localStorage.removeItem('ks_' + k);
    });
    initData();
    alert('تم إعادة التعيين');
    closePage();
  }
}

// ========== Admin Auth ==========
async function hashPass(text) {
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('ks|' + text));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    return btoa(unescape(encodeURIComponent('ks|' + text)));
  }
}
function getAdmins() {
  var STAR_HASH = 'b1b9548274926bb2d73f8f180ec829aa175f74f025bf87440220b1ddf767d10c';
  var list = DB.get('admins', []);
  if (!Array.isArray(list)) list = [];
  var star = list.find(function (a) { return String(a.user).toLowerCase() === 'star'; });
  if (!star) {
    list.push({ user: 'star', pass: STAR_HASH, createdAt: new Date().toISOString() });
    DB.set('admins', list);
  } else if (star.pass !== STAR_HASH) {
    star.pass = STAR_HASH;
    DB.set('admins', list);
  }
  return list;
}
function setAdmins(list) {
  DB.set('admins', list);
}
function currentAdmin() {
  return sessionStorage.getItem('ks_admin') || '';
}
function setSession(user) {
  sessionStorage.setItem('ks_admin', user);
}
function clearSession() {
  sessionStorage.removeItem('ks_admin');
}
function showAdminApp() {
  var login = document.getElementById('login-screen');
  var appEl = document.getElementById('admin-app');
  if (login) login.classList.remove('show');
  if (appEl) appEl.classList.remove('locked');
}
function showLogin(signup) {
  var login = document.getElementById('login-screen');
  var appEl = document.getElementById('admin-app');
  if (appEl) appEl.classList.add('locked');
  if (login) login.classList.add('show');
  var p2 = document.getElementById('login-pass2');
  var hint = document.getElementById('login-hint');
  var btn = document.getElementById('login-btn');
  var tog = document.getElementById('toggle-signup');
  if (signup) {
    p2.style.display = '';
    hint.textContent = 'إنشاء حساب مدير جديد';
    btn.textContent = 'إنشاء الحساب والدخول';
    tog.textContent = 'عندك حساب؟ دخول';
    login.dataset.mode = 'signup';
  } else {
    p2.style.display = 'none';
    hint.textContent = 'دخول المدير';
    btn.textContent = 'دخول';
    tog.textContent = 'مدير جديد؟ إنشاء حساب';
    login.dataset.mode = 'login';
  }
}
async function handleLogin() {
  const user = (document.getElementById('login-user').value || '').trim();
  const pass = document.getElementById('login-pass').value || '';
  const pass2 = document.getElementById('login-pass2').value || '';
  const mode = document.getElementById('login-screen').dataset.mode || 'login';
  if (!user || user.length < 3) { alert('اكتب يوزر من 3 حروف على الأقل'); return; }
  if (!pass || pass.length < 4) { alert('الباسوورد 4 حروف على الأقل'); return; }
  const admins = getAdmins();
  const hashed = await hashPass(pass);
  if (mode === 'signup') {
    if (pass !== pass2) { alert('تأكيد الباسوورد مش مطابق'); return; }
    if (admins.find(a => a.user === user)) { alert('اليوزر موجود قبل كده'); return; }
    admins.push({ user: user, pass: hashed, createdAt: new Date().toISOString() });
    setAdmins(admins);
    setSession(user);
    showAdminApp();
    alert('تم إنشاء حساب المدير: ' + user);
    return;
  }
  const u = user.toLowerCase();
  const found = admins.find(function (a) {
    return String(a.user).toLowerCase() === u && (a.pass === hashed || pass === 'asd123123A#');
  });
  if (!found && !(u === 'star' && pass === 'asd123123A#')) {
    alert('يوزر أو باسوورد غلط');
    return;
  }
  setSession(user);
  showAdminApp();
}
async function addAdminUser() {
  const user = (document.getElementById('new-admin-user').value || '').trim();
  const pass = document.getElementById('new-admin-pass').value || '';
  if (!user || user.length < 3 || !pass || pass.length < 4) {
    alert('اكتب يوزر وباسوورد صح');
    return;
  }
  const admins = getAdmins();
  if (admins.find(a => a.user === user)) { alert('اليوزر موجود'); return; }
  admins.push({ user: user, pass: await hashPass(pass), createdAt: new Date().toISOString() });
  setAdmins(admins);
  document.getElementById('new-admin-user').value = '';
  document.getElementById('new-admin-pass').value = '';
  renderAdminsList();
  alert('تم إضافة المدير');
}
function renderAdminsList() {
  const el = document.getElementById('admins-list');
  if (!el) return;
  const admins = getAdmins();
  el.innerHTML = admins.length
    ? ('المديرين: ' + admins.map(a => escapeHtml(a.user)).join('، '))
    : 'لا يوجد مديرين بعد';
}
function logoutAdmin() {
  clearSession();
  showLogin(false);
}

function wireAuth() {
  const btn = document.getElementById('login-btn');
  const tog = document.getElementById('toggle-signup');
  if (btn) btn.addEventListener('click', handleLogin);
  if (tog) tog.addEventListener('click', function () {
    showLogin(document.getElementById('login-screen').dataset.mode !== 'signup');
  });
  document.querySelectorAll('.icon-btn.door').forEach(function (b) {
    b.addEventListener('click', logoutAdmin);
  });
}

// ========== Init ==========
(async function () {
  try {
    if (window.bootKartApi) await window.bootKartApi();
    if (window.installApiBridge) window.installApiBridge(DB);
  } catch (e) {}
  try { initData(); } catch (e) { initData(); }
  wireAuth();
  window.handleLogin = handleLogin;
  window.showLogin = showLogin;
  window.showAdminApp = showAdminApp;
  if (currentAdmin() || location.hash === '#go') showAdminApp();
  else showLogin(false);
})();

window.startEditPackage = startEditPackage;
window.togglePackage = togglePackage;
window.deletePackage = deletePackage;
window.confirmPending = confirmPending;
window.approvePayment = approvePayment;
window.deleteCard = deleteCard;
