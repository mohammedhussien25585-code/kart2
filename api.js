(function () {
  window.API_BASE = window.API_BASE || '';
  window.SYNC_URL = window.SYNC_URL || 'https://crudcrud.com/api/7e7865581b384674bf94dd5a265d2c8c/kart/6a9ee52bf54b5003e8435913';

  async function probe() {
    var bases = [];
    if (window.API_BASE) bases.push(window.API_BASE.replace(/\/$/, ''));
    bases.push('');
    bases.push(location.origin);
    for (var i = 0; i < bases.length; i++) {
      var base = bases[i];
      try {
        var r = await fetch(base + '/api/health');
        if (r.ok) {
          window.API_BASE = base;
          window.USE_API = true;
          return true;
        }
      } catch (e) {}
    }
    window.USE_API = false;
    return false;
  }

  async function pullState() {
    if (!window.USE_API) return;
    const r = await fetch(window.API_BASE + '/api/state');
    const data = await r.json();
    ['packages', 'cards', 'sales', 'customers', 'wallets', 'messages', 'pending', 'offers', 'pos'].forEach(function (k) {
      if (data[k]) localStorage.setItem('ks_' + k, JSON.stringify(data[k]));
    });
    if (data.settings) localStorage.setItem('ks_settings', JSON.stringify(data.settings));
    localStorage.setItem('ks_initialized', '1');
  }

  function readLs(key, def) {
    try { var v = JSON.parse(localStorage.getItem(key)); return v == null ? def : v; } catch (e) { return def; }
  }

  function collectCloud() {
    var mycards = {};
    Object.keys(localStorage).forEach(function (k) {
      if (k.indexOf('ks_mycards_') === 0) {
        mycards[k.replace('ks_mycards_', '')] = readLs(k, []);
      }
    });
    return {
      pending: readLs('ks_pending', []),
      sales: readLs('ks_sales', []),
      customers: readLs('ks_customers', []),
      messages: readLs('ks_messages', []),
      cards: readLs('ks_cards', []),
      packages: readLs('ks_packages', []),
      offers: readLs('ks_offers', []),
      wallets: readLs('ks_wallets', []),
      cusers: readLs('ks_cusers', []),
      mycards: mycards,
      updated: Date.now()
    };
  }

  function applyCloud(data) {
    if (!data || typeof data !== 'object') return;
    ['pending', 'sales', 'customers', 'messages', 'cards', 'packages', 'wallets', 'offers'].forEach(function (k) {
      if (data[k]) localStorage.setItem('ks_' + k, JSON.stringify(data[k]));
    });
    if (data.cusers) localStorage.setItem('ks_cusers', JSON.stringify(data.cusers));
    if (data.mycards) {
      Object.keys(data.mycards).forEach(function (phone) {
        localStorage.setItem('ks_mycards_' + phone, JSON.stringify(data.mycards[phone] || []));
      });
    }
  }

  async function pullCloud() {
    if (!window.SYNC_URL) return false;
    try {
      var r = await fetch(window.SYNC_URL);
      if (!r.ok) return false;
      var data = await r.json();
      applyCloud(data);
      return true;
    } catch (e) { return false; }
  }

  async function pushCloud() {
    if (!window.SYNC_URL) return;
    try {
      var body = collectCloud();
      await fetch(window.SYNC_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    } catch (e) {}
  }

  window.installApiBridge = function (DB) {
    if (!DB) return;
    const oldSet = DB.set.bind(DB);
    DB.set = function (key, val) {
      oldSet(key, val);
      if (window.USE_API && window.API_BASE) {
        fetch(window.API_BASE + '/api/state/' + key, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(val)
        }).catch(function () {});
      }
      pushCloud();
    };
  };

  window.bootKartApi = async function () {
    const ok = await probe();
    if (ok) {
      try { await pullState(); } catch (e) {}
    }
    await pullCloud();
    setInterval(pullCloud, 4000);
    return ok;
  };

  window.pushCloud = pushCloud;
  window.pullCloud = pullCloud;
})();
