const VAPID_PUBLIC_KEY = 'BNTbG7TqGwv3UkREoL6FlOvonxOpivaa8MJGFqHIqA5OVNWzESk7ubIXeSXL7ddNDwnm_1mtkYoXAiQ6mqSKqzI';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

async function initNotifications(supabase, userId) {
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
  if (Notification.permission === 'denied') return;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return;

  try {
    const reg = await navigator.serviceWorker.ready;

    // Forza sempre una subscription fresca — gestisce il rinnovo Apple
    let subscription = await reg.pushManager.getSubscription();
    if (subscription) await subscription.unsubscribe();

    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });

    await supabase
      .from('push_subscriptions')
      .upsert({ user_id: userId, subscription: subscription.toJSON() }, { onConflict: 'user_id' });

    console.log('✅ Subscription aggiornata');
  } catch (err) {
    console.error('Errore push:', err);
  }
}


async function removeNotifications(supabase, userId) {
  try {
    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.getSubscription();
    if (subscription) await subscription.unsubscribe();
    await supabase.from('push_subscriptions').delete().eq('user_id', userId);
  } catch (err) {
    console.error('Errore rimozione push:', err);
  }
}

async function getSWReg() {
  // Prova prima getRegistration (veloce)
  const quick = await navigator.serviceWorker.getRegistration('/');
  if (quick?.active) return quick;
  // Fallback: aspetta ready con timeout 5s
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 5000))
  ]).catch(() => null);
}

async function updateNotifUI() {
  const btn   = document.getElementById('notif-toggle-btn');
  const label = document.getElementById('notif-status-label');
  if (!btn || !label) return;

  if (!('Notification' in window) || !('PushManager' in window) || !('serviceWorker' in navigator)) {
    label.textContent = 'Non supportate su questo browser';
    btn.textContent   = '—';
    btn.disabled      = true;
    return;
  }

  if (Notification.permission === 'denied') {
    label.textContent    = 'Bloccate — abilitale nelle impostazioni';
    btn.textContent      = '🔕 Bloccate';
    btn.disabled         = true;
    btn.style.background = '#999';
    return;
  }

  const reg = await getSWReg();
  if (!reg) {
    label.textContent    = Notification.permission === 'granted' ? 'Disattivate' : 'Non ancora abilitate';
    btn.textContent      = '🔔 Attiva';
    btn.style.background = '#2d6a4f';
    btn.disabled         = false;
    return;
  }

  let sub = null;
  try { sub = await reg.pushManager.getSubscription(); } catch { sub = null; }

  if (sub) {
    label.textContent    = 'Attive ✅';
    btn.textContent      = '🔕 Disattiva';
    btn.style.background = '#c0392b';
  } else {
    label.textContent    = Notification.permission === 'granted' ? 'Disattivate' : 'Non ancora abilitate';
    btn.textContent      = '🔔 Attiva';
    btn.style.background = '#2d6a4f';
  }
  btn.disabled = false;
}

async function toggleNotifications() {
  const btn = document.getElementById('notif-toggle-btn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳'; }

  try {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) { showToast('Utente non trovato ❌'); await updateNotifUI(); return; }

    const reg = await getSWReg();
    if (!reg) { showToast('Service Worker non pronto ❌'); await updateNotifUI(); return; }

    const sub = await reg.pushManager.getSubscription();

    if (sub) {
      // DISATTIVA — forza rimozione anche se unsubscribe fallisce
      let unsubOk = false;
      try { unsubOk = await sub.unsubscribe(); } catch(e) { console.warn('unsubscribe:', e); }
      console.log('unsubscribe result:', unsubOk);
      // Rimuove da Supabase sempre
      await _supabase.from('push_subscriptions').delete().eq('user_id', user.id);
      showToast('🔕 Notifiche disattivate');
    } else {
      // ATTIVA
      await initNotifications(_supabase, user.id);
      const newSub = await reg.pushManager.getSubscription();
      showToast(newSub ? '🔔 Notifiche attivate!' : '❌ Permesso negato');
    }
  } catch(err) {
    console.error('toggle errore:', err);
    showToast('❌ ' + err.message);
  }

  await updateNotifUI();
}
