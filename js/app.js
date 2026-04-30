/* ══════════════════════════════════════════
   AURA FOODS — app.js
   ══════════════════════════════════════════ */

'use strict';

/* ──────────────────────────────────────────
   LOGO
   ────────────────────────────────────────── */
(function applyLogos() {
  const ids = [
    'auth-logo',
    'home-logo',
    'nav-logo-add',
    'nav-logo-success',
    'nav-logo-shelf',
    'nav-logo-detail',
  ];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.src = LOGO_PATH;
  });
})();

/* ──────────────────────────────────────────
   NAVIGATION
   ────────────────────────────────────────── */
function goTo(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(screenId);
  if (target) target.classList.add('active');
  window.scrollTo(0, 0);

  if (screenId === 'screen-shelf')   renderShelf();
  if (screenId === 'screen-profile') loadProfile();

  if (screenId === 'screen-manual') {
    const nameGroup = document.getElementById('prod-name')?.closest('.form-group');
    if (nameGroup) nameGroup.style.display = '';
    ['prod-name', 'prod-qty', 'prod-date'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    // NUOVO: rimuovi preview residuo ogni volta che si entra in screen-manual
    const old = document.getElementById('scan-product-preview');
    if (old) old.remove();
    pendingProductImage = null;  // resetta anche l'immagine pendente
  }
}

/* ──────────────────────────────────────────
   EMOJI MAP
   ────────────────────────────────────────── */
const emojiMap = {
  crackers:'🍘', cracker:'🍘', biscotti:'🍪', biscotto:'🍪',
  latte:'🥛', pane:'🍞', pasta:'🍝', riso:'🍚', pizza:'🍕',
  pollo:'🍗', carne:'🥩', pesce:'🐟', salmone:'🐟',
  fragole:'🍓', fragola:'🍓', mela:'🍎', mele:'🍎',
  banana:'🍌', banane:'🍌', uva:'🍇', arancia:'🍊', arance:'🍊',
  limone:'🍋', limoni:'🍋', carota:'🥕', carote:'🥕',
  pomodoro:'🍅', pomodori:'🍅', insalata:'🥗', yogurt:'🍦',
  formaggio:'🧀', uova:'🥚', uovo:'🥚', burro:'🧈',
  succo:'🧃', acqua:'💧', birra:'🍺', vino:'🍷',
  caffè:'☕', caffe:'☕', cioccolato:'🍫', gelato:'🍨',
  torta:'🎂', olio:'🫙', sale:'🧂', zucchero:'🍬',
  tonno:'🐟', prosciutto:'🥓', salame:'🌭', mozzarella:'🧀',
  verdure:'🥬', spinaci:'🥬', mais:'🌽', piselli:'🫛',
  fagioli:'🫘', patate:'🥔', cetrioli:'🥒', peperoni:'🫑',
};

function getEmoji(name) {
  const l = (name || '').toLowerCase();
  for (const [k, e] of Object.entries(emojiMap)) {
    if (l.includes(k)) return e;
  }
  return '🥑';
}

/* ──────────────────────────────────────────
   STORAGE
   ────────────────────────────────────────── */
function getAllUsers() {
  try { return JSON.parse(localStorage.getItem('aura_users') || '{}'); }
  catch { return {}; }
}
function saveAllUsers(users) {
  localStorage.setItem('aura_users', JSON.stringify(users));
}

function getSession()      { return localStorage.getItem('aura_session') || null; }
function setSession(email) { localStorage.setItem('aura_session', email); }
function clearSession()    { localStorage.removeItem('aura_session'); }

function getCurrentUser() {
  const email = getSession();
  if (!email) return null;
  return getAllUsers()[email] || null;
}
function saveCurrentUser(data) {
  const email = getSession();
  if (!email) return;
  const users = getAllUsers();
  users[email] = { ...users[email], ...data };
  saveAllUsers(users);
}

function getProducts()     { return getCurrentUser()?.products || []; }
function saveProducts(arr) { saveCurrentUser({ products: arr }); }

function getCoins()  { return getCurrentUser()?.coins || 0; }
function addCoins(n) { saveCurrentUser({ coins: getCoins() + n }); updateCoinsDisplay(); }

function updateCoinsDisplay() {
  const el = document.getElementById('coins-display');
  if (el) el.textContent = getCoins();
}

/* ──────────────────────────────────────────
   AUTH
   ────────────────────────────────────────── */
function switchAuthTab(tab) {
  const tabs      = document.querySelectorAll('.auth-tab');
  const loginForm = document.getElementById('auth-login-form');
  const regForm   = document.getElementById('auth-register-form');

  if (tab === 'login') {
    tabs[0].classList.add('active');    tabs[1].classList.remove('active');
    loginForm.style.display = 'block'; regForm.style.display = 'none';
  } else {
    tabs[0].classList.remove('active'); tabs[1].classList.add('active');
    loginForm.style.display = 'none';  regForm.style.display = 'block';
  }
}

function doLogin() {
  const email = (document.getElementById('login-email').value || '').trim().toLowerCase();
  const pass  =  document.getElementById('login-pass').value  || '';

  if (!email || !pass) { showToast('Inserisci email e password 🌿'); return; }

  const users = getAllUsers();
  if (!users[email])                  { showToast('Account non trovato ❌'); return; }
  if (users[email].password !== pass) { showToast('Password errata ❌');     return; }

  setSession(email);
  showToast('Bentornato, ' + users[email].name + '! 🥑');
  setTimeout(() => goTo('screen-home'), 400);
}

function doRegister() {
  const name  = (document.getElementById('reg-name').value  || '').trim();
  const email = (document.getElementById('reg-email').value || '').trim().toLowerCase();
  const pass  =  document.getElementById('reg-pass').value  || '';

  if (!name || !email || !pass) { showToast('Compila tutti i campi 🌿'); return; }

  const users = getAllUsers();
  if (users[email]) { showToast('Email già registrata ❌'); return; }

  users[email] = { name, email, password: pass, avatar: null, coins: 0, products: [] };
  saveAllUsers(users);
  showToast('Account creato! Ora accedi 🌿');
  switchAuthTab('login');
}

function logout() {
  if (!confirm("Vuoi uscire dall'account?")) return;
  clearSession();
  location.reload();
}

/* ──────────────────────────────────────────
   SCAN
   ────────────────────────────────────────── */
function simulateScan() {
  openScanner();
}

/* ──────────────────────────────────────────
   ADD PRODUCT (manuale)
   ────────────────────────────────────────── */
function addProduct() {
  const name  = (document.getElementById('prod-name').value || '').trim();
  const qty   = (document.getElementById('prod-qty').value  || '').trim();
  const type  =  document.getElementById('prod-type').value;
  const dateR = (document.getElementById('prod-date').value || '').trim();

  if (!name || !qty || !dateR) { showToast('Compila tutti i campi 🌿'); return; }

  mergeOrAddProduct(name, qty, type, formatDate(dateR), true, pendingProductImage);
  pendingProductImage = null;
  goTo('screen-success');
}

function mergeOrAddProduct(name, qty, type, date, giveCoins, imageUrl) {
  const products = getProducts();
  const qtyNum   = parseFloat(qty) || 1;
  const idx      = products.findIndex(p =>
    p.name.toLowerCase() === name.toLowerCase() && p.date === date
  );

  if (idx > -1) {
    products[idx].qty = String(parseFloat(products[idx].qty || 1) + qtyNum);
    saveProducts(products);
    showToast('Quantità aggiornata! 📈');
  } else {
    products.push({
      id:       Date.now(),
      name,
      qty:      String(qtyNum),
      type,
      date,
      emoji:    getEmoji(name),
      imageUrl: imageUrl || null,
      aiSafety: null,
    });
    saveProducts(products);
    showToast(name + ' aggiunto! +5 🪙');
  }

  if (giveCoins) addCoins(5);
}

/* ──────────────────────────────────────────
   DATE HELPERS
   ────────────────────────────────────────── */
function formatDate(raw) {
  const parts = raw.replace(/[.\-]/g, '/').split('/');
  if (parts.length !== 3) return raw;
  let [d, m, y] = parts;
  d = d.padStart(2, '0');
  m = m.padStart(2, '0');
  if (y.length === 2) y = '20' + y;
  return `${d}/${m}/${y}`;
}

function parseDate(s) {
  const p = (s || '').split('/');
  if (p.length !== 3) return null;
  let [d, m, y] = p;
  if (y.length === 2) y = '20' + y;
  return new Date(+y, +m - 1, +d);
}

function isExpiringSoon(s) {
  const d = parseDate(s);
  if (!d) return false;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return (d - now) / 86400000 <= 3;
}

/* ──────────────────────────────────────────
   AI
   ────────────────────────────────────────── */

async function getAISafety(productName, imageUrl) {
  const contentParts = [];

  if (imageUrl) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((res, rej) => {
        img.onload = res; img.onerror = rej;
        img.src = imageUrl;
      });
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);
      const b64 = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
      contentParts.push({
        type: 'image',
        source: { type: 'base64', media_type: 'image/jpeg', data: b64 }
      });
    } catch (_) {}
  }

  contentParts.push({
    type: 'text',
    text: `Sei un esperto di sicurezza alimentare. Il prodotto è: "${productName}".
Rispondi SOLO con un oggetto JSON (nessun testo extra, nessun markdown) con questa struttura:
{
  "extraDays": <numero intero di giorni consumabile oltre la data "preferibilmente entro">,
  "storage": <"dispensa" | "frigo" | "freezer">,
  "risk": <"low" | "medium" | "high">,
  "tips": "<max 1 frase su come capire se è ancora buono>",
  "matchedName": "<nome prodotto riconosciuto>"
}
Se non riesci a stimare, usa extraDays: 0.`
  });

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [{ role: 'user', content: contentParts }]
    })
  });

  const data   = await response.json();
  const raw    = (data.content?.[0]?.text || '').replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(raw);
  if (!parsed || parsed.extraDays <= 0) return null;
  return parsed;
}
/* ──────────────────────────────────────────
   SHELF
   ────────────────────────────────────────── */
