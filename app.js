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
          <button class="btn" style="padding:4px 8px;font-size:11px;background:#3498db;color:#fff;margin-left:4px" onclick="togglePackage(${p.id})">${p.active ? 'إيقاف' : 'تفعيل'}</button>
          <button class="btn" style="padding:4px 8px;font-size:11px;background:#e74c3c;color:#fff" onclick="deletePackage(${p.id})">حذف</button>
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
            <thead><tr><th>الباقة</th><th>المبلغ</th><th>الرقم</th><th>الوقت</th></tr></thead>
            <tbody>
              ${pending.map(p => `
                <tr>
                  <td>${escapeHtml(p.packageName)}</td>
                  <td>${p.price} ج</td>
                  <td dir="ltr">${escapeHtml(p.phone)}</td>
                  <td style="font-size:11px">${new Date(p.createdAt).toLocaleString('ar-EG')}</td>
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
        جسر الرسائل لسه هيتضاف (تطبيق أندرويد يقرأ SMS التحويل).
      </p>
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
        <input type="tel" id="set-phone" value="${escapeHtml(settings.phone || '773779585')}" dir="ltr" />
      </div>
      <div class="form-group">
        <label>رابط جسر الرسائل (API)</label>
        <input type="text" id="set-bridge" value="${escapeHtml(settings.bridgeUrl || '')}" placeholder="https://your-server.
