/* KvizToGo opt-in Web Push za goste i prijavljene korisnike. */
(function () {
  'use strict';
  const VAPID_PUBLIC_KEY = 'BDVhAYnv__IhCjo25rRRmnKZXSDzdb-R-QkbJGsoLbgE_SxLSfYx-34e45zfjNvIcy4UMErOHgnQBRSV-eMFfqk';
  const DISMISSED_KEY = 'kviztogo_push_prompt_dismissed_at';

  function b64ToBytes(value) {
    const pad = '='.repeat((4 - value.length % 4) % 4);
    const raw = atob((value + pad).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
  }
  function getPlayerKey() {
    const keys = ['kviztogo_daily30_player_key','kviztogo_player_key','kviztogo_visitor_id','visitor_id'];
    for (const key of keys) { const v = localStorage.getItem(key); if (v) return v; }
    return null;
  }
  async function saveSubscription(sub) {
    if (!window.supabaseClient || !sub) return false;
    const json = sub.toJSON();
    const row = { endpoint: json.endpoint, p256dh: json.keys && json.keys.p256dh, auth: json.keys && json.keys.auth, player_key: getPlayerKey(), enabled: true, updated_at: new Date().toISOString() };
    try { const session = await window.supabaseClient.auth.getSession(); row.user_id = session?.data?.session?.user?.id || null; } catch (_) { row.user_id = null; }
    const { error } = await window.supabaseClient.from('web_push_subscriptions').upsert(row, { onConflict: 'endpoint' });
    if (!error) return true;
    console.warn('KvizToGo push subscription nije spremljen:', error.message || error); return false;
  }
  async function enablePush(button) {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { if (button) button.textContent = 'Obavijesti nisu dopuštene'; return; }
      const reg = await navigator.serviceWorker.register('/push-sw.js');
      let sub = await reg.pushManager.getSubscription();
      if (sub) {
        const oldKey = sub.options && sub.options.applicationServerKey ? new Uint8Array(sub.options.applicationServerKey) : null;
        const newKey = b64ToBytes(VAPID_PUBLIC_KEY);
        if (!oldKey || oldKey.length !== newKey.length || oldKey.some((v,i)=>v!==newKey[i])) { await sub.unsubscribe(); sub = null; }
      }
      if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(VAPID_PUBLIC_KEY) });
      const ok = await saveSubscription(sub);
      if (button) { button.textContent = ok ? '✓ Podsjetnik uključen' : 'Pokušaj ponovno'; button.disabled = ok; }
      if (ok) document.getElementById('kviztogo-push-prompt')?.remove();
    } catch (err) { console.warn('KvizToGo push:', err); if (button) button.textContent = 'Pokušaj ponovno'; }
  }
  async function alreadySubscribed() { try { const reg = await navigator.serviceWorker.getRegistration('/push-sw.js'); return !!(reg && await reg.pushManager.getSubscription()); } catch (_) { return false; } }
  async function showPrompt() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return;
    if (Notification.permission === 'denied' || await alreadySubscribed()) return;
    const dismissed = Number(localStorage.getItem(DISMISSED_KEY) || 0); if (dismissed && Date.now() - dismissed < 14 * 86400000) return;
    if (document.getElementById('kviztogo-push-prompt')) return;
    const box = document.createElement('div'); box.id = 'kviztogo-push-prompt';
    box.style.cssText = 'position:fixed;left:12px;right:12px;bottom:14px;z-index:99999;max-width:520px;margin:auto;padding:14px;border:1px solid rgba(34,197,94,.55);border-radius:18px;background:#101b2d;color:#fff;box-shadow:0 18px 50px rgba(0,0,0,.5);font-family:Inter,system-ui,sans-serif';
    box.innerHTML = '<div style="font-weight:900;font-size:15px">🔔 Želiš podsjetnik za Dnevnih 30?</div><div style="margin-top:5px;color:#cbd5e1;font-size:13px;line-height:1.35">Uključi obavijesti i KvizToGo te može podsjetiti kad te čeka dnevni kviz.</div><div style="display:flex;gap:8px;margin-top:11px"><button id="kviztogo-push-enable" type="button" style="flex:1;border:0;border-radius:12px;padding:10px;background:#22c55e;color:white;font-weight:900">Uključi podsjetnik</button><button id="kviztogo-push-later" type="button" style="border:1px solid #64748b;border-radius:12px;padding:10px;background:transparent;color:#e2e8f0;font-weight:800">Ne sada</button></div>';
    document.body.appendChild(box);
    box.querySelector('#kviztogo-push-enable').addEventListener('click', e => enablePush(e.currentTarget));
    box.querySelector('#kviztogo-push-later').addEventListener('click', () => { localStorage.setItem(DISMISSED_KEY, String(Date.now())); box.remove(); });
  }
  window.KvizToGoPush = { enable: enablePush }; const boot = () => setTimeout(showPrompt, 3500);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true }); else boot();
})();