function renderShelf() {
  let products = getProducts();
  const c = document.getElementById('shelf-list');

  if (!products.length) {
    c.innerHTML = '<div class="shelf-empty">Nessun alimento nella tua shelf 📦<br>Aggiungi qualcosa! 🥑</div>';
    return;
  }

  products = [...products].sort((a, b) => {
    const da = parseDate(a.date) || new Date(8640000000000000);
    const db = parseDate(b.date) || new Date(8640000000000000);
    return da - db;
  });

  c.innerHTML = products.map(p => {
    const exp   = isExpiringSoon(p.date);
    const thumb = p.imageUrl
      ? `<img src="${p.imageUrl}" alt="${p.name}" style="width:46px;height:46px;border-radius:12px;object-fit:cover;">`
      : p.emoji || '🥑';
    return `
      <div class="product-card" onclick="openDetail(${p.id})">
        <div class="product-emoji">${thumb}</div>
        <div class="product-info">
          <div class="product-name">${p.name}</div>
          <div class="product-qty">Quantità: ${p.qty}</div>
          <div class="product-date${exp ? ' expiring' : ''}">
            Scade il: ${p.date}${exp ? ' ⚠️' : ''}
          </div>
        </div>
        <span style="color:var(--text-mid);font-size:22px">›</span>
      </div>`;
  }).join('');
}

