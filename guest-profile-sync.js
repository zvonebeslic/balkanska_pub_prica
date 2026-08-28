(function () {
  "use strict";

  const GUEST_IDENTITY_KEY = "kviztogo_guest_identity_v1";
  const DAILY30_RESULTS_BASE_KEY = "kviztogo_daily30_results_v1";
  const hooks = new Map();
  let runningMerge = null;
  let runningSignature = "";

  function readGuestId() {
    try {
      const saved = JSON.parse(localStorage.getItem(GUEST_IDENTITY_KEY) || "null");
      return saved?.id ? String(saved.id) : null;
    } catch (_) {
      return null;
    }
  }

  function parseJson(value) {
    try {
      return { ok: true, value: JSON.parse(value) };
    } catch (_) {
      return { ok: false, value: null };
    }
  }

  function mergeStoredValues(guestRaw, userRaw) {
    if (userRaw == null) return guestRaw;
    if (guestRaw == null) return userRaw;

    const guest = parseJson(guestRaw);
    const user = parseJson(userRaw);

    if (
      guest.ok && user.ok &&
      guest.value && user.value &&
      typeof guest.value === "object" && !Array.isArray(guest.value) &&
      typeof user.value === "object" && !Array.isArray(user.value)
    ) {
      return JSON.stringify({ ...guest.value, ...user.value });
    }

    // Ako već postoji profilna vrijednost, ona ima prednost nad gostujućom.
    return userRaw;
  }

  function migrateScopedLocalStorage(guestId, userId) {
    if (!guestId || !userId) return 0;

    const guestToken = `:guest:${guestId}`;
    const userToken = `:user:${userId}`;
    const keys = [];

    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key || !key.startsWith("kviztogo_") || !key.includes(guestToken)) continue;
      keys.push(key);
    }

    let migrated = 0;
    for (const guestKey of keys) {
      const userKey = guestKey.replace(guestToken, userToken);
      if (userKey === guestKey) continue;

      try {
        const guestRaw = localStorage.getItem(guestKey);
        const userRaw = localStorage.getItem(userKey);
        const merged = mergeStoredValues(guestRaw, userRaw);
        if (merged != null) localStorage.setItem(userKey, merged);
        localStorage.removeItem(guestKey);
        migrated += 1;
      } catch (error) {
        console.warn("Guest podatak nije prenesen na profil:", guestKey, error);
      }
    }

    return migrated;
  }

  async function migrateDaily30({ client, guestId, userId }) {
    if (!client || !userId) return false;

    if (guestId) {
      const attached = await client.rpc("daily30_attach_guest_to_current_user", {
        p_guest_player_key: `guest:${guestId}`
      });
      if (attached.error) throw attached.error;
    }

    const mine = await client.rpc("daily30_get_my_results");
    if (mine.error) throw mine.error;

    if (mine.data && typeof mine.data === "object") {
      localStorage.setItem(
        `${DAILY30_RESULTS_BASE_KEY}:user:${userId}`,
        JSON.stringify(mine.data)
      );
    }

    return true;
  }

  hooks.set("daily30", migrateDaily30);

  function register(name, handler) {
    if (!name || typeof handler !== "function") return false;
    hooks.set(String(name), handler);
    return true;
  }

  async function runMerge(session, clientOverride) {
    const user = session?.user || null;
    const client = clientOverride || window.supabaseClient || null;
    if (!user || !client) return false;

    const guestId = readGuestId();
    const context = {
      client,
      session,
      user,
      userId: user.id,
      guestId
    };

    // 1. Automatski prenesi sve lokalne KvizToGo ključeve koji koriste
    //    standardni :guest:<id> / :user:<id> obrazac.
    if (guestId) migrateScopedLocalStorage(guestId, user.id);

    // 2. Pokreni posebne serverske migracije (Daily30 i buduće registrirane module).
    for (const [name, handler] of hooks) {
      try {
        await handler(context);
      } catch (error) {
        console.warn(`Guest → profil migracija nije uspjela (${name}):`, error);
      }
    }

    try {
      localStorage.setItem(
        "kviztogo_guest_profile_last_merge_v1",
        JSON.stringify({ guestId, userId: user.id, mergedAt: new Date().toISOString() })
      );
    } catch (_) {}

    return true;
  }

  async function merge(session, clientOverride) {
    const userId = session?.user?.id || "";
    const guestId = readGuestId() || "";
    const signature = `${userId}|${guestId}`;

    if (runningMerge && runningSignature === signature) return runningMerge;

    runningSignature = signature;
    runningMerge = runMerge(session, clientOverride).finally(() => {
      runningMerge = null;
      runningSignature = "";
    });
    return runningMerge;
  }

  window.KvizGuestProfileSync = {
    merge,
    register,
    migrateScopedLocalStorage
  };
})();
