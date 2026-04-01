/* ══════════════════════════════════════════
   AURA FOODS — app.js
   ══════════════════════════════════════════ */

'use strict';

/* ──────────────────────────────────────────
   LOGO
   Applica LOGO_PATH (definito in index.html)
   a tutti gli elementi <img> della navbar.
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

  // reset del form manuale ogni volta che viene aperto
  if (screenId === 'screen-manual') {
    ['prod-name', 'prod-qty', 'prod-date'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
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
   Multi-utente: ogni email ha il proprio
   record in aura_users. La sessione attiva
   è salvata in aura_session.
   ────────────────────────────────────────── */
function getAllUsers() {
  try { return JSON.parse(localStorage.getItem('aura_users') || '{}'); }
  catch { return {}; }
}
function saveAllUsers(users) {
  localStorage.setItem('aura_users', JSON.stringify(users));
}

function getSession()        { return localStorage.getItem('aura_session') || null; }
function setSession(email)   { localStorage.setItem('aura_session', email); }
function clearSession()      { localStorage.removeItem('aura_session'); }

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

function getProducts() { return getCurrentUser()?.products || []; }
function saveProducts(arr) { saveCurrentUser({ products: arr }); }

function getCoins()    { return getCurrentUser()?.coins || 0; }
function addCoins(n)   { saveCurrentUser({ coins: getCoins() + n }); updateCoinsDisplay(); }

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
  if (!users[email])                   { showToast('Account non trovato ❌'); return; }
  if (users[email].password !== pass)  { showToast('Password errata ❌');     return; }

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
   SCAN (simulato)
   ────────────────────────────────────────── */
function simulateScan() {
  const fake = [
    { name: 'Cracker Mulino',   qty: '2', type: 'preferibilmente', date: '15/06/26' },
    { name: 'Latte Intero',     qty: '1', type: 'consumarsi',       date: '14/04/26' },
    { name: 'Yogurt Greco',     qty: '3', type: 'consumarsi',       date: '21/04/26' },
    { name: 'Prosciutto Cotto', qty: '1', type: 'consumarsi',       date: '30/04/26' },
  ];
  const p = fake[Math.floor(Math.random() * fake.length)];
  mergeOrAddProduct(p.name, p.qty, p.type, formatDate(p.date), true);
  setTimeout(() => goTo('screen-success'), 600);
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

  mergeOrAddProduct(name, qty, type, formatDate(dateR), true);
  goTo('screen-success');
}

/**
 * Se esiste già un prodotto con stesso nome + stessa data,
 * incrementa la quantità; altrimenti crea una nuova entry.
 */
function mergeOrAddProduct(name, qty, type, date, giveCoins) {
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
    products.push({ id: Date.now(), name, qty: String(qtyNum), type, date, emoji: getEmoji(name) });
    saveProducts(products);
    showToast(name + ' aggiunto! +5 🪙');
  }

  if (giveCoins) addCoins(5);
}

/* ──────────────────────────────────────────
   DATE HELPERS
   ────────────────────────────────────────── */

/** Normalizza GG/MM/AA → GG/MM/AAAA */
function formatDate(raw) {
  const parts = raw.replace(/[.\-]/g, '/').split('/');
  if (parts.length !== 3) return raw;
  let [d, m, y] = parts;
  d = d.padStart(2, '0');
  m = m.padStart(2, '0');
  if (y.length === 2) y = '20' + y;
  return `${d}/${m}/${y}`;
}

/** Converte GG/MM/AAAA → Date */
function parseDate(s) {
  const p = (s || '').split('/');
  if (p.length !== 3) return null;
  let [d, m, y] = p;
  if (y.length === 2) y = '20' + y;
  return new Date(+y, +m - 1, +d);
}

/** true se mancano ≤ 3 giorni alla scadenza */
function isExpiringSoon(s) {
  const d = parseDate(s);
  if (!d) return false;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return (d - now) / 86400000 <= 3;
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

  // ordina per data di scadenza crescente
  products = [...products].sort((a, b) => {
    const da = parseDate(a.date) || new Date(8640000000000000);
    const db = parseDate(b.date) || new Date(8640000000000000);
    return da - db;
  });

  c.innerHTML = products.map(p => {
    const exp = isExpiringSoon(p.date);
    return `
      <div class="product-card" onclick="openDetail(${p.id})">
        <div class="product-emoji">${p.emoji || '🥑'}</div>
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

function openDetail(id) {
  const p = getProducts().find(x => x.id === id);
  if (!p) return;
  currentProductId = id;

  document.getElementById('detail-product-name').textContent = p.name;
  document.getElementById('detail-emoji').textContent        = p.emoji || '🥑';

  const label = p.type === 'preferibilmente' ? 'Preferibilmente entro:' : 'Da consumarsi entro:';
  const exp   = isExpiringSoon(p.date);
  const safe  = p.type === 'preferibilmente';

  document.getElementById('detail-info').innerHTML = `
    <p>Quantità: ${p.qty}</p>
    <p>${label}</p>
    <p class="${exp ? 'd-expiry' : ''}">${p.date}${exp ? ' ⚠️' : ''}</p>
    ${safe ? '<p class="d-safe">✅ Sicuri per: altri due mesi</p>' : ''}`;

  goTo('screen-detail');
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
    av.style.cssText    = `background-image:url(${u.avatar});background-size:cover;background-position:center;font-size:0`;
    av.textContent      = '';
  } else {
    av.style.cssText    = '';
    av.textContent      = '🧑';
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

  // gestisce cambio email
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

/* ──────────────────────────────────────────
   DATE AUTO-FORMAT (input GG/MM/AA)
   ────────────────────────────────────────── */
document.getElementById('prod-date').addEventListener('input', function () {
  let v = this.value.replace(/\D/g, '');
  if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2);
  if (v.length > 5) v = v.slice(0, 5) + '/' + v.slice(5);
  this.value = v.slice(0, 8);
});
/* ──────────────────────────────────────────
   PARTICELLE CIBO — sfondo home
   ────────────────────────────────────────── */
const FOOD_PARTICLES = ['🥑','🍓','🧀','🥕','🍋','🍌','🍇','🥦','🍅','🫐'];

function spawnParticles() {
  const orbs = document.querySelector('.home-bg-orbs');
  if (!orbs) return;
  // rimuove le vecchie
  orbs.querySelectorAll('.food-particle').forEach(el => el.remove());

  FOOD_PARTICLES.forEach((emoji, i) => {
    const el = document.createElement('span');
    el.className = 'food-particle';
    el.textContent = emoji;
    el.style.left            = (8 + Math.random() * 84) + '%';
    el.style.bottom          = '-30px';
    el.style.animationDelay  = (i * 0.55) + 's';
    el.style.animationDuration = (5 + Math.random() * 3) + 's';
    el.style.fontSize        = (16 + Math.random() * 14) + 'px';
    orbs.appendChild(el);
  });
}
/* ──────────────────────────────────────────
   INIT — controlla la sessione all'avvio
   ────────────────────────────────────────── */
(function init() {
  const email = getSession();
  if (email) {
    const users = getAllUsers();
    if (users[email]) {
      goTo('screen-home');   // sessione valida → home
    } else {
      clearSession();        // sessione orfana → pulisce
    }
  }
  // altrimenti rimane sulla schermata di auth (default)
})();