/* ──────────────────────────────────────────
   DETAIL
   ────────────────────────────────────────── */
let currentProductId = null;

async function openDetail(id) {
  const p = getProducts().find(x => x.id === id);
  if (!p) return;
  currentProductId = id;

  document.getElementById('detail-product-name').textContent = p.name;

  const emojiEl = document.getElementById('detail-emoji');
  if (p.imageUrl) {
    emojiEl.innerHTML = `<img src="${p.imageUrl}" alt="${p.name}" style="width:56px;height:56px;border-radius:14px;object-fit:cover;">`;
  } else {
    emojiEl.textContent = p.emoji || '🥑';
  }

  const label = p.type === 'preferibilmente' ? 'Preferibilmente entro:' : 'Da consumarsi entro:';
  const exp   = isExpiringSoon(p.date);

  let safetyBlock = '';
  if (p.type === 'preferibilmente') {
    if (p.aiSafety) {
      safetyBlock = buildSafetyBlock(p.aiSafety, p.date);
    } else {
      safetyBlock = `
        <div id="ai-safety-block" class="ai-safety-block ai-loading">
          <span class="ai-spinner"></span>
          <span style="font-size:13px;color:var(--text-mid);">Analisi AI in corso…</span>
        </div>`;
    }
  }

  document.getElementById('detail-info').innerHTML = `
    <p>Quantità: ${p.qty}</p>
    <p>${label}</p>
    <p class="${exp ? 'd-expiry' : ''}">${p.date}${exp ? ' ⚠️' : ''}</p>
    ${safetyBlock}`;

  goTo('screen-detail');

  if (p.type === 'preferibilmente' && !p.aiSafety) {
    const result = await getAISafety(p.name, p.imageUrl);
    const block  = document.getElementById('ai-safety-block');

    if (result) {
      const products = getProducts();
      const idx = products.findIndex(x => x.id === id);
      if (idx > -1) { products[idx].aiSafety = result; saveProducts(products); }
      if (block) block.outerHTML = buildSafetyBlock(result, p.date);
    } else {
      if (block) block.outerHTML = `<div class="ai-safety-block ai-error">⚠️ Analisi non disponibile per questo prodotto</div>`;
    }
  }
}

