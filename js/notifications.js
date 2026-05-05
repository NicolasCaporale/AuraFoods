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
    let subscription = await reg.pushManager.getSubscription();

    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
    }

    await supabase
      .from('push_subscriptions')
      .upsert({ user_id: userId, subscription: subscription.toJSON() }, { onConflict: 'user_id' });

    console.log('✅ Notifiche attivate');
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

  // Se il SW non è ancora pronto aspetta max 3 secondi
  let reg = null;
  try {
    reg = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000))
    ]);
  } catch {
    label.textContent    = Notification.permission === 'granted' ? 'Disattivate' : 'Non ancora abilitate';
    btn.textContent      = '🔔 Attiva';
    btn.style.background = '#2d6a4f';
    btn.disabled         = false;
    return;
  }

  let sub = null;
  try {
    sub = await reg.pushManager.getSubscription();
  } catch {
    sub = null;
  }

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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();

  if (sub) {
    // Disattiva
    await removeNotifications(supabase, user.id);
    showToast('🔕 Notifiche disattivate');
  } else {
    // Attiva
    await initNotifications(supabase, user.id);
    const newSub = await reg.pushManager.getSubscription();
    if (newSub) {
      showToast('🔔 Notifiche attivate!');
    } else {
      showToast('❌ Permesso negato o errore');
    }
  }

  await fUI();
}
