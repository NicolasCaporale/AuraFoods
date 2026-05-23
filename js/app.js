/* ══════════════════════════════════════════
   AURA FOODS — app.js  (Performance Edition)
   ══════════════════════════════════════════ */
'use strict';

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ── LOGO ── */
(function applyLogos() {
  const ids = ['auth-logo'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.src = LOGO_PATH;
  });
})();

/* ── SESSION + PRODUCT CACHE ── */
let _currentUser   = null;
let _productsCache = null;

async function ensureCurrentUser() {
  if (_currentUser) return _currentUser;
  const { data: { user } } = await _supabase.auth.getUser();
  if (!user) return null;
  const { data } = await _supabase.from('users').select('*').eq('id', user.id).single();
  _currentUser = data;
  return data;
}

function hideSplash() {
  const splash = document.getElementById('splash');
  if (!splash) return;
  splash.classList.add('hide');
  setTimeout(() => splash.remove(), 400);
}

/* ── NAVIGATION ── */
function goTo(screenId) {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active', 'screen-enter');
  });
  const target = document.getElementById(screenId);
  if (target) {
    target.classList.add('active');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        target.classList.add('screen-enter');
      });
    });
  }
  window.scrollTo(0, 0);

  if (screenId === 'screen-home')    renderHome();
  if (screenId === 'screen-shelf')   renderShelf();
  if (screenId === 'screen-profile') { loadProfile(); updateNotifUI(); }
  if (screenId === 'screen-qr') { _isAddingProduct = false; }
  if (screenId === 'screen-manual') {
    _isAddingProduct = false;
    const nameGroup = document.getElementById('prod-name')?.closest('.form-group');
    if (nameGroup) nameGroup.style.display = '';
    ['prod-name','prod-qty'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    // Reset date pills
    ['prod-date-d','prod-date-m','prod-date-y'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const old = document.getElementById('scan-product-preview');
    if (old) old.remove();
    pendingProductImage = null;
  }
}

/* ── EMOJI MAP ── */
const emojiMap = {
  crackers:'🍘',cracker:'🍘',biscotti:'🍪',biscotto:'🍪',
  latte:'🥛',pane:'🍞',pasta:'🍝',riso:'🍚',pizza:'🍕',
  pollo:'🍗',carne:'🥩',pesce:'🐟',salmone:'🐟',
  fragole:'🍓',fragola:'🍓',mela:'🍎',mele:'🍎',
  banana:'🍌',banane:'🍌',uva:'🍇',arancia:'🍊',arance:'🍊',
  limone:'🍋',limoni:'🍋',carota:'🥕',carote:'🥕',
  pomodoro:'🍅',pomodori:'🍅',insalata:'🥗',yogurt:'🍦',
  formaggio:'🧀',uova:'🥚',uovo:'🥚',burro:'🧈',
  succo:'🧃',acqua:'💧',birra:'🍺',vino:'🍷',
  caffè:'☕',caffe:'☕',cioccolato:'🍫',gelato:'🍨',
  torta:'🎂',olio:'🫙',sale:'🧂',zucchero:'🍬',
  tonno:'🐟',prosciutto:'🥓',salame:'🌭',mozzarella:'🧀',
  verdure:'🥬',spinaci:'🥬',mais:'🌽',piselli:'🫛',
  fagioli:'🫘',patate:'🥔',cetrioli:'🥒',peperoni:'🫑',
};
function getEmoji(name) {
  const l = (name || '').toLowerCase();
  for (const [k, e] of Object.entries(emojiMap)) {
    if (l.includes(k)) return e;
  }
  return '🥑';
}

/* ── AUTH ── */
function switchAuthTab(tab) {
  const tabs      = document.querySelectorAll('.auth-tab');
  const loginForm = document.getElementById('auth-login-form');
  const regForm   = document.getElementById('auth-register-form');
  if (tab === 'login') {
    tabs[0].classList.add('active');    tabs[1].classList.remove('active');
    loginForm.classList.add('active');  regForm.classList.remove('active');
  } else {
    tabs[0].classList.remove('active'); tabs[1].classList.add('active');
    loginForm.classList.remove('active'); regForm.classList.add('active');
  }
}

async function doLogin() {
  const email = (document.getElementById('login-email').value || '').trim().toLowerCase();
  const pass  =  document.getElementById('login-pass').value  || '';
  if (!email || !pass) { showToast('Inserisci email e password 🌿'); return; }

  const { data, error } = await _supabase.auth.signInWithPassword({ email, password: pass });
  if (error) {
    if (error.message.includes('Email not confirmed')) {
      showToast('Conferma prima la tua email 📧');
    } else if (error.message.includes('Invalid login')) {
      showToast('Email o password errati ❌');
    } else {
      showToast('Errore di accesso ❌');
    }
    return;
  }
  if (!data.user) { showToast('Account non trovato ❌'); return; }

  const { data: profile } = await _supabase.from('users').select('*').eq('id', data.user.id).single();
  _currentUser = profile;
  await initNotifications(_supabase, data.user.id);
  showToast('Bentornato, ' + profile.name + '! 🥑');
  setTimeout(() => goTo('screen-home'), 400);
}

async function doRegister() {
  const name  = (document.getElementById('reg-name').value  || '').trim();
  const email = (document.getElementById('reg-email').value || '').trim().toLowerCase();
  const pass  =  document.getElementById('reg-pass').value  || '';
  if (!name || !email || !pass) { showToast('Compila tutti i campi 🌿'); return; }
  if (pass.length < 6) { showToast('Password di almeno 6 caratteri 🔐'); return; }

  const { data, error } = await _supabase.auth.signUp({
    email,
    password: pass,
    options: {
      data: { name },
      emailRedirectTo: 'https://aura-foods.it/conferma-email'
    }
  });

  if (error) { showToast('Email già registrata ❌'); console.error(error); return; }

  showToast('Controlla la tua email per confermare l\'account 📧');
  switchAuthTab('login');
}

async function logout() {
  if (!confirm("Vuoi uscire dall'account?")) return;
  try {
    const { data: { user } } = await _supabase.auth.getUser();
    if (user) await removeNotifications(_supabase, user.id);
  } catch(e) {
    console.warn('removeNotifications error:', e);
  }
  await _supabase.auth.signOut();
  _currentUser   = null;
  _productsCache = null;
  location.reload();
}

/* ── COINS ── */
async function getCoins() {
  const u = await ensureCurrentUser();
  return u?.coins || 0;
}

async function addCoins(n) {
  await _supabase.rpc('give_product_coins');
  if (_currentUser) {
    _currentUser.coins = (_currentUser.coins || 0) + n;
    updateCoinsDisplay();
  }
}

function updateCoinsDisplay() {
  const el = document.getElementById('coins-display');
  if (el) el.textContent = _currentUser?.coins ?? 0;
}

/* ── PRODUCTS (con cache in-memory) ── */
async function getProducts(forceRefresh = false) {
  const u = await ensureCurrentUser();
  if (!u) return [];

  if (!forceRefresh && _productsCache?.userId === u.id && _productsCache.items) {
    return _productsCache.items;
  }

  const { data } = await _supabase
    .from('products')
    .select('*')
    .eq('user_id', u.id)
    .order('created_at', { ascending: true });

  _productsCache = { userId: u.id, items: data || [] };
  return _productsCache.items;
}

function invalidateCache() {
  if (_productsCache) _productsCache.items = null;
}

/* ── DATE HELPERS ── */
function getProdDate() {
  const d = (document.getElementById('prod-date-d')?.value || '').trim();
  const m = (document.getElementById('prod-date-m')?.value || '').trim();
  const y = (document.getElementById('prod-date-y')?.value || '').trim();
  return d && m && y ? `${d}/${m}/${y}` : '';
}

function getQrDate() {
  const d = (document.getElementById('qr-date-d')?.value || '').trim();
  const m = (document.getElementById('qr-date-m')?.value || '').trim();
  const y = (document.getElementById('qr-date-y')?.value || '').trim();
  return d && m && y ? `${d}/${m}/${y}` : '';
}

function formatDate(raw) {
  const parts = raw.replace(/[.\-]/g, '/').split('/');
  if (parts.length !== 3) return raw;
  let [d, m, y] = parts;
  d = d.padStart(2,'0'); m = m.padStart(2,'0');
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
  const now = new Date(); now.setHours(0,0,0,0);
  return (d - now) / 86400000 <= 3;
}

/* ── AUTO-ADVANCE DATE PILLS ── */
['prod', 'qr'].forEach(prefix => {
  ['d', 'm'].forEach((part, idx) => {
    const parts = ['d', 'm', 'y'];
    const el = document.getElementById(`${prefix}-date-${part}`);
    if (!el) return;
    el.addEventListener('input', () => {
      if (el.value.length >= el.maxLength) {
        const next = document.getElementById(`${prefix}-date-${parts[idx + 1]}`);
        if (next) next.focus();
      }
    });
  });
});

/* ── ADD PRODUCT ── */
function simulateScan() { openScanner(); }

let _isAddingProduct = false;

async function addProduct() {
  if (_isAddingProduct) return;
  _isAddingProduct = true;

  try {
    const name  = (document.getElementById('prod-name').value || '').trim();
    const qty   = (document.getElementById('prod-qty').value  || '').trim();
    const type  =  document.getElementById('prod-type').value;
    const unit  =  document.getElementById('prod-unit')?.value || '';
    const dateR = getProdDate();

    if (!name || !qty || !dateR) { showToast('Compila tutti i campi 🌿'); _isAddingProduct = false; return; }

    await mergeOrAddProduct(name, qty, unit, type, formatDate(dateR), true, pendingProductImage);
    pendingProductImage = null;
    goTo('screen-success');
  } catch(e) {
    console.error('Errore addProduct:', e);
    showToast('Errore: ' + e.message);
    _isAddingProduct = false;
  }
}

async function mergeOrAddProduct(name, qty, unit, type, date, giveCoins, imageUrl) {
  const u = await ensureCurrentUser();
  if (!u) return;
  const qtyNum = parseFloat(qty) || 1;

  const { data: existingArr } = await _supabase
    .from('products')
    .select('*')
    .eq('user_id', u.id)
    .ilike('name', name)
    .eq('date', date);

  const existing = existingArr && existingArr.length > 0 ? existingArr[0] : null;

  if (existing) {
    const newQty = String(parseFloat(existing.qty || 1) + qtyNum);
    await _supabase.from('products').update({ qty: newQty }).eq('id', existing.id);
    showToast('Quantità aggiornata! 📈');
  } else {
    await _supabase.from('products').insert({
      user_id: u.id, name,
      qty: String(qtyNum),
      unit: unit || null,
      type, date,
      emoji: getEmoji(name),
      image_url: imageUrl || null,
      ai_safety: null,
    });
    showToast(name + ' aggiunto! +5 🪙');
  }

  invalidateCache();
  if (giveCoins) await addCoins(5);
}

/* ── AI SAFETY ── */
async function getAISafety(productName, imageUrl) {
  const contentParts = [];
  if (imageUrl) {
    try {
      const img = new Image(); img.crossOrigin = 'anonymous';
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = imageUrl; });
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);
      const b64 = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
      contentParts.push({ type:'image', source:{ type:'base64', media_type:'image/jpeg', data:b64 } });
    } catch (_) {}
  }
  contentParts.push({
    type:'text',
    text:`Sei un esperto di sicurezza alimentare. Il prodotto è: "${productName}".
Rispondi SOLO con un oggetto JSON (nessun testo extra, nessun markdown) con questa struttura:
{"extraDays":<intero>,"storage":"dispensa"|"frigo"|"freezer","risk":"low"|"medium"|"high","tips":"<max 1 frase>","matchedName":"<nome>"}
Se non riesci a stimare, usa extraDays: 0.`
  });
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method:'POST',
    headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:300, messages:[{ role:'user', content:contentParts }] })
  });
  const data = await response.json();
  const raw = (data.content?.[0]?.text || '').replace(/```json|```/g,'').trim();
  const parsed = JSON.parse(raw);
  if (!parsed || parsed.extraDays <= 0) return null;
  return parsed;
}