function buildSafetyBlock(safety, expiryDate) {
  let safeUntil = '—';
  if (expiryDate && safety.extraDays) {
    const base = parseDate(expiryDate);
    if (base) {
      base.setDate(base.getDate() + safety.extraDays);
      safeUntil = base.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
  }

  const riskColor = { low: '#27ae60', medium: '#e67e22', high: '#c0392b' };
  const riskLabel = { low: 'Basso rischio', medium: 'Rischio medio', high: 'Alto rischio' };
  const riskEmoji = { low: '✅', medium: '⚠️', high: '🚫' };
  const color     = riskColor[safety.risk] || '#2d8653';
  const label     = riskLabel[safety.risk] || '';
  const emoji     = riskEmoji[safety.risk] || '📋';
  const src       = safety.matchedName ? `AI · ${safety.matchedName}` : 'Stima AI';

  return `
    <div class="ai-safety-block" style="border-left:3px solid ${color};">
      <div class="ai-safety-header">
        <span style="font-size:14px;">🤖 Analisi AI</span>
        <span class="ai-risk-badge" style="background:${color};">${emoji} ${label}</span>
      </div>
      <div class="ai-safety-safe">
        Consumabile indicativamente fino al: <strong>${safeUntil}</strong>
        (+${safety.extraDays} giorni in ${safety.storage})
      </div>
      ${safety.tips ? `<div class="ai-safety-tips">${safety.tips}</div>` : ''}
      <div class="ai-disclaimer">
        ⚠️ <em>Verifica sempre aspetto, odore e consistenza prima di consumarlo.
        Stima indicativa — Fonte: ${src}.</em>
      </div>
    </div>`;
}

function removeOne() {
  const products = getProducts();
  const i        = products.findIndex(x => x.id === currentProductId);
  if (i === -1) return;

  const q = parseFloat(products[i].qty);
  if (!isNaN(q) && q > 1) {
    products[i].qty = String(q - 1);
    saveProducts(products);
    showToast('Quantità: ' + (q - 1));
    openDetail(currentProductId);
  } else {
    products.splice(i, 1);
    saveProducts(products);
    showToast('Prodotto rimosso ✓');
    goTo('screen-shelf');
  }
}

function removeAll() {
  saveProducts(getProducts().filter(x => x.id !== currentProductId));
  showToast('Prodotto rimosso ✓');
  goTo('screen-shelf');
}

/* ──────────────────────────────────────────
   PROFILE
   ────────────────────────────────────────── */
function loadProfile() {
  updateCoinsDisplay();
  const u = getCurrentUser();
  if (!u) return;

  document.getElementById('profile-name-display').textContent  = u.name  || 'Utente';
  document.getElementById('profile-email-display').textContent = u.email || 'email@esempio.com';
  document.getElementById('edit-name').value  = u.name  || '';
  document.getElementById('edit-email').value = u.email || '';
  document.getElementById('edit-pass').value  = '';

  const av = document.getElementById('avatar-display');
  if (u.avatar) {
    av.style.cssText = `background-image:url(${u.avatar});background-size:cover;background-position:center;font-size:0`;
    av.textContent   = '';
  } else {
    av.style.cssText = '';
    av.textContent   = '🧑';
  }
}

function saveProfile() {
  const n  = (document.getElementById('edit-name').value  || '').trim();
  const e  = (document.getElementById('edit-email').value || '').trim().toLowerCase();
  const pw =  document.getElementById('edit-pass').value  || '';

  if (!n || !e) { showToast('Nome e email obbligatori'); return; }

  const users    = getAllUsers();
  const oldEmail = getSession();
  if (!users[oldEmail]) { showToast('Sessione non valida'); return; }

  const updatedUser = { ...users[oldEmail], name: n, email: e };
  if (pw) updatedUser.password = pw;

  if (oldEmail !== e) {
    if (users[e]) { showToast('Email già in uso ❌'); return; }
    delete users[oldEmail];
    users[e] = updatedUser;
    saveAllUsers(users);
    setSession(e);
  } else {
    users[e] = updatedUser;
    saveAllUsers(users);
  }

  document.getElementById('profile-name-display').textContent  = n;
  document.getElementById('profile-email-display').textContent = e;
  document.getElementById('edit-pass').value = '';
  showToast('Profilo aggiornato ✓ 🌿');
}

function handleAvatar(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (ev) {
    saveCurrentUser({ avatar: ev.target.result });
    loadProfile();
    showToast('Foto profilo aggiornata! 📸');
  };
  reader.readAsDataURL(file);
}

/* ──────────────────────────────────────────
   TOAST
   ────────────────────────────────────────── */
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), 2600);
}

