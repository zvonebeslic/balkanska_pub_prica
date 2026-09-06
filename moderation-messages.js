(function () {
  "use strict";

  const GUEST_IDENTITY_KEY = "kviztogo_guest_identity_v1";
  const STYLE_ID = "kviztogo-moderation-messages-style";
  const MODAL_ID = "moderation-messages-modal";

  function getClient() {
    try { return typeof supabaseClient !== "undefined" ? supabaseClient : null; }
    catch (_) { return null; }
  }

  function getGuestIdentity() {
    try {
      const value = JSON.parse(localStorage.getItem(GUEST_IDENTITY_KEY) || "null");
      return value && value.id ? value : null;
    } catch (_) {
      return null;
    }
  }

  async function getIdentity() {
    const client = getClient();
    if (!client) return null;

    try {
      const { data } = await client.auth.getSession();
      const user = data?.session?.user || null;
      if (user) return { isGuest: false, userId: user.id, playerKey: `user:${user.id}` };
    } catch (_) {}

    const guest = getGuestIdentity();
    return guest?.id ? { isGuest: true, userId: null, playerKey: `guest:${guest.id}` } : null;
  }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
.player-fab-message-bubble{
  position:absolute;right:-8px;top:-8px;z-index:6;width:28px;height:28px;border-radius:50%;
  border:1px solid rgba(255,255,255,.22);background:rgba(18,31,50,.58);color:#fff;
  display:grid;place-items:center;padding:0;cursor:pointer;opacity:.22;transform:scale(.94);
  transition:opacity .18s ease,transform .18s ease,background .18s ease,box-shadow .18s ease;
  box-shadow:none;
}
.player-fab-message-bubble.has-unread{opacity:1;transform:scale(1);background:rgba(18,31,50,.96);box-shadow:0 4px 14px rgba(0,0,0,.36),0 0 12px rgba(47,128,255,.2)}
.player-fab-message-envelope{font-size:13px;line-height:1;transform:translateY(-.5px)}
.player-fab-message-count{
  position:absolute;right:-7px;top:-7px;min-width:18px;height:18px;padding:0 4px;border-radius:999px;
  display:none;align-items:center;justify-content:center;background:#ef4444;color:#fff;border:2px solid #11203a;
  font-size:10px;font-weight:950;line-height:1;box-shadow:0 2px 7px rgba(0,0,0,.35)
}
.player-fab-message-bubble.has-unread .player-fab-message-count{display:flex}
.modmsg-backdrop{position:fixed;inset:0;z-index:1840;background:rgba(0,0,0,.64);display:none;align-items:center;justify-content:center;padding:16px}
.modmsg-backdrop.open{display:flex}
.modmsg-card{width:min(430px,100%);max-height:min(680px,88dvh);overflow:auto;border-radius:20px;border:1px solid rgba(148,163,184,.26);background:#11203a;color:#fff;box-shadow:0 24px 70px rgba(0,0,0,.55);padding:16px}
.modmsg-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}
.modmsg-title{font-size:1rem;font-weight:950}.modmsg-close{width:34px;height:34px;border-radius:50%;border:1px solid rgba(148,163,184,.25);background:rgba(255,255,255,.08);color:#fff;font-size:1.1rem;cursor:pointer}
.modmsg-empty{padding:18px 8px;color:#a8b3c7;text-align:center;font-size:.78rem}
.modmsg-item{padding:12px;border-radius:14px;border:1px solid rgba(148,163,184,.2);background:rgba(255,255,255,.055);margin-top:9px}
.modmsg-item.unread{border-color:rgba(47,128,255,.58);background:rgba(47,128,255,.10)}
.modmsg-item-title{font-size:.86rem;font-weight:950}.modmsg-item-body{margin-top:6px;color:#d6deeb;font-size:.75rem;line-height:1.45;white-space:pre-wrap}
.modmsg-item-date{margin-top:7px;color:#8190a6;font-size:.61rem}
.modmsg-rename{margin-top:11px;display:none}.modmsg-rename.open{display:block}.modmsg-rename-row{display:flex;gap:7px;margin-top:7px}.modmsg-rename-input{min-width:0;flex:1 1 auto;min-height:42px;border-radius:11px;border:1px solid rgba(148,163,184,.32);background:rgba(0,0,0,.22);color:#fff;padding:8px 10px;font-size:16px;outline:none}.modmsg-btn{min-height:42px;border-radius:11px;border:1px solid rgba(47,128,255,.65);background:rgba(47,128,255,.22);color:#fff;padding:8px 11px;font-size:.72rem;font-weight:900;cursor:pointer}.modmsg-btn.primary{border-color:rgba(34,197,94,.65);background:rgba(34,197,94,.20)}.modmsg-note{margin-top:7px;min-height:1.2em;color:#a8b3c7;font-size:.68rem}.modmsg-note.error{color:#fca5a5}.modmsg-note.success{color:#86efac}
`;
    document.head.appendChild(style);
  }

  function ensureBubble() {
    const fab = document.getElementById("player-fab");
    if (!fab) return null;
    let bubble = document.getElementById("player-fab-message-bubble");
    if (bubble) return bubble;

    bubble = document.createElement("button");
    bubble.id = "player-fab-message-bubble";
    bubble.className = "player-fab-message-bubble";
    bubble.type = "button";
    bubble.setAttribute("aria-label", "Poruke");
    bubble.innerHTML = '<span class="player-fab-message-envelope" aria-hidden="true">✉</span><span class="player-fab-message-count" id="player-fab-message-count"></span>';
    fab.appendChild(bubble);
    bubble.addEventListener("pointerdown", event => event.stopPropagation());
    bubble.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      void openInbox();
    });
    return bubble;
  }

  function ensureModal() {
    let backdrop = document.getElementById(MODAL_ID);
    if (backdrop) return backdrop;
    backdrop = document.createElement("div");
    backdrop.id = MODAL_ID;
    backdrop.className = "modmsg-backdrop";
    backdrop.innerHTML = `
      <section class="modmsg-card" role="dialog" aria-modal="true" aria-label="Poruke">
        <div class="modmsg-head"><div class="modmsg-title">Poruke</div><button class="modmsg-close" type="button" aria-label="Zatvori">×</button></div>
        <div id="modmsg-list"></div>
      </section>`;
    document.body.appendChild(backdrop);
    backdrop.querySelector(".modmsg-close")?.addEventListener("click", closeInbox);
    backdrop.addEventListener("click", event => { if (event.target === backdrop) closeInbox(); });
    return backdrop;
  }

  function closeInbox() {
    document.getElementById(MODAL_ID)?.classList.remove("open");
  }

  async function loadMessages(identity) {
    const client = getClient();
    if (!client || !identity) return [];

    if (identity.isGuest) {
      const { data, error } = await client.rpc("moderation_get_guest_messages", { p_player_key: identity.playerKey });
      if (error) throw error;
      return Array.isArray(data) ? data : [];
    }

    const { data, error } = await client
      .from("user_moderation_messages")
      .select("id,title,body,is_read,created_at,read_at,message_type")
      .eq("user_id", identity.userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  }

  async function markRead(identity, id) {
    const client = getClient();
    if (!client || !identity || !id) return false;
    if (identity.isGuest) {
      const { data, error } = await client.rpc("moderation_mark_guest_message_read", { p_id: id, p_player_key: identity.playerKey });
      if (error) throw error;
      return data === true;
    }
    const { error } = await client.from("user_moderation_messages").update({ is_read: true, read_at: new Date().toISOString() }).eq("id", id).eq("user_id", identity.userId);
    if (error) throw error;
    return true;
  }

  function setUnreadCount(count) {
    const bubble = ensureBubble();
    if (!bubble) return;
    const n = Math.max(0, Number(count) || 0);
    bubble.classList.toggle("has-unread", n > 0);
    const badge = document.getElementById("player-fab-message-count");
    if (badge) badge.textContent = n > 9 ? "9+" : String(n || "");
    bubble.setAttribute("aria-label", n ? `Poruke, ${n} nepročitanih` : "Poruke");
  }

  async function refreshUnread() {
    try {
      const identity = await getIdentity();
      if (!identity) { setUnreadCount(0); return; }
      const messages = await loadMessages(identity);
      setUnreadCount(messages.filter(item => !item.is_read).length);
    } catch (error) {
      console.warn("Moderatorske poruke nisu učitane:", error);
      setUnreadCount(0);
    }
  }

  function formatDate(value) {
    try { return new Intl.DateTimeFormat("hr-HR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
    catch (_) { return ""; }
  }

  async function resolveName(identity, input, note) {
    const client = getClient();
    const newName = String(input?.value || "").trim();
    note.className = "modmsg-note";
    note.textContent = "";
    if (newName.length < 2 || newName.length > 20) {
      note.classList.add("error");
      note.textContent = "Ime mora imati od 2 do 20 znakova.";
      return;
    }

    try {
      let result;
      if (identity.isGuest) {
        result = await client.rpc("moderation_resolve_guest_name", { p_player_key: identity.playerKey, p_new_name: newName });
      } else {
        result = await client.rpc("moderation_resolve_my_profile_name", { p_new_name: newName });
      }
      if (result.error) throw result.error;
      if (result.data !== true) {
        note.classList.add("error");
        note.textContent = "To ime nije moguće spremiti. Pokušaj s drugim imenom.";
        return;
      }

      if (identity.isGuest) {
        try {
          const guest = getGuestIdentity();
          if (guest) {
            guest.displayName = newName;
            localStorage.setItem(GUEST_IDENTITY_KEY, JSON.stringify(guest));
          }
        } catch (_) {}
      }

      note.classList.add("success");
      note.textContent = "Novo ime je spremljeno. Ponovno se prikazuješ na ljestvici.";
      setTimeout(() => location.reload(), 650);
    } catch (error) {
      console.warn("Moderirano ime nije promijenjeno:", error);
      note.classList.add("error");
      note.textContent = "Promjena imena trenutačno nije uspjela.";
    }
  }

  async function openInbox() {
    const modal = ensureModal();
    modal.classList.add("open");
    const list = document.getElementById("modmsg-list");
    if (!list) return;
    list.innerHTML = '<div class="modmsg-empty">Učitavam poruke…</div>';

    try {
      const identity = await getIdentity();
      if (!identity) {
        list.innerHTML = '<div class="modmsg-empty">Nema poruka.</div>';
        return;
      }

      const messages = await loadMessages(identity);
      if (!messages.length) {
        list.innerHTML = '<div class="modmsg-empty">Nema poruka.</div>';
        setUnreadCount(0);
        return;
      }

      list.innerHTML = "";
      for (const message of messages) {
        const item = document.createElement("article");
        item.className = `modmsg-item${message.is_read ? "" : " unread"}`;

        const title = document.createElement("div");
        title.className = "modmsg-item-title";
        title.textContent = message.title || "Poruka";
        item.appendChild(title);

        const body = document.createElement("div");
        body.className = "modmsg-item-body";
        body.textContent = message.body || "";
        item.appendChild(body);

        const date = document.createElement("div");
        date.className = "modmsg-item-date";
        date.textContent = formatDate(message.created_at);
        item.appendChild(date);

        if ((message.message_type || "name_restriction") === "name_restriction") {
          const action = document.createElement("button");
          action.className = "modmsg-btn primary";
          action.type = "button";
          action.style.marginTop = "10px";
          action.textContent = "Odaberi novo ime";
          item.appendChild(action);

          const rename = document.createElement("div");
          rename.className = "modmsg-rename";
          rename.innerHTML = '<div class="modmsg-rename-row"><input class="modmsg-rename-input" maxlength="20" autocomplete="nickname" placeholder="Novo ime"><button class="modmsg-btn primary" type="button">Spremi</button></div><div class="modmsg-note"></div>';
          item.appendChild(rename);
          action.addEventListener("click", () => {
            rename.classList.add("open");
            rename.querySelector("input")?.focus();
          });
          rename.querySelector("button")?.addEventListener("click", () => resolveName(identity, rename.querySelector("input"), rename.querySelector(".modmsg-note")));
        }

        list.appendChild(item);

        if (!message.is_read) {
          try { await markRead(identity, message.id); } catch (_) {}
        }
      }

      await refreshUnread();
    } catch (error) {
      console.warn("Inbox nije učitan:", error);
      list.innerHTML = '<div class="modmsg-empty">Poruke trenutačno nisu dostupne.</div>';
    }
  }

  function boot() {
    ensureStyle();
    if (!ensureBubble()) {
      setTimeout(boot, 500);
      return;
    }
    ensureModal();
    void refreshUnread();
    setInterval(refreshUnread, 60000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