/* ── HOME RENDER ── */
async function renderHome() {
  const u = await ensureCurrentUser();
  if (!u) return;

  const h = new Date().getHours();
  const greetEl = document.getElementById('home-greeting-time');
  if (greetEl) {
    if      (h >= 5  && h < 12) greetEl.textContent = 'Buongiorno 🌿';
    else if (h >= 12 && h < 18) greetEl.textContent = 'Buon pomeriggio ☀️';
    else if (h >= 18 && h < 22) greetEl.textContent = 'Buonasera 🌙';
    else                         greetEl.textContent = 'Buonanotte 🌛';
  }

  const nameEl = document.getElementById('home-greeting-name');
  if (nameEl) nameEl.textContent = u.name ? u.name + '!' : 'Ciao!';

  const coinsEl = document.getElementById('home-coins');
  if (coinsEl) coinsEl.textContent = u.coins || 0;

  const avatarBtn = document.getElementById('home-avatar-btn');
  if (avatarBtn) {
    if (u.avatar) {
      avatarBtn.innerHTML = `<img src="${u.avatar}" alt="avatar" style="width:40px;height:40px;border-radius:50%;object-fit:cover;">`;
    } else {
      avatarBtn.textContent = '🧑';
    }
  }

  const products = await getProducts();
  const now = new Date(); now.setHours(0,0,0,0);

  const expiring = products.filter(p => {
    const d = parseDate(p.date);
    if (!d) return false;
    return (d - now) / 86400000 <= 3 && (d - now) / 86400000 >= 0;
  });

  // Contatore shelf nella home card
  const shelfCountEl = document.getElementById('home-shelf-count');
  if (shelfCountEl) shelfCountEl.textContent = products.length;

  const descEl = document.getElementById('home-shelf-desc');
  if (descEl) {
    const tot = products.length;
    const exp = expiring.length;
    if (tot === 0) {
      descEl.textContent = 'Nessun prodotto ancora';
    } else {
      descEl.textContent = `${tot} prodott${tot === 1 ? 'o' : 'i'}${exp ? ` • ${exp} in scadenza` : ''}`;
    }
  }

  const strip   = document.getElementById('home-expiring-strip');
  const itemsEl = document.getElementById('home-expiring-items');
  if (strip && itemsEl) {
    if (expiring.length > 0) {
      strip.style.display = 'flex';
      itemsEl.textContent = expiring.map(p => {
        const d    = parseDate(p.date);
        const diff = Math.round((d - now) / 86400000);
        const label = diff === 0 ? 'oggi' : diff === 1 ? '1g' : diff + 'g';
        return `${p.emoji || '🥑'} ${p.name} · ${label}`;
      }).join('  •  ');
    } else {
      strip.style.display = 'none';
    }
  }
}