document.getElementById('qr-date').addEventListener('input', function () {
  let v = this.value.replace(/\D/g, '');
  if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2);
  if (v.length > 5) v = v.slice(0, 5) + '/' + v.slice(5);
  this.value = v.slice(0, 8);
});

/* ──────────────────────────────────────────
   DATE AUTO-FORMAT
   ────────────────────────────────────────── */
document.getElementById('prod-date').addEventListener('input', function () {
  let v = this.value.replace(/\D/g, '');
  if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2);
  if (v.length > 5) v = v.slice(0, 5) + '/' + v.slice(5);
  this.value = v.slice(0, 8);
});

/* ──────────────────────────────────────────
   PARTICELLE CIBO
   ────────────────────────────────────────── */
const FOOD_PARTICLES = ['🥑','🍓','🧀','🥕','🍋','🍌','🍇','🥦','🍅','🫐'];

function spawnParticles() {
  const orbs = document.querySelector('.home-bg-orbs');
  if (!orbs) return;
  orbs.querySelectorAll('.food-particle').forEach(el => el.remove());
  FOOD_PARTICLES.forEach((emoji, i) => {
    const el = document.createElement('span');
    el.className = 'food-particle';
    el.textContent = emoji;
    el.style.left             = (8 + Math.random() * 84) + '%';
    el.style.bottom           = '-30px';
    el.style.animationDelay   = (i * 0.55) + 's';
    el.style.animationDuration = (5 + Math.random() * 3) + 's';
    el.style.fontSize         = (16 + Math.random() * 14) + 'px';
    orbs.appendChild(el);
  });
}

/* ──────────────────────────────────────────
   SCANNER REALE
   ────────────────────────────────────────── */