/* ── SHELF ── */
async function renderShelf() {
  const c = document.getElementById('shelf-list');
  c.innerHTML = '<div class="shelf-empty"><div class="shelf-empty-emoji">⏳</div><div class="shelf-empty-title">Caricamento...</div></div>';

  let products = await getProducts();
  const now = new Date(); now.setHours(0,0,0,0);

  function daysLeft(dateStr) {
    const d = parseDate(dateStr);
    if (!d) return null;
    return Math.round((d - now) / 86400000);
  }

  function dateBadge(dateStr) {
    const diff = daysLeft(dateStr);
    if (diff === null) return { cls: 'date-badge-ok', label: dateStr, sub: '', subCls: '' };
    let cls, sub, subCls;
    if (diff < 0) {
      cls = 'date-badge-danger'; sub = diff === -1 ? 'ieri' : Math.abs(diff) + ' gg fa'; subCls = 'date-sublabel-danger';
    } else if (diff === 0) {
      cls = 'date-badge-danger'; sub = 'oggi ⚠️'; subCls = 'date-sublabel-danger';
    } else if (diff === 1) {
      cls = 'date-badge-danger'; sub = 'domani ⚠️'; subCls = 'date-sublabel-danger';
    } else if (diff <= 3) {
      cls = 'date-badge-soon'; sub = diff + ' giorni ⚠️'; subCls = 'date-sublabel-warn';
    } else {
      cls = 'date-badge-ok'; sub = diff + ' giorni'; subCls = 'date-sublabel';
    }
    return { cls, label: dateStr, sub, subCls };
  }

  const countEl = document.getElementById('shelf-header-count');
  if (countEl) {
    if (!products.length) {
      countEl.textContent = 'Nessun prodotto ancora';
    } else {
      const expCount = products.filter(p => (daysLeft(p.date) ?? 99) <= 3).length;
      countEl.textContent = `${products.length} prodott${products.length === 1 ? 'o' : 'i'}${expCount ? ` • ${expCount} in scadenza ⚠️` : ''}`;
    }
  }

  // Aggiorna coins nella shelf
  const shelfCoinsEl = document.getElementById('shelf-coins-val');
  if (shelfCoinsEl && _currentUser) shelfCoinsEl.textContent = _currentUser.coins || 0;

  if (!products.length) {
    c.innerHTML = `
      <div class="shelf-empty">
        <div class="shelf-empty-emoji">📦</div>
        <div class="shelf-empty-title">Nessun alimento ancora</div>
        <div class="shelf-empty-sub">Aggiungi il tuo primo prodotto! 🥑</div>
      </div>`;
    return;
  }

  products = products.slice().sort((a, b) => {
    const da = parseDate(a.date) || new Date(8640000000000000);
    const db = parseDate(b.date) || new Date(8640000000000000);
    return da - db;
  });

  const expired = products.filter(p => (daysLeft(p.date) ?? 0) < 0);
  const warning = products.filter(p => { const d = daysLeft(p.date); return d !== null && d >= 0 && d <= 3; });
  const ok      = products.filter(p => (daysLeft(p.date) ?? 99) > 3);

  function cardHTML(p) {
    const badge = dateBadge(p.date);
    const thumb = p.image_url
      ? `<img src="${p.image_url}" alt="${p.name}" loading="lazy" style="width:52px;height:52px;border-radius:12px;object-fit:cover;">`
      : (p.emoji || '🥑');

    let badgeCls = 'badge-safe', dotClass = 'dot-safe';
    if (badge.cls === 'date-badge-danger') { badgeCls = 'badge-critical'; dotClass = 'dot-critical'; }
    else if (badge.cls === 'date-badge-soon') { badgeCls = 'badge-warning'; dotClass = 'dot-warning'; }

    const unitLabel = p.unit ? ` ${p.unit}` : '';

    return `
      <div class="shelf-item glass-card" onclick="openDetail(${p.id})">
        <div class="shelf-emoji-box">${thumb}</div>
        <div class="shelf-item-info">
          <div class="shelf-item-name">${p.name}</div>
          <div class="shelf-item-qty">${p.qty || ''}${unitLabel}</div>
          <span class="shelf-item-badge ${badgeCls}">${badge.sub || badge.label}</span>
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;gap:8px;">
          <div class="expiry-dot ${dotClass}"></div>
          <span style="color:var(--on-surface-variant);font-size:18px;">›</span>
        </div>
      </div>`;
  }

  let html = '';

  const warnCount = warning.length + expired.length;
  if (warnCount > 0) {
    html += `<div style="display:flex;align-items:center;gap:8px;padding:10px 16px;background:rgba(245,158,11,0.1);border-left:4px solid var(--expiry-warning);border-radius:0 14px 14px 0;margin-bottom:4px;font-size:13px;font-weight:700;color:#92400e;">
      ⚠️ ${warnCount} prodott${warnCount === 1 ? 'o' : 'i'} in scadenza o scadut${warnCount === 1 ? 'o' : 'i'}
    </div>`;
  }

  if (warning.length) {
    html += `<div style="font-size:12px;font-weight:700;color:var(--on-surface-variant);text-transform:uppercase;letter-spacing:0.06em;padding:4px 4px 8px;">⚠️ Scadenza imminente</div>`;
    html += warning.map(cardHTML).join('');
  }

  if (ok.length) {
    html += `<div style="font-size:12px;font-weight:700;color:var(--on-surface-variant);text-transform:uppercase;letter-spacing:0.06em;padding:12px 4px 8px;">✅ Tutto ok</div>`;
    html += ok.map(cardHTML).join('');
  }

  if (expired.length) {
    html += `<div style="font-size:12px;font-weight:700;color:var(--on-surface-variant);text-transform:uppercase;letter-spacing:0.06em;padding:12px 4px 8px;">🚫 Scaduti</div>`;
    html += expired.map(cardHTML).join('');
  }

  c.innerHTML = html;
}