let html5QrCode         = null;
let scannerBusy         = false;
let pendingProductImage = null;

function openScanner() {
  scannerBusy         = false;
  pendingProductImage = null;
  document.getElementById('scanner-modal').classList.add('open');
  setStatus('', '');
  document.getElementById('scanner-container').innerHTML = '';

  html5QrCode = new Html5Qrcode('scanner-container');

  const config = {
    fps: 30,
    qrbox: { width: 280, height: 160 },
    aspectRatio: 1.7778,
    experimentalFeatures: {
      useBarCodeDetectorIfSupported: true
    },
    formatsToSupport: [
      Html5QrcodeSupportedFormats.EAN_13,
      Html5QrcodeSupportedFormats.EAN_8,
      Html5QrcodeSupportedFormats.UPC_A,
      Html5QrcodeSupportedFormats.UPC_E,
      Html5QrcodeSupportedFormats.CODE_128,
      Html5QrcodeSupportedFormats.CODE_39,
      Html5QrcodeSupportedFormats.ITF,
    ],
  };

  // Prova prima con fotocamera posteriore, poi frontale come fallback
  html5QrCode.start(
    { facingMode: 'environment' },
    config,
    onBarcodeDetected,
    () => {}
  ).catch(() => {
    // fallback 1: prova senza vincoli facingMode
    html5QrCode.start(
      { facingMode: 'user' },
      config,
      onBarcodeDetected,
      () => {}
    ).catch(() => {
      // fallback 2: nessun vincolo, qualsiasi camera disponibile
      Html5Qrcode.getCameras().then(cameras => {
        if (!cameras || cameras.length === 0) {
          setStatus('Nessuna fotocamera trovata ❌', 'error');
          return;
        }
        html5QrCode.start(
          cameras[0].id,
          config,
          onBarcodeDetected,
          () => {}
        ).catch(() => {
          setStatus('Errore avvio fotocamera ❌', 'error');
        });
      }).catch(() => {
        setStatus('Permesso fotocamera negato ❌', 'error');
      });
    });
  });
}
function closeScanner() {
  const modal   = document.getElementById('scanner-modal');
  const doClose = () => {
    modal.classList.remove('open');
    document.getElementById('scanner-container').innerHTML = '';
    html5QrCode = null;
    scannerBusy = false;
  };

  if (html5QrCode) {
    const running = html5QrCode.getState &&
                    html5QrCode.getState() === Html5QrcodeScannerState.SCANNING;
    if (running) {
      html5QrCode.stop().then(doClose).catch(doClose);
    } else {
      try { html5QrCode.clear(); } catch(_) {}
      doClose();
    }
  } else {
    doClose();
  }
}

async function onBarcodeDetected(barcode) {
  if (scannerBusy) return;
  scannerBusy = true;

  setStatus('Codice: ' + barcode + ' — cerco…', '');

  try { if (html5QrCode) await html5QrCode.stop(); } catch(_) {}

  try {
    const res  = await fetch(
      'https://world.openfoodfacts.org/api/v0/product/' + barcode + '.json'
    );
    const data = await res.json();

    let name     = '';
    let imageUrl = null;

    if (data.status === 1 && data.product) {
      const p     = data.product;
      const brand = (p.brands || '').split(',')[0].trim();
      const pname = p.product_name_it || p.product_name || p.generic_name || '';
      name     = brand && pname ? brand + ' – ' + pname : brand || pname;
      imageUrl = p.image_front_small_url || p.image_url || null;
    }

    if (name) {
      setStatus('✅ ' + name, 'found');
      setTimeout(() => {
        closeScanner();
        setTimeout(() => openQRForm(name, imageUrl), 150);
      }, 1000);
    } else {
      setStatus('Prodotto non trovato, inserisci il nome ✏️', 'error');
      setTimeout(() => {
        closeScanner();
        setTimeout(() => prefillManualForm('', null, false), 150);
      }, 1200);
    }

  } catch(_) {
    setStatus('Errore di rete — inserisci manualmente', 'error');
    setTimeout(() => {
      closeScanner();
      setTimeout(() => prefillManualForm('', null, false), 150);
    }, 1200);
  }
}

/* ──────────────────────────────────────────
   QR PRODUCT FORM
   ────────────────────────────────────────── */
let pendingQRProduct = null;   // { name, imageUrl }

function openQRForm(name, imageUrl) {
  pendingQRProduct = { name, imageUrl };

  // nome prodotto nel preview
  document.getElementById('qr-product-name').textContent = name;

  // immagine o emoji nel preview
  const imgEl = document.getElementById('qr-preview-img');
  if (imageUrl) {
    imgEl.innerHTML = `<img src="${imageUrl}" alt="${name}" style="width:52px;height:52px;border-radius:12px;object-fit:cover;">`;
  } else {
    imgEl.textContent = getEmoji(name);
  }

  // reset campi
  document.getElementById('qr-qty').value  = '';
  document.getElementById('qr-date').value = '';

  goTo('screen-qr');
  setTimeout(() => document.getElementById('qr-qty').focus(), 400);
}

function addProductFromQR() {
  if (!pendingQRProduct) { goTo('screen-add'); return; }

  const qty  = (document.getElementById('qr-qty').value  || '').trim();
  const type =  document.getElementById('qr-type').value;
  const dateR = (document.getElementById('qr-date').value || '').trim();

  if (!qty || !dateR) { showToast('Compila quantità e scadenza 🌿'); return; }

  mergeOrAddProduct(
    pendingQRProduct.name,
    qty,
    type,
    formatDate(dateR),
    true,
    pendingQRProduct.imageUrl
  );

  pendingQRProduct    = null;
  pendingProductImage = null;
  goTo('screen-success');
}

function prefillManualForm(name, imageUrl, nameConfirmed) {
  pendingProductImage = imageUrl || null;

  const nameEl = document.getElementById('prod-name');
  const qtyEl  = document.getElementById('prod-qty');
  const dateEl = document.getElementById('prod-date');

  if (nameEl) nameEl.value = name || '';
  if (qtyEl)  qtyEl.value  = '';
  if (dateEl) dateEl.value  = '';

  // nasconde il campo nome se già confermato dallo scanner
  const nameGroup = nameEl?.closest('.form-group');
  if (nameGroup) nameGroup.style.display = nameConfirmed ? 'none' : '';

  // rimuove eventuale anteprima precedente
  const existingPreview = document.getElementById('scan-product-preview');
  if (existingPreview) existingPreview.remove();

  // mostra anteprima con immagine se disponibile
  if (name && imageUrl) {
    const preview = document.createElement('div');
    preview.id = 'scan-product-preview';
    preview.style.cssText = `
      display:flex; align-items:center; gap:12px;
      background:rgba(255,255,255,0.6); border-radius:16px;
      padding:12px 14px; margin-bottom:4px;
    `;
    preview.innerHTML = `
      <img src="${imageUrl}" alt="${name}"
        style="width:52px;height:52px;border-radius:12px;object-fit:cover;flex-shrink:0;">
      <div>
        <div style="font-family:'Fredoka One',cursive;font-size:15px;color:#0d3320;">${name}</div>
        <div style="font-size:12px;font-weight:700;color:#2d8653;">Prodotto trovato ✅</div>
      </div>
    `;
    const formContent = document.querySelector('.form-content');
    const card = formContent?.querySelector('.card');
    if (card) formContent.insertBefore(preview, card);
  }

  goTo('screen-manual');
  setTimeout(() => { if (qtyEl) qtyEl.focus(); }, 400);
}

function setStatus(msg, type) {
  const el = document.getElementById('scanner-status');
  if (!el) return;
  el.textContent = msg;
  el.className   = 'scanner-status' + (type ? ' ' + type : '');
}

/* ──────────────────────────────────────────
   INIT
   ────────────────────────────────────────── */
(function init() {
  const email = getSession();
  if (email) {
    const users = getAllUsers();
    if (users[email]) {
      goTo('screen-home');
    } else {
      clearSession();
    }
  }
})();