/* ── DETAIL ── */
let currentProductId = null;

async function openDetail(id) {
  const products = await getProducts();
  const p = products.find(x => x.id === id);
  if (!p) return;
  currentProductId = id;

  document.getElementById('detail-product-name').textContent = p.name;

  const emojiEl = document.getElementById('detail-emoji');
  if (p.image_url) {
    emojiEl.innerHTML = `<img src="${p.image_url}" alt="${p.name}" style="width:80px;height:80px;border-radius:20px;object-fit:cover;box-shadow:0 4px 16px rgba(45,106,79,0.2);">`;
  } else {
    emojiEl.textContent = p.emoji || '🥑';
  }

  const daysLeft = (() => {
    const d = parseDate(p.date);
    if (!d) return null;
    const now = new Date(); now.setHours(0,0,0,0);
    return Math.round((d - now) / 86400000);
  })();

  let badgeCls = 'badge-safe', badgeText = daysLeft !== null ? `${daysLeft} giorni rimanenti` : '';
  if (daysLeft !== null) {
    if (daysLeft < 0)  { badgeCls = 'badge-critical'; badgeText = 'Scaduto'; }
    else if (daysLeft === 0) { badgeCls = 'badge-critical'; badgeText = 'Scade oggi ⚠️'; }
    else if (daysLeft <= 3)  { badgeCls = 'badge-warning';  badgeText = `Scade tra ${daysLeft} giorni ⚠️`; }
  }

  const unitLabel = p.unit ? ` ${p.unit}` : '';

  let safetyBlock = '';
  if (p.type === 'preferibilmente') {
    safetyBlock = p.ai_safety
      ? buildSafetyBlock(p.ai_safety, p.date)
      : `<div id="ai-safety-block" class="ai-safety-block ai-loading">
           <span class="ai-spinner"></span>
           <span style="font-size:13px;color:var(--on-surface-variant);">Analisi AI in corso…</span>
         </div>`;
  }

  document.getElementById('detail-info').innerHTML = `
    <div class="detail-row">
      <span class="detail-row-label">Nome</span>
      <span class="detail-row-value">${p.name}</span>
    </div>
    <div class="detail-row">
      <span class="detail-row-label">Quantità</span>
      <span class="detail-row-value">${p.qty || '–'}${unitLabel}</span>
    </div>
    <div class="detail-row">
      <span class="detail-row-label">Tipo scadenza</span>
      <span class="detail-row-value">${p.type === 'consumarsi' ? 'Da consumarsi entro' : 'Preferibilmente entro'}</span>
    </div>
    <div class="detail-row">
      <span class="detail-row-label">Data</span>
      <div style="text-align:right;">
        <span class="detail-row-value">${p.date}</span><br>
        <span class="shelf-item-badge ${badgeCls}" style="display:inline-block;margin-top:4px;">${badgeText}</span>
      </div>
    </div>
    ${safetyBlock ? `<div style="padding:14px 20px;">${safetyBlock}</div>` : ''}`;

  goTo('screen-detail');

  if (p.type === 'preferibilmente' && !p.ai_safety) {
    const result = await getAISafety(p.name, p.image_url);
    const block  = document.getElementById('ai-safety-block');
    if (result) {
      await _supabase.from('products').update({ ai_safety: result }).eq('id', id);
      if (_productsCache?.items) {
        const cached = _productsCache.items.find(x => x.id === id);
        if (cached) cached.ai_safety = result;
      }
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
      safeUntil = base.toLocaleDateString('it-IT', { day:'2-digit', month:'2-digit', year:'numeric' });
    }
  }
  const riskColor = { low:'#27ae60', medium:'#e67e22', high:'#c0392b' };
  const riskLabel = { low:'Basso rischio', medium:'Rischio medio', high:'Alto rischio' };
  const riskEmoji = { low:'✅', medium:'⚠️', high:'🚫' };
  const color = riskColor[safety.risk] || '#2d8653';
  const src   = safety.matchedName ? `AI · ${safety.matchedName}` : 'Stima AI';
  return `
    <div class="ai-safety-block" style="border-left:3px solid ${color};">
      <div class="ai-safety-header">
        <span style="font-size:14px;">🤖 Analisi AI</span>
        <span class="ai-risk-badge" style="background:${color};">${riskEmoji[safety.risk] || '📋'} ${riskLabel[safety.risk] || ''}</span>
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

async function removeOne() {
  const products = await getProducts();
  const p = products.find(x => x.id === currentProductId);
  if (!p) return;
  const q = parseFloat(p.qty);
  if (!isNaN(q) && q > 1) {
    await _supabase.from('products').update({ qty: String(q - 1) }).eq('id', currentProductId);
    invalidateCache();
    showToast('Quantità: ' + (q - 1));
    openDetail(currentProductId);
  } else {
    await _supabase.from('products').delete().eq('id', currentProductId);
    invalidateCache();
    showToast('Prodotto rimosso ✓');
    goTo('screen-shelf');
  }
}

async function removeAll() {
  await _supabase.from('products').delete().eq('id', currentProductId);
  invalidateCache();
  showToast('Prodotto rimosso ✓');
  goTo('screen-shelf');
}

/* ── PROFILE ── */
async function loadProfile() {
  const u = await ensureCurrentUser();
  if (!u) return;
  updateCoinsDisplay();
  document.getElementById('profile-name-display').textContent  = u.name  || 'Utente';
  document.getElementById('profile-email-display').textContent = u.email || 'email@esempio.com';
  document.getElementById('edit-name').value  = u.name  || '';
  document.getElementById('edit-email').value = u.email || '';
  document.getElementById('edit-pass').value  = '';
  const av = document.getElementById('avatar-display');
  if (u.avatar) {
    av.style.cssText = `background-image:url(${u.avatar});background-size:cover;background-position:center;font-size:0;`;
    av.textContent = '';
  } else {
    av.style.cssText = '';
    av.textContent = '🧑‍🍳';
  }
}

async function saveProfile() {
  const n  = (document.getElementById('edit-name').value  || '').trim();
  const e  = (document.getElementById('edit-email').value || '').trim().toLowerCase();
  const pw =  document.getElementById('edit-pass').value  || '';

  if (!n || !e) { showToast('Nome e email obbligatori'); return; }

  const { data: { user } } = await _supabase.auth.getUser();
  if (!user) return;

  const emailChanged    = e !== user.email;
  const passwordChanged = !!pw;

  if (emailChanged || passwordChanged) {
    const attrs = {};
    if (emailChanged)    attrs.email    = e;
    if (passwordChanged) attrs.password = pw;

    const { error } = await _supabase.auth.updateUser(
      attrs,
      emailChanged ? { emailRedirectTo: 'https://aura-foods.it/conferma-email' } : {}
    );

    if (error) { showToast('Errore aggiornamento ❌'); console.error(error); return; }
  }

  const { error: dbError } = await _supabase
    .from('users')
    .update({ name: n })
    .eq('id', user.id);

  if (dbError) { showToast('Errore salvataggio ❌'); console.error(dbError); return; }

  if (emailChanged)      showToast('Controlla la nuova email 📧');
  else if (passwordChanged) showToast('Profilo aggiornato ✓ 🔐');
  else                   showToast('Profilo aggiornato ✓ 🌿');

  _currentUser = null;
  const fresh = await ensureCurrentUser();
  document.getElementById('profile-name-display').textContent  = fresh?.name  || 'Utente';
  document.getElementById('profile-email-display').textContent = user.email   || 'email@esempio.com';
  document.getElementById('edit-pass').value = '';
  loadProfile();
}

function handleAvatar(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async function(ev) {
    const u = await ensureCurrentUser();
    if (!u) return;
    await _supabase.from('users').update({ avatar: ev.target.result }).eq('id', u.id);
    _currentUser.avatar = ev.target.result;
    loadProfile();
    showToast('Foto profilo aggiornata! 📸');
  };
  reader.readAsDataURL(file);
}

/* ── TOAST ── */
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), 2600);
}

/* ── SCANNER (lazy load) ── */
let html5QrCode         = null;
let scannerBusy         = false;
let pendingProductImage = null;
let _scannerLibLoaded   = false;

function openScanner() {
  if (!_scannerLibLoaded) {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
    script.onload = () => { _scannerLibLoaded = true; _startScanner(); };
    script.onerror = () => setStatus('Errore caricamento scanner ❌', 'error');
    document.head.appendChild(script);
    document.getElementById('scanner-modal').classList.add('open');
    setStatus('Caricamento scanner…', '');
    return;
  }
  _startScanner();
}

function _startScanner() {
  scannerBusy = false; pendingProductImage = null;
  document.getElementById('scanner-modal').classList.add('open');
  setStatus('', '');
  document.getElementById('scanner-container').innerHTML = '';
  html5QrCode = new Html5Qrcode('scanner-container');

  setTimeout(() => {
    Html5Qrcode.getCameras().then(cameras => {
      if (!cameras || cameras.length === 0) {
        setStatus('Nessuna fotocamera trovata ❌', 'error');
        return;
      }
      const container = document.getElementById('scanner-container');
      const containerW = container.offsetWidth || 300;
      html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: Math.min(containerW - 40, 260), height: 150 },
          aspectRatio: 1.7,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13, Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,  Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128, Html5QrcodeSupportedFormats.CODE_39,
          ]
        },
        onBarcodeDetected,
        () => {}
      ).catch(err => {
        console.error(err);
        setStatus('Errore avvio fotocamera ❌', 'error');
      });
    }).catch(err => {
      console.error(err);
      setStatus('Permesso fotocamera negato ❌', 'error');
    });
  }, 300);
}

function closeScanner() {
  const modal = document.getElementById('scanner-modal');
  const doClose = () => {
    modal.classList.remove('open');
    document.getElementById('scanner-container').innerHTML = '';
    html5QrCode = null; scannerBusy = false;
  };
  if (html5QrCode) {
    const running = html5QrCode.getState && html5QrCode.getState() === Html5QrcodeScannerState.SCANNING;
    if (running) { html5QrCode.stop().then(doClose).catch(doClose); }
    else { try { html5QrCode.clear(); } catch(_) {} doClose(); }
  } else { doClose(); }
}

async function onBarcodeDetected(barcode) {
  if (scannerBusy) return;
  scannerBusy = true;
  setStatus('Codice: ' + barcode + ' — cerco…', '');
  try { if (html5QrCode) await html5QrCode.stop(); } catch(_) {}
  try {
    const res  = await fetch('https://world.openfoodfacts.org/api/v0/product/' + barcode + '.json');
    const data = await res.json();
    let name = '', imageUrl = null;
    if (data.status === 1 && data.product) {
      const p = data.product;
      const brand = (p.brands || '').split(',')[0].trim();
      const pname = p.product_name_it || p.product_name || p.generic_name || '';
      name = brand && pname ? brand + ' – ' + pname : brand || pname;
      imageUrl = p.image_front_small_url || p.image_url || null;
    }
    if (name) {
      setStatus('✅ ' + name, 'found');
      setTimeout(() => { closeScanner(); setTimeout(() => openQRForm(name, imageUrl), 150); }, 1000);
    } else {
      setStatus('Prodotto non trovato, inserisci il nome ✏️', 'error');
      setTimeout(() => { closeScanner(); setTimeout(() => prefillManualForm('', null, false), 150); }, 1200);
    }
  } catch(_) {
    setStatus('Errore di rete — inserisci manualmente', 'error');
    setTimeout(() => { closeScanner(); setTimeout(() => prefillManualForm('', null, false), 150); }, 1200);
  }
}

/* ── QR FORM ── */
let pendingQRProduct = null;

function openQRForm(name, imageUrl) {
  pendingQRProduct = { name, imageUrl };
  document.getElementById('qr-product-name').textContent = name;
  const imgEl = document.getElementById('qr-preview-img');
  if (imageUrl) {
    imgEl.innerHTML = `<img src="${imageUrl}" alt="${name}" style="width:52px;height:52px;border-radius:12px;object-fit:cover;">`;
  } else {
    imgEl.textContent = getEmoji(name);
  }
  document.getElementById('qr-qty').value = '';
  // Reset date pills QR
  ['qr-date-d','qr-date-m','qr-date-y'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  goTo('screen-qr');
  setTimeout(() => document.getElementById('qr-qty').focus(), 400);
}

async function addProductFromQR() {
  if (_isAddingProduct) return;
  _isAddingProduct = true;

  try {
    if (!pendingQRProduct) { goTo('screen-add'); _isAddingProduct = false; return; }
    const qty   = (document.getElementById('qr-qty').value  || '').trim();
    const unit  =  document.getElementById('qr-unit')?.value || '';
    const type  =  document.getElementById('qr-type').value;
    const dateR = getQrDate();

    if (!qty || !dateR) { showToast('Compila quantità e scadenza 🌿'); _isAddingProduct = false; return; }

    await mergeOrAddProduct(pendingQRProduct.name, qty, unit, type, formatDate(dateR), true, pendingQRProduct.imageUrl);
    pendingQRProduct = null;
    pendingProductImage = null;
    // Reset pill QR
    ['qr-date-d','qr-date-m','qr-date-y'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    document.getElementById('qr-qty').value = '';
    goTo('screen-success');
  } catch(e) {
    showToast('Errore ❌');
    _isAddingProduct = false;
  }
}

function prefillManualForm(name, imageUrl, nameConfirmed) {
  pendingProductImage = imageUrl || null;
  const nameEl = document.getElementById('prod-name');
  const qtyEl  = document.getElementById('prod-qty');
  if (nameEl) nameEl.value = name || '';
  if (qtyEl)  qtyEl.value  = '';
  // Reset date pills
  ['prod-date-d','prod-date-m','prod-date-y'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const nameGroup = nameEl?.closest('.form-group');
  if (nameGroup) nameGroup.style.display = nameConfirmed ? 'none' : '';
  const existingPreview = document.getElementById('scan-product-preview');
  if (existingPreview) existingPreview.remove();
  if (name && imageUrl) {
    const preview = document.createElement('div');
    preview.id = 'scan-product-preview';
    preview.style.cssText = 'display:flex;align-items:center;gap:12px;background:rgba(255,255,255,0.65);border-radius:16px;padding:12px 14px;margin-bottom:4px;';
    preview.innerHTML = `<img src="${imageUrl}" alt="${name}" style="width:52px;height:52px;border-radius:12px;object-fit:cover;flex-shrink:0;">
      <div>
        <div style="font-family:var(--font-display);font-size:15px;color:var(--primary);">${name}</div>
        <div style="font-size:12px;font-weight:700;color:var(--secondary);">Prodotto trovato ✅</div>
      </div>`;
    const formContent = document.querySelector('#screen-manual .form-content');
    const card = formContent?.querySelector('.form-card');
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

/* ── INIT ── */
(async function init() {
  if (window.location.pathname.includes('conferma-email')) return;
  const { data: { user } } = await _supabase.auth.getUser();
  if (user) {
    const u = await ensureCurrentUser();
    if (u) goTo('screen-home');
  }
  hideSplash();
})();
