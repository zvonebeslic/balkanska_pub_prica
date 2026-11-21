
(() => {
  "use strict";

  const API_URL = "https://hssfjguysejbosvholqu.supabase.co";
  const API_KEY = "sb_publishable_1wlZVov1csReXuZEgcuInA_7F7_gzIy";
  const R = 6371007.181, K = Math.sqrt(3) / 2; // sferna ekvivalentna projekcija; ćelija je ~1 m²
  const $ = (id) => document.getElementById(id);
  const client = window.supabase?.createClient(API_URL, API_KEY);
  let identity = null, current = null, kingdoms = [], cells = [], map = null, tilesLayer, borderLayer, labelsLayer, lifeLayer;
  let lifeEnabled = true;
  try { lifeEnabled = localStorage.getItem("kz_animated_world_v1") !== "off"; } catch (_) {}
  let mapLoading = false, mapRevision = 0, dialogQuiz = false;
  let cursor = null, cursorSpawnMode = false, previewLayer = null, blockGridLayer = null, previewBusy = false;
  const alignBlock = (x,y) => ({x: Math.floor(x/5)*5, y: Math.floor(y/4)*4});
  const previewCentre = b => ll(b.x+2.5,b.y+2);
  const BLOCK_AREA = 20;
  let realmCatalog = [];
  let toastTimer, refreshTimer;

  const safe = (v) => String(v ?? "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const formatArea = n => {
    n = Number(n) || 0;
    if (n < 1000000) return n.toLocaleString("hr-HR") + " m²";
    const whole = Math.floor(n / 1000000);
    const rest = n % 1000000;
    return whole.toLocaleString("hr-HR") + " km²" + (rest ? " i " + rest.toLocaleString("hr-HR") + " m²" : "");
  };
  const xy = (lat, lon) => ({
    x: Math.floor(R * K * lon * Math.PI / 180),
    y: Math.floor(R / K * Math.sin(lat * Math.PI / 180))
  });
  const ll = (x, y) => ({
    lat: Math.asin(Math.max(-1, Math.min(1, y * K / R))) * 180 / Math.PI,
    lng: x / (R * K) * 180 / Math.PI
  });
  const args = (extra = {}) => ({ p_guest_id: identity.id, p_guest_secret: identity.secret, ...extra });
  async function rpc(name, params = {}) {
    if (!client) throw Error("Supabase nije učitan. Osvježi stranicu.");
    const { data, error } = await client.rpc(name, params);
    if (error) throw Error(error.message || "Pogreška poslužitelja");
    return data;
  }
  function toast(message) {
    const node = $("toast");
    node.textContent = message;
    node.classList.add("on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.classList.remove("on"), 4500);
  }
  function toggleBusy(node, busy) {
    if (!node) return;
    node.disabled = !!busy;
  }
  function modal(title, body) {
    $("dialog").classList.remove("kz-quiz-dialog");
    $("dialog-title").textContent = title;
    $("dialog-body").innerHTML = body;
    $("dialog-backdrop").classList.remove("hidden");
  }
  function closeModal() {
    $("dialog").classList.remove("kz-quiz-dialog");
    if (dialogQuiz && current?.game) {
      // Neriješena pitanja ostaju spremljena i nastavljaju se pri povratku.
    }
    dialogQuiz = false;
    $("dialog-backdrop").classList.add("hidden");
    $("dialog-body").replaceChildren();
  }
  function dateTime(str) {
    return str ? new Date(str).toLocaleString("hr-HR", { dateStyle: "short", timeStyle: "short" }) : "—";
  }
  function getGuestIdentity() {
    let raw;
    try { raw = JSON.parse(localStorage.getItem("kviztogo_guest_identity_v1") || "null"); } catch (_) {}
    if (!raw?.id || !/^[0-9a-f-]{36}$/i.test(raw.id)) {
      const uuid = crypto.randomUUID();
      const suffix = uuid.replace(/-/g, "").slice(-8).toUpperCase();
      raw = { version: 1, id: uuid, createdAt: new Date().toISOString(),
        timestamp: String(Date.now()), suffix, displayName: "" };
      localStorage.setItem("kviztogo_guest_identity_v1", JSON.stringify(raw));
    }
    let cred;
    try { cred = JSON.parse(localStorage.getItem("kviztogo_guest_secret_v1") || "null"); } catch (_) {}
    if (!cred?.secret || !/^[a-f\d]{64}$/i.test(cred.secret) || cred.guestId !== raw.id) {
      const secret = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, "0")).join("");
      cred = { guestId: raw.id, secret };
      localStorage.setItem("kviztogo_guest_secret_v1", JSON.stringify(cred));
    }
    return { id: raw.id, secret: cred.secret, name: raw.displayName || "" };
  }
  async function prepareIdentity() {
    const guest = getGuestIdentity();
    const auth = await client.auth.getUser();
    let name = guest.name || "Kvizaš";
    if (auth.data?.user) {
      const u = auth.data.user;
      const profile = await client.from("profiles").select("username,full_name").eq("id", u.id).maybeSingle();
      name = profile?.data?.username || profile?.data?.full_name || u.user_metadata?.full_name ||
        u.user_metadata?.name || name;
      $("account-warning").classList.add("hidden");
    }
    await rpc("kz_identity", { p_guest_id: guest.id, p_guest_secret: guest.secret, p_name: name });
    identity = guest;
  }
  async function reloadState() {
    current = await rpc("kz_state", args());
    renderDashboard();
    return current;
  }
  function filterRealmCatalog() {
    const select = $("realm-choice");
    const query = $("realm-search").value.trim().toLocaleLowerCase("hr");
    const matching = query
      ? realmCatalog.filter(n => n.toLocaleLowerCase("hr").includes(query))
      : realmCatalog;
    const visible = matching.slice(0, 180);
    const previous = select.value;
    select.innerHTML = '<option value="">Odaberi ime…</option>' +
      visible.map(n => '<option value="' + safe(n) + '">' + safe(n) + '</option>').join("");
    if (visible.includes(previous)) select.value = previous;
    $("realm-found").textContent = matching.length
      ? "Prikazano " + visible.length + " od " + matching.length +
        " dostupnih naziva" + (matching.length > visible.length ? " — pretraži za više." : ".")
      : "Nema imena za taj pojam. Pokušaj drugu riječ.";
  }
  async function reloadCatalog() {
    const names = await rpc("kz_catalog");
    realmCatalog = Array.isArray(names) ? names : [];
    filterRealmCatalog();
  }
  function renderDashboard() {
    const k = current?.kingdom;
    const isKing = k?.role === "kralj";
    $("realm-name").textContent = k?.name || "Još nemaš kraljevstvo";
    $("realm-area").textContent = formatArea(k?.area);
    $("realm-role").textContent = k ? roleName(k.role) : "Osnuj svoje ili zatraži pristup na karti";
    $("members-total").textContent = (current?.members?.length || 0) + " / 5";
    $("bank-count").textContent = formatArea(k?.bank);
    $("bank-count").style.color = k?.bank >= 20 ? "#91f0ad" : "";
    $("boost-caption").textContent = k?.area >= 500 ? "⚡ BOOST UKLJUČEN · Pravila" : "Boost se uključuje na 500 m²";
    $("create-panel").classList.toggle("hidden", !!k);
    $("spawn-btn").classList.toggle("hidden", !isKing);
    $("joystick-panel").classList.toggle("hidden", !isKing);
    $("spawn-btn").textContent = (Number(k?.area) || 0) === 0 ? "♜ Prvi blok" : "♜ Novo uporište";
    $("spawn-btn").title = (Number(k?.area) || 0) === 0 ?
      "Odaberi početni blok u središtu karte" : "Odaberi novo udaljeno uporište u središtu karte";
    $("spawn-btn").disabled = !isKing;
    $("choose-map-center").disabled = !isKing;
    if (isKing && !cursor && k.anchor_x != null) {
      const point = alignBlock(Number(k.anchor_x),Number(k.anchor_y));
      cursor = {x:point.x+5,y:point.y};
    }
    if (!isKing) { cursor = null; cursorSpawnMode = false; }
    if (isKing) updateCursorPreview();
    $("leave-btn").classList.toggle("hidden", !k);
    $("leave-btn").textContent = isKing ? "Predaj krunu / Zatvori kraljevstvo" : "Napusti kraljevstvo";
    $("action-help").textContent = isKing ?
      "Pomakni stvarnu kartu gdje želiš, klikni „Odaberi mjesto” i joystickom postavi blok od 20 m²." :
      k ? "Prikupljaš kvadrate znanja za zajednički konto. Kralj raspoređuje teritorij." :
      "Osnuj kraljevstvo ili dodirni drugo kraljevstvo na karti i zatraži članstvo.";
    renderRequests();
    renderMail();
    tick();
  }
  function roleName(role) {
    return role === "kralj" ? "Kralj kvizaš" : role === "vojvoda" ? "Vojvoda kvizaš" : "Vojnik kvizaš";
  }
  function tick() {
    if (!current) return;
    const game = current.game;
    const end = new Date(current.player?.cooldown_until || 0).getTime();
    const wait = Math.max(0, end - Date.now());
    const ready = !!current.kingdom && (game || wait === 0);
    $("ready-pill").classList.toggle("on", !!ready);
    $("ready-pill").textContent = game ? "U TIJEKU" : ready ? "SPREMNO" : "ČEKANJE";
    $("play-btn").disabled = !ready;
    $("play-btn").textContent = game ? "Nastavi 10 ABC pitanja" : "Pokreni 10 ABC pitanja";
    const hh = String(Math.floor(wait / 3600000)).padStart(2, "0");
    const mm = String(Math.floor(wait % 3600000 / 60000)).padStart(2, "0");
    const ss = String(Math.floor(wait % 60000 / 1000)).padStart(2, "0");
    $("cooldown").textContent = !current.kingdom ? "Najprije pronađi kraljevstvo." :
      game ? "Igra je započeta — dovrši preostala pitanja." :
      wait ? "Nova pitanja za " + hh + ":" + mm + ":" + ss :
      "Pitanja su spremna. Novo odbrojavanje počinje tek nakon svih 10 odgovora.";
  }
  async function reloadMap() {
    if (!map) return;
    const rev = ++mapRevision;
    mapLoading = true;
    const bounds = map.getBounds();
    let params = {};
    if (map.getZoom() >= 18) {
      const lo = xy(bounds.getSouth(), bounds.getWest());
      const hi = xy(bounds.getNorth(), bounds.getEast());
      params = { p_min_x: Math.min(lo.x,hi.x), p_max_x: Math.max(lo.x,hi.x),
        p_min_y: Math.min(lo.y,hi.y), p_max_y: Math.max(lo.y,hi.y) };
    }
    try {
      const data = await rpc("kz_map", params);
      if (rev !== mapRevision) return;
      kingdoms = data.kingdoms || [];
      cells = data.cells || [];
      drawMap();
    } catch (error) {
      if (rev === mapRevision) toast(error.message);
    } finally { if (rev === mapRevision) mapLoading = false; }
  }
  function cellOwner(x,y) {
    return cells.find(c => Number(c.x) === x && Number(c.y) === y)?.k || null;
  }

  // Položaj naziva određuje se IZ STVARNIH ćelija teritorija, a ne iz osnivačke GPS točke.
  // Za svako kraljevstvo pronalazi se najdulji vodoravni pojas sa sigurnom marginom
  // iznad i ispod slova. Time ime ostaje unutar zemlje i pri nepravilnim oblicima.
  function drawTerritoryLabels(grid, byId) {
    const zoom = map.getZoom();
    const pxPerMetre = 256 * Math.pow(2,zoom) / (2*Math.PI*R);
    const owners = new Map();
    for (const c of cells) {
      if (!owners.has(c.k)) owners.set(c.k, []);
      owners.get(c.k).push([Number(c.x),Number(c.y)]);
    }
    for (const [id, positions] of owners) {
      const kingdom = byId.get(id);
      if (!kingdom || !positions.length) continue;
      const total = Math.max(1, Number(kingdom.area) || positions.length);
      // Stvarna površina određuje stil; vidljiva geometrija ograničava širinu.
      const size = Math.min(34, Math.max(8, 7 + 4.1*Math.log10(total)));
      const letter = Math.min(7, Math.max(.3, .5 + 1.4*Math.log10(total)));
      const lines = new Map();
      for (const [x,y] of positions) {
        if (!lines.has(y)) lines.set(y, []);
        lines.get(y).push(x);
      }
      let best = null;
      for (const [y,row] of lines) {
        row.sort((a,b)=>a-b);
        let start = row[0], end = row[0];
        const evaluate = (a,b) => {
          const width = b-a+1;
          if (width<2) return;
          const cx = Math.floor((a+b)/2);
          // Vertikalni prostor za dvosmjerno iscrtavanje slova.
          let top = 0, bottom = 0;
          while (top<24 && grid.get(cx+":"+(y+top+1)) === id) top++;
          while (bottom<24 && grid.get(cx+":"+(y-bottom-1)) === id) bottom++;
          const room = Math.min(top,bottom);
          const score = width * Math.min(1,(room+1)/2) + Math.min(top,bottom)*1.8;
          if (!best || score>best.score) best={x:cx,y,width,room,score};
        };
        for (let i=1;i<row.length;i++) {
          if (row[i]===end+1) end=row[i];
          else {evaluate(start,end);start=end=row[i];}
        }
        evaluate(start,end);
      }
      if (!best) continue;
      const widthPx = Math.max(0,(best.width-1.4)*pxPerMetre);
      const heightPx = Math.max(0,(best.room*2+1)*pxPerMetre);
      const actualFont = Math.min(size, Math.max(7,heightPx*.56));
      // Tekst se samostalno sužava, ali ga nikad ne širimo izvan granica.
      const length = [...kingdom.name].length;
      const measured = length*(actualFont*.63+letter);
      const scale = Math.min(1.35, widthPx / Math.max(1,measured));
      if (actualFont < 7 || scale < .36 || widthPx < 22 || heightPx < 9) continue;
      const center = ll(best.x+.5,best.y+.5);
      const label = '<div class="territory-ink" style="--kingdom-ink:' + safe(kingdom.color) +
        ';--ink-size:' + actualFont.toFixed(2) + 'px;--ink-space:' + letter.toFixed(2) +
        'px;--ink-scale:' + scale.toFixed(3) + ';max-width:' + Math.floor(widthPx) +
        'px" title="' + safe(kingdom.name) + '"><span>' + safe(kingdom.name) + '</span></div>';
      L.marker([center.lat,center.lng],{
        icon:L.divIcon({className:"territory-ink-holder",html:label,iconSize:[1,1],iconAnchor:[0,0]}),
        keyboard:false,zIndexOffset:700
      }).on("click",()=>showKingdom(kingdom)).addTo(labelsLayer);
    }
  }


  // Ručno crtani, originalni SVG likovi, bez vanjskih animacijskih biblioteka.
  // Ovaj sloj je samo dekoracija i ne sudjeluje u osvajanjima ili GPS-u.
  const lifeSprites = {
    dragon: '<svg viewBox="0 0 110 104" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'+
      '<ellipse cx="54" cy="95" rx="32" ry="6" fill="#061723" opacity=".35"/>'+
      '<g class="life-wing life-wing-left"><path d="M53 43Q19 3 5 30L2 52Q19 39 23 62L44 60Z" fill="#24a99b" stroke="#0b4e50" stroke-width="3"/><path d="M50 44L8 32M43 59L22 50" stroke="#a5f9ba" stroke-width="2" fill="none"/></g>'+
      '<g class="life-wing life-wing-right"><path d="M62 40Q92 2 108 26L107 55Q93 39 90 61L66 59Z" fill="#249b92" stroke="#0a4a4b" stroke-width="3"/><path d="M65 44L100 29M67 58L93 47" stroke="#91e6b1" stroke-width="2" fill="none"/></g>'+
      '<path d="M40 68Q13 84 26 94Q8 95 12 82Q14 60 43 56Z" fill="#0e9e75" stroke="#07564b" stroke-width="3"/>'+
      '<ellipse cx="56" cy="64" rx="29" ry="30" fill="#1cbb81" stroke="#065e53" stroke-width="3"/>'+
      '<ellipse cx="60" cy="73" rx="15" ry="18" fill="#b8f0ab"/>'+
      '<path d="M33 43L26 23L45 35L53 20L65 38L83 24L82 46" fill="#e7b75a" stroke="#9e7532" stroke-width="2"/>'+
      '<ellipse cx="57" cy="43" rx="26" ry="22" fill="#2ed79a" stroke="#07534a" stroke-width="3"/>'+
      '<ellipse cx="69" cy="47" rx="18" ry="12" fill="#28c58d"/>'+
      '<circle cx="49" cy="41" r="6" fill="#f2fff1"/><circle cx="51" cy="41" r="3" fill="#102a33"/>'+
      '<circle cx="76" cy="49" r="2.5" fill="#0b6358"/><path d="M80 55q-7 7-15 0" stroke="#084f48" stroke-width="2.5" fill="none"/>'+
      '<path d="M39 86l-10 9 14-2M70 87l5 8 12-3" stroke="#064e49" stroke-width="5" stroke-linecap="round" fill="none"/>'+
      '<g class="life-flame"><path d="M91 52Q111 43 103 61Q111 57 107 71Q89 70 85 62Z" fill="#f7b84c" stroke="#e77e29" stroke-width="2"/><path d="M97 56q12 5 5 13" fill="#ffed9a"/></g>'+
      '</svg>',
    knight: '<svg viewBox="0 0 100 112" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'+
      '<ellipse cx="53" cy="103" rx="30" ry="6" fill="#071323" opacity=".4"/>'+
      '<path class="life-cape" d="M31 47Q7 56 23 97L55 90L72 55Z" fill="#195f94" stroke="#0c335f" stroke-width="3"/>'+
      '<g class="life-leg life-leg-left"><path d="M39 82L35 98L26 102" stroke="#abbccd" stroke-width="11" stroke-linecap="round" fill="none"/><path d="M23 101h18" stroke="#19263e" stroke-width="9" stroke-linecap="round"/></g>'+
      '<g class="life-leg life-leg-right"><path d="M61 83L66 98L79 100" stroke="#aab9c9" stroke-width="11" stroke-linecap="round" fill="none"/><path d="M62 102h21" stroke="#19263e" stroke-width="9" stroke-linecap="round"/></g>'+
      '<rect x="31" y="47" width="40" height="43" rx="13" fill="#b4cbd6" stroke="#345671" stroke-width="3"/>'+
      '<path d="M41 53L61 53L64 86L40 86Z" fill="#5d87a0"/><path d="M51 56v23M43 69h16" stroke="#e9d18d" stroke-width="5"/>'+
      '<g class="life-sword"><path d="M75 46L92 12" stroke="#d7eaff" stroke-width="5"/><path d="M85 33l-15-7" stroke="#e9bd64" stroke-width="5" stroke-linecap="round"/><path d="M75 43l-10 22" stroke="#d8dde4" stroke-width="9" stroke-linecap="round"/></g>'+
      '<path d="M31 51l-12 15" stroke="#c4d4dc" stroke-width="11" stroke-linecap="round"/>'+
      '<path d="M16 55q-14 12 6 29q18-12 10-25Z" fill="#e4c675" stroke="#6b5b3b" stroke-width="3"/>'+
      '<path d="M27 32q-2-24 23-25q26 0 24 25l-3 19H32Z" fill="#c0d1dc" stroke="#3f5e70" stroke-width="3"/>'+
      '<path d="M43 15L48 2L55 16" fill="#e9bd61" stroke="#9f753d" stroke-width="2"/>'+
      '<path d="M31 28L71 28L67 44L35 44Z" fill="#466b7e"/><path d="M40 34h23" stroke="#102e3b" stroke-width="7" stroke-linecap="round"/>'+
      '<circle cx="45" cy="34" r="2" fill="#e3f9ff"/><circle cx="57" cy="34" r="2" fill="#e3f9ff"/>'+
      '</svg>',
    owl: '<svg viewBox="0 0 105 111" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'+
      '<ellipse cx="54" cy="101" rx="27" ry="6" fill="#091c1d" opacity=".36"/>'+
      '<path d="M18 95h71" stroke="#6e4e36" stroke-width="8" stroke-linecap="round"/>'+
      '<path d="M30 39L27 15L46 26L55 15L70 26L86 14L83 44" fill="#a65e36" stroke="#65391e" stroke-width="3"/>'+
      '<ellipse cx="56" cy="61" rx="35" ry="39" fill="#ab6a3f" stroke="#6a4429" stroke-width="3"/>'+
      '<ellipse cx="55" cy="69" rx="25" ry="26" fill="#e5b779"/>'+
      '<g class="life-owl-wing-left"><path d="M27 53Q2 44 16 84Q29 94 34 70Z" fill="#825033" stroke="#663b29" stroke-width="2"/></g>'+
      '<g class="life-owl-wing-right"><path d="M79 53Q102 45 93 83Q81 95 76 70Z" fill="#825033" stroke="#663b29" stroke-width="2"/></g>'+
      '<ellipse cx="43" cy="46" rx="17" ry="19" fill="#fff0cf"/><ellipse cx="68" cy="46" rx="17" ry="19" fill="#fff0cf"/>'+
      '<g class="life-blink"><circle cx="44" cy="48" r="7" fill="#2f483f"/><circle cx="68" cy="48" r="7" fill="#2f483f"/><circle cx="46" cy="45" r="2.5" fill="#fff"/><circle cx="70" cy="45" r="2.5" fill="#fff"/></g>'+
      '<path d="M50 57l6 10l7-10Z" fill="#edba57" stroke="#8b673b" stroke-width="2"/>'+
      '<path d="M43 92v9M68 92v9" stroke="#d1a54d" stroke-width="5"/>'+
      '</svg>',
    wizard: '<svg viewBox="0 0 102 113" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'+
      '<ellipse cx="49" cy="105" rx="30" ry="6" fill="#071420" opacity=".3"/>'+
      '<path d="M27 55Q19 74 14 100L86 100Q71 65 70 55" fill="#745cb7" stroke="#453576" stroke-width="3"/>'+
      '<path d="M48 55v43" stroke="#ead2a0" stroke-width="4"/><path d="M21 94h58" stroke="#b292d7" stroke-width="3"/>'+
      '<path class="life-wizard-arm" d="M67 63L82 50" stroke="#a77acc" stroke-width="13" stroke-linecap="round"/>'+
      '<path d="M84 48L88 6" stroke="#7b5537" stroke-width="5" stroke-linecap="round"/>'+
      '<path class="life-star" d="M88 3l4 9l10 4l-10 4l-4 9l-4-9l-10-4l10-4Z" fill="#fcdf88" stroke="#d6a541" stroke-width="1.5"/>'+
      '<circle cx="49" cy="41" r="24" fill="#f3cfaa" stroke="#9c6851" stroke-width="3"/>'+
      '<path d="M32 47Q27 83 49 85Q69 79 68 46Q61 61 51 55Q39 63 32 47Z" fill="#f3f3f5" stroke="#a8c6df" stroke-width="2"/>'+
      '<circle cx="40" cy="43" r="3" fill="#27313d"/><circle cx="57" cy="43" r="3" fill="#27313d"/>'+
      '<path d="M40 53q9 5 16 0" stroke="#9c6650" stroke-width="2" fill="none"/>'+
      '<path d="M17 36Q38 6 51 -1Q68 3 81 35Z" fill="#553a9c" stroke="#d3b4f5" stroke-width="3"/>'+
      '<ellipse cx="49" cy="34" rx="38" ry="8" fill="#7d5ac9" stroke="#d3b4f5" stroke-width="3"/>'+
      '<circle cx="54" cy="21" r="5" fill="#f5d37b"/>'+
      '</svg>',
    banner: '<svg viewBox="0 0 76 101" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'+
      '<ellipse cx="37" cy="94" rx="24" ry="5" fill="#05111b" opacity=".3"/>'+
      '<path d="M17 91V7" stroke="#d9bc79" stroke-width="6" stroke-linecap="round"/>'+
      '<path class="life-flag" d="M21 12Q43 2 62 15L72 38Q43 33 21 45Z" fill="var(--life-color,#49d99e)" stroke="#f7dea8" stroke-width="3"/>'+
      '<path d="M25 23L34 20L42 23L42 33L34 40L26 34Z" fill="#f6e7b9" stroke="#846638" stroke-width="1.2"/>'+
      '<path d="M34 22v13M28 28h12" stroke="#bb8e40" stroke-width="2"/>'+
      '<path d="M7 93h25" stroke="#d9bc79" stroke-width="6" stroke-linecap="round"/>'+
      '<circle cx="17" cy="5" r="5" fill="#efd78b"/>'+
      '</svg>'
  };

  function lifeMarker(kind, latitudeLongitude, color) {
    const art=lifeSprites[kind];
    if(!art || !lifeLayer)return;
    const html='<span class="kz-life-figure kz-life-'+kind+
      '" style="--life-color:'+safe(color||"#48ddb0")+'">'+
      '<span class="kz-life-motion">'+art+'</span></span>';
    return L.marker(latitudeLongitude,{
      icon:L.divIcon({className:"kz-life-marker",html,iconSize:[1,1],iconAnchor:[0,0]}),
      interactive:false,keyboard:false,zIndexOffset:820
    }).addTo(lifeLayer);
  }
  function paintLivingWorld() {
    if(!lifeLayer || !map)return;
    lifeLayer.clearLayers();
    if(!lifeEnabled)return;
    const zoom=map.getZoom();
    const size=map.getSize();
    const isSmall=size.x<420;
    // Likovi se prikazuju na malom broju položaja u vidljivom dijelu karte.
    // Na velikom zumu ne predstavljaju stvarne objekte na tim koordinatama.
    const scenes=[
      ["dragon",.77,.33],
      ["knight",.71,.73],
      ["owl",.22,.47],
      ["wizard",.40,.72]
    ];
    let count=zoom>=18?(isSmall?2:3):isSmall?3:4;
    if(zoom<=3)count=Math.min(count,2);
    for(const [kind,x,y] of scenes.slice(0,count)){
      const pt=L.point(size.x*x,size.y*y);
      const location=map.containerPointToLatLng(pt);
      lifeMarker(kind,location);
    }
    // Kraljevske zastave vezane su uz stvarne koordinate postojećeg teritorija.
    if(zoom<=17){
      let flags=0;
      const viewport=map.getBounds();
      for(const k of kingdoms){
        if(flags>=5)break;
        if(!k.anchor_x && k.anchor_x!==0 || k.anchor_y==null || Number(k.area)<20)continue;
        const point=ll(Number(k.anchor_x),Number(k.anchor_y));
        if(!viewport.contains([point.lat,point.lng]))continue;
        lifeMarker("banner",[point.lat,point.lng],k.color);
        flags++;
      }
    }
  }
  function toggleLivingWorld() {
    lifeEnabled=!lifeEnabled;
    try{localStorage.setItem("kz_animated_world_v1",lifeEnabled?"on":"off");}catch(_){}
    const btn=$("map-life-toggle");
    if(btn){
      btn.textContent=lifeEnabled?"🐉 Živi svijet: UKLJ.":"🐉 Živi svijet: ISKLJ.";
      btn.setAttribute("aria-pressed",String(lifeEnabled));
      btn.title=lifeEnabled?"Isključi animirane likove":"Uključi animirane likove";
    }
    paintLivingWorld();
  }

  function drawMap() {
    labelsLayer.clearLayers();
    borderLayer.clearLayers();
    if (blockGridLayer) blockGridLayer.clearLayers();
    tilesLayer.clearLayers();
    const own = current?.kingdom?.id;
    const detailed = map.getZoom() >= 18;
    const byId = new Map(kingdoms.map(k => [k.id,k]));

    if (!detailed) {
      // Na regionalnom prikazu stvarni kvadrat od 1 m² ne može biti čitljiv:
      // čuva se precizna oznaka položaja bez glumljenja većeg teritorija.
      for (const k of kingdoms) {
        if (k.anchor_x == null || k.anchor_y == null || Number(k.area) < 1) continue;
        const center = ll(Number(k.anchor_x), Number(k.anchor_y));
        L.circleMarker([center.lat, center.lng], {
          radius: 8.5, color: "#e9c77b", weight: 3.2, fillColor: k.color,
          fillOpacity: 0.96, renderer: map._kzCanvasRenderer
        }).on("click", () => showKingdom(k)).addTo(labelsLayer);
        L.marker([center.lat, center.lng], {
          icon: L.divIcon({
            className: "realm-map-pin",
            html: '<span style="--realm-color:' + safe(k.color) + '">♛ '+ safe(k.name) + '</span>',
            iconSize: [1,1], iconAnchor: [0,0]
          })
        }).on("click", () => showKingdom(k)).addTo(labelsLayer);
      }
    }

    if (detailed) {
      const grid = new Map(cells.map(c => [Number(c.x)+":"+Number(c.y), c.k]));
      // Obrisi se skupljaju u duge, spojene odsječke; nema debelih unutarnjih crta.
      const outline = new Map();
      const edge = (owner, axis, fixed, variable) => {
        const key = owner + "|" + axis + "|" + fixed;
        if (!outline.has(key)) outline.set(key, []);
        outline.get(key).push(variable);
      };
      for (const c of cells) {
        const x = Number(c.x), y = Number(c.y), k = byId.get(c.k);
        if (!k) continue;
        const sw = ll(x,y), ne = ll(x+1,y+1);
        L.rectangle([[sw.lat,sw.lng],[ne.lat,ne.lng]], {
          stroke: false, fillColor: k.color, fillOpacity: 0.58,
          interactive: true, renderer: map._kzCanvasRenderer
        }).on("click", event => {
          L.DomEvent.stopPropagation(event);
          showKingdom(k); // Karta služi samo za pregled; pomicanje i osvajanje su na joysticku.
        }).addTo(tilesLayer);

        if (grid.get((x-1)+":"+y) !== c.k) edge(c.k,"V",x,y);
        if (grid.get((x+1)+":"+y) !== c.k) edge(c.k,"V",x+1,y);
        if (grid.get(x+":"+(y-1)) !== c.k) edge(c.k,"H",y,x);
        if (grid.get(x+":"+(y+1)) !== c.k) edge(c.k,"H",y+1,x);
      }
      drawTerritoryLabels(grid, byId);
      for (const [key, offsets] of outline) {
        const [id, axis, fixedStr] = key.split("|");
        const k = byId.get(id);
        if (!k) continue;
        const fixed = Number(fixedStr);
        const sorted = [...new Set(offsets)].sort((a,b) => a-b);
        if (!sorted.length) continue;
        let begin = sorted[0], last = begin;
        const paint = (a,b) => {
          const points = axis === "H"
            ? [ll(a,fixed),ll(b+1,fixed)]
            : [ll(fixed,a),ll(fixed,b+1)];
          // Zlatna kartografska granica, suptilan sjaj u boji kraljevstva.
          for (const [color,weight,opacity] of [[k.color,12,.23],["#071622",8.7,1],["#e6c981",5.2,.96],[k.color,3.1,1]]) {
            L.polyline(points,{color,weight,opacity,interactive:false,
              lineCap:"round",lineJoin:"round",renderer:map._kzCanvasRenderer}).addTo(borderLayer);
          }
        };
        for (let i=1;i<sorted.length;i++) {
          if (sorted[i] === last+1) last=sorted[i];
          else { paint(begin,last); begin=last=sorted[i]; }
        }
        paint(begin,last);
      }
    }
    if(detailed)drawBlockGrid();
    updateCursorPreview();
    paintLivingWorld();
    $("map-hint").textContent = detailed
      ? "Fantasy granice na pravoj karti · 20 m² po bloku · POSTAVI u joysticku."
      : "Pomakni kartu na željeno područje i klikni „Odaberi mjesto”. GPS nije potreban.";
    $("map-count").textContent = kingdoms.length + " kraljevstava · " +
      (detailed ? cells.length + " m² u prikazu · bijelo obrubljeni rubovi su granice" :
      "obojene oznake prikazuju položaj; uvećaj na 18+ za stvarne granice");
  }
  function initMap() {
    if (!window.L) throw Error("Karta Leaflet nije učitana");
    map = L.map("kingdom-map",{zoomControl:true,worldCopyJump:false}).setView([43.5,17.3],7);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      minZoom:2,maxZoom:22,maxNativeZoom:19,attribution:'&copy; OpenStreetMap'
    }).addTo(map);
    map._kzCanvasRenderer = L.canvas({ padding: .1 });
    tilesLayer = L.layerGroup().addTo(map);
    blockGridLayer = L.layerGroup().addTo(map);
    borderLayer = L.layerGroup().addTo(map);
    labelsLayer = L.layerGroup().addTo(map);
    previewLayer = L.layerGroup().addTo(map);
    lifeLayer = L.layerGroup().addTo(map);
    let timer;
    map.on("moveend zoomend", () => {
      clearTimeout(timer);
      timer=setTimeout(reloadMap,240);
    });
    map.on("click",() => {});
    reloadMap();
  }
  function showKingdom(k) {
    const mine = current?.kingdom?.id === k.id;
    const request = !current?.kingdom && !mine;
    modal(k.name, '<p><b style="color:' + safe(k.color) + '">●</b> ' +
      formatArea(k.area) + ' · ' + Number(k.members) + '/5 članova</p>' +
      '<p>Svaki član doprinosi znanjem, a kralj kvizaš određuje gdje će se kraljevstvo širiti.</p>' +
      (request ? '<button id="request-join" class="primary">Zatraži učlanjenje</button>' :
      mine ? '<button id="zoom-realm" class="primary">Prikaži moje granice</button>' : '<p>Već si član drugog kraljevstva.</p>'));
    $("request-join")?.addEventListener("click",async () => {
      try {
        await rpc("kz_apply",args({p_kingdom:k.id}));
        toast("Zahtjev je poslan kralju kvizašu.");
        closeModal();
      } catch(e){toast(e.message);}
    });
    $("zoom-realm")?.addEventListener("click",() => {
      closeModal();
      if (k.anchor_x != null) {
        const center=ll(Number(k.anchor_x),Number(k.anchor_y));
        map.setView([center.lat,center.lng],20);
      }
    });
  }

  // Zemljopisni položaj određuje se na vidljivoj karti (bez GPS dozvole).
  function chooseMapCentre(remote=false) {
    if (current?.kingdom?.role !== "kralj") return toast("Samo kralj može postavljati blokove.");
    const centre=map.getCenter();
    const projected=xy(centre.lat,centre.lng);
    cursor=alignBlock(projected.x,projected.y);
    cursorSpawnMode=remote || Number(current.kingdom.area||0)===0;
    if (map.getZoom()<19) map.setView(previewCentre(cursor),20);
    else map.panTo(previewCentre(cursor));
    updateCursorPreview();
    toast(cursorSpawnMode ? "Odabrano uporište. Strelicama namjesti blok pa pritisni POSTAVI." :
      "Odabrano središte karte. Novi blok mora dodirivati tvoju granicu.");
  }
  // Mreža je globalno poravnata: svaka pločica uvijek zauzima 5 × 4 = 20 m².
  function drawBlockGrid(grid) {
    if (!blockGridLayer || map.getZoom()<19) return;
    const bounds=map.getBounds();
    const sw=xy(bounds.getSouth(),bounds.getWest()),ne=xy(bounds.getNorth(),bounds.getEast());
    const left=Math.floor(Math.min(sw.x,ne.x)/5)*5;
    const right=Math.floor(Math.max(sw.x,ne.x)/5)*5;
    const bottom=Math.floor(Math.min(sw.y,ne.y)/4)*4;
    const top=Math.floor(Math.max(sw.y,ne.y)/4)*4;
    const estimated=(Math.floor((right-left)/5)+1)*(Math.floor((top-bottom)/4)+1);
    // Ne stvaraj tisuće DOM/Canvas elemenata pri malom zumiranju.
    if(estimated>950)return;
    for(let x=left;x<=right;x+=5)for(let y=bottom;y<=top;y+=4) {
      const corner=ll(x,y),other=ll(x+5,y+4);
      L.rectangle([[corner.lat,corner.lng],[other.lat,other.lng]],{
        color:"#e8d29c",weight:.85,opacity:.45,fill:false,interactive:false,
        renderer:map._kzCanvasRenderer
      }).addTo(blockGridLayer);
    }
  }
  function blockStatus(b) {
    if(!b)return {text:"Pomakni kartu i odaberi mjesto.",kind:"unknown"};
    const nearby = cells.filter(c=>Number(c.x)>=b.x&&Number(c.x)<b.x+5&&Number(c.y)>=b.y&&Number(c.y)<b.y+4);
    const owners = [...new Set(nearby.map(c=>c.k))];
    const own = current?.kingdom?.id;
    if(owners.includes(own))return {text:"Ovdje već imaš teritorij — pomakni blok.",kind:"own"};
    if(owners.length>1 || (owners.length&&nearby.length<20))
      return {text:"Djelomično zauzet stari blok — nedostupan.",kind:"blocked"};
    const touching=cells.some(c=>{
      if(c.k!==own)return false;
      const x=Number(c.x),y=Number(c.y);
      return (x===b.x-1&&y>=b.y&&y<=b.y+3) ||
        (x===b.x+5&&y>=b.y&&y<=b.y+3) ||
        (y===b.y-1&&x>=b.x&&x<=b.x+4) ||
        (y===b.y+4&&x>=b.x&&x<=b.x+4);
    });
    // Uporišta mogu biti udaljena, napadi ne mogu preskakati obranu.
    if(owners.length===1 && !touching)
      return {text:"Za napad se mora dodirivati tvoje kraljevstvo.",kind:"unconnected"};
    if(Number(current?.kingdom?.area||0)>0&&!cursorSpawnMode&&!touching)
      return {text:"Odaberi Novo uporište za udaljeno područje.",kind:"unconnected"};
    if(owners.length===1)return {text:"⚔ NAPAD: suparnički blok 20 m², cijena 40 m².",kind:"attack"};
    return {text:"Slobodan blok 20 m², cijena 20 m².",kind:"free"};
  }
  function updateCursorPreview() {
    if (!map || !previewLayer) return;
    previewLayer.clearLayers();
    const btn=$("claim-block");
    const label=$("cursor-status");
    const isKing=current?.kingdom?.role==="kralj";
    if(!isKing || !cursor) {
      if(label)label.textContent=isKing?"Odaberi mjesto na karti.":"";
      if(btn)btn.disabled=true;
      return;
    }
    const status=blockStatus(cursor);
    const bank=Number(current?.kingdom?.bank||0);
    const cost=status.kind==="attack"?40:20;
    const valid=["free","attack"].includes(status.kind)&&bank>=cost;
    if(label)label.textContent=status.kind==="attack"?"⚔ Napad · 40 m²":
      status.kind==="free"?"Slobodan blok · 20 m²":
      status.kind==="own"?"Već osvojeno":status.kind==="unconnected"?"⚠ Nije uz granicu":"Blok je zauzet";
    if(label && bank<cost)label.textContent="Nedovoljno m² na kontu";
    if(btn) {
      btn.disabled=!valid;
      btn.textContent="POSTAVI";
      btn.title=status.kind==="attack"?"Napad: potroši 40 m² za suparnički blok od 20 m²":"Zauzmi slobodni blok od 20 m² za 20 m²";
      btn.setAttribute("aria-label",btn.title);
    }
    const sw=ll(cursor.x,cursor.y),ne=ll(cursor.x+5,cursor.y+4);
    L.rectangle([[sw.lat,sw.lng],[ne.lat,ne.lng]],{
      color:valid?"#d3ffda":"#ffcf83",weight:4.3,
      fillColor:valid?"#34ed9d":"#ff9e6d",fillOpacity:.44,
      dashArray:valid?"8 4":"4 6",interactive:false
    }).addTo(previewLayer);
    L.marker(previewCentre(cursor),{interactive:false,
      icon:L.divIcon({className:"cursor-badge",html:"<b>♜ 20 m²</b>",iconSize:[70,26],iconAnchor:[35,13]})
    }).addTo(previewLayer);
    $("cursor-coords").textContent=cursor.x+" · "+cursor.y;
  }

  function moveCursor(direction) {
    if(current?.kingdom?.role!=="kralj")return;
    if(!cursor){ chooseMapCentre(false);if(!cursor)return; }
    const dir={N:[0,4],S:[0,-4],E:[5,0],W:[-5,0]}[direction];
    if(!dir)return;
    cursor={x:cursor.x+dir[0],y:cursor.y+dir[1]};
    map.setView(previewCentre(cursor),Math.max(map.getZoom(),19));
    updateCursorPreview();
  }
  function placeSpawn(){chooseMapCentre(true);}
  async function saveBlock() {
    if(!cursor || previewBusy ||current?.kingdom?.role!=="kralj")return;
    const status=blockStatus(cursor);
    const cost=status.kind==="attack"?40:20;
    if(!["free","attack"].includes(status.kind)||Number(current.kingdom.bank)<cost)
      return toast("Odabrani blok nije moguće zauzeti.");
    const question=status.kind==="attack"?"Napasti i preuzeti cijeli suparnički blok od 20 m² za 40 m² s konta?":
      "Zauzeti odabrani blok od 20 m² za 20 m² s konta?";
    if(!confirm(question))return;
    previewBusy=true;$("claim-block").disabled=true;
    try{
      const params={p_x:cursor.x,p_y:cursor.y,p_spawn:cursorSpawnMode||Number(current.kingdom.area||0)===0};
      const result=await rpc("kz_place_block",args(params));
      cursorSpawnMode=false;
      cursor={x:cursor.x+5,y:cursor.y};
      toast((result.attack?"⚔ Osvojen tuđi blok! ":"✓ Osvojen novi blok! ")+
        formatArea(result.added)+" · trošak "+formatArea(result.spent));
      await reloadState();await reloadMap();
    }catch(e){toast(e.message);}
    finally{previewBusy=false;updateCursorPreview();}
  }

  // Isti obrasci povijesti, reakcija i primjedbi kao u glavnom Online kvizu.
  function answerLabel(q,key) {
    return key && q?.options ? (q.options[key] || key) : "—";
  }
  function completedPart(questions,game) {
    const correct=questions.filter(q=>q.correct).length;
    const earned=questions.reduce((sum,q)=>sum+Number(q.earned||0),0);
    modal("Rezultati & povijest",'<div class="kz-final-score"><strong>'+correct+' / '+questions.length+
      '</strong><span>točnih odgovora</span><b>+'+formatArea(earned)+'</b></div>'+
      '<p>Sljedećih 10 pitanja dostupno je četiri sata nakon završetka ove partije.</p>'+
      '<div class="kz-quiz-actions"><button class="secondary" id="kz-share-result">📤 Podijeli rezultat</button>'+
      '<button class="secondary" id="kz-download-history">📥 Preuzmi povijest PNG</button></div>'+
      '<section class="kz-history"><h3>Odigrana povijest</h3><div id="kz-history-list"></div></section>'+
      '<button id="quiz-finish" class="primary">Povratak kraljevstvu</button>');
    $("dialog").classList.add("kz-quiz-dialog");
    $("quiz-finish").onclick=closeModal;
    $("kz-share-result").onclick=()=>sharePlayed(questions,correct);
    $("kz-download-history").onclick=()=>downloadPlayed(questions,correct);
    renderHistory(questions,game?.id);
  }
  function historyRow(q,gameId) {
    const correctKey=q.correct_key;
    const answered=q.choice!=null;
    const status=answered?(q.correct?"✓ Točno":"✗ Netočno"):"Još nije odgovoreno";
    return '<article class="kz-history-item '+(q.correct?"correct":"incorrect")+'">'+
      '<div class="kz-history-q"><span>ABC · '+q.position+'.</span> '+safe(q.prompt)+'</div>'+
      '<div class="kz-history-status">'+safe(status)+(answered?' · Tvoj odgovor: <b>'+
       safe(q.choice)+" · "+safe(answerLabel(q,q.choice))+'</b>':'')+'</div>'+
      '<div class="kz-history-options">'+["A","B","C"].map(key=>
        '<div class="kz-history-option '+(key===correctKey?"correct ":"")+
        (key===q.choice?"selected ":"")+'">'+
        (key===correctKey?"✓ ":key===q.choice?"✗ ":"○ ")+key+') '+safe(answerLabel(q,key))+'</div>').join("")+
      '</div><div class="kz-history-tools">'+
      '<button type="button" class="kz-vote" data-vote="like" data-game="'+safe(gameId)+
      '" data-pos="'+q.position+'" aria-label="Sviđa mi se pitanje">👍</button>'+
      '<button type="button" class="kz-vote" data-vote="dislike" data-game="'+safe(gameId)+
      '" data-pos="'+q.position+'" aria-label="Ne sviđa mi se pitanje">👎</button>'+
      '<button type="button" class="kz-feedback-toggle">Pohvale/primjedbe</button>'+
      '</div><div class="kz-feedback-box hidden">'+
      '<button type="button" class="kz-feedback-close" aria-label="Zatvori primjedbu">×</button>'+
      '<b>Pronašli ste grešku ili možete poboljšati pitanje?</b>'+
      '<textarea maxlength="2000" rows="3" placeholder="Napiši primjedbu, ispravak ili prijedlog..."></textarea>'+
      '<button type="button" class="kz-feedback-send">Pošalji</button>'+
      '<small class="kz-feedback-note">Poruka se šalje KvizToGo timu.</small></div></article>';
  }
  function bindHistory(list,questions,gameId) {
    list.querySelectorAll(".kz-history-item").forEach((item,i)=>{
      const q=questions[i];
      const toggler=item.querySelector(".kz-feedback-toggle");
      const box=item.querySelector(".kz-feedback-box");
      toggler.onclick=()=>box.classList.toggle("hidden");
      item.querySelector(".kz-feedback-close").onclick=()=>box.classList.add("hidden");
      item.querySelectorAll(".kz-vote").forEach(button=>{
        button.onclick=async()=>{
          const all=item.querySelectorAll(".kz-vote");
          all.forEach(b=>b.disabled=true);
          try {
            const ok=await rpc("kz_vote",args({p_game_id:gameId,p_position:q.position,p_vote:button.dataset.vote}));
            if(ok){button.classList.add("selected");toast("Ocjena pitanja je spremljena.");}
            else toast("Ovo si pitanje već ocijenio/la.");
          }catch(e){toast(e.message);all.forEach(b=>b.disabled=false);}
        };
      });
      const send=item.querySelector(".kz-feedback-send");
      send.onclick=async()=>{
        const message=item.querySelector("textarea").value.trim();
        const note=item.querySelector(".kz-feedback-note");
        if(!message){note.textContent="Prvo napiši poruku.";note.classList.add("error");return;}
        send.disabled=true;note.textContent="Šaljem...";
        try{
          const {data,error}=await client.functions.invoke("send-quiz-feedback",{
            body:{
              username:current?.player?.name||"Anonimno",
              questionId:q.id||null,question:q.prompt,
              correctAnswer:answerLabel(q,q.correct_key),
              topic:(q.source||"").replace(/\.json$/i,""),
              questionType:"abc",quizMode:"kraljevstvo_znanja",
              quizPlayId:null,sessionId:"kz:"+gameId,
              message,language:"hr",pageUrl:window.location.href
            }
          });
          if(error)throw error;
          if(!data?.ok)throw Error(data?.error||"Slanje nije potvrđeno.");
          item.querySelector("textarea").value="";
          note.classList.remove("error");note.classList.add("success");
          note.textContent="Hvala! Tvoja poruka je uspješno zaprimljena.";
        }catch(e){
          note.classList.add("error");note.textContent="Poruka nije poslana. Pokušaj ponovno.";
          console.warn("Kraljevstvo Znanja feedback",e);
        }finally{send.disabled=false;}
      };
    });
  }
  function renderHistory(questions,gameId){
    const list=$("kz-history-list");
    if(!list)return;
    const answered=questions.filter(q=>q.choice!=null);
    list.innerHTML=answered.length?answered.map(q=>historyRow(q,gameId)).join(""):
      '<p class="member-meta">Još nema odgovorenih pitanja u ovoj partiji.</p>';
    if(answered.length)bindHistory(list,answered,gameId);
  }
  function renderQuiz(){
    const game=current?.game;
    if(!game)return;
    dialogQuiz=true;
    const pending=game.questions.find(q=>q.choice==null);
    if(!pending){completedPart(game.questions,game);return;}
    const answered=game.questions.filter(q=>q.choice!=null).length;
    modal("ABC · Kraljevstvo Znanja",
      '<div class="kz-quiz-layout"><section class="kz-question-area">'+
      '<div class="quiz-progress">PITANJE '+pending.position+' / 10 · '+answered+' riješeno</div>'+
      '<p class="quiz-question">'+safe(pending.prompt)+'</p>'+
      (pending.image?'<img class="question-image" src="'+safe(pending.image)+'" alt="Slika uz pitanje">':'')+
      '<div class="kz-answer-list">'+["A","B","C"].map(key=>
        '<button class="option" data-answer="'+key+'">'+key+') '+safe(pending.options?.[key]||"")+'</button>').join("")+'</div>'+
      '<p class="member-meta">Točan odgovor vrijedi +'+
      (current?.kingdom?.area>=500?(current.kingdom.role==="kralj"?60:current.kingdom.role==="vojvoda"?50:44):40)+
      ' m².</p><div id="answer-result" aria-live="polite"></div></section>'+
      '<aside class="kz-history"><h3>Rezultati & povijest</h3>'+
      '<div class="kz-current-score">✓ '+game.questions.filter(q=>q.correct).length+
      ' / '+answered+' točnih</div><div id="kz-history-list"></div></aside></div>');
    $("dialog").classList.add("kz-quiz-dialog");
    renderHistory(game.questions,game.id);
    document.querySelectorAll("[data-answer]").forEach(btn=>
      btn.onclick=()=>submitAnswer(game.id,pending.position,btn.dataset.answer));
  }
  async function submitAnswer(gameId,number,key){
    const buttons=[...document.querySelectorAll("[data-answer]")];
    buttons.forEach(b=>b.disabled=true);
    try{
      const out=await rpc("kz_answer",args({p_game_id:gameId,p_number:number,p_choice:key}));
      const q=current.game.questions.find(x=>x.position===number);
      if(q){q.choice=key;q.correct=out.correct;q.correct_key=out.correct_key;q.earned=out.earned;}
      const message=out.correct?"✓ Točno! +"+formatArea(out.earned):
        "✗ Netočno! Točno: "+out.correct_key+") "+answerLabel(q,out.correct_key);
      $("answer-result").innerHTML='<div class="outcome '+(out.correct?"kz-outcome-good":"kz-outcome-bad")+'">'+safe(message)+'</div>';
      buttons.forEach(b=>{
        if(b.dataset.answer===out.correct_key)b.classList.add("correct");
        else if(b.dataset.answer===key&&!out.correct)b.classList.add("wrong");
      });
      renderHistory(current.game.questions,gameId);
      const next=document.createElement("button");
      next.className="primary";next.textContent=out.finished?"Pogledaj rezultat i povijest":"Sljedeće pitanje →";
      next.onclick=async()=>{
        if(out.finished){
          const snapshot=current.game.questions.map(q=>({...q}));
          await reloadState();
          completedPart(snapshot,{id:gameId});
        } else {
          await reloadState();renderQuiz();
        }
      };
      $("answer-result").append(next);
    }catch(e){toast(e.message);buttons.forEach(b=>b.disabled=false);}
  }
  async function showFullHistory(){
    try{
      const games=await rpc("kz_history",args());
      modal("Odigrana povijest",'<p>Posljednjih 12 partija · pohvale, primjedbe i 👍 👎 kao na Online kvizu.</p>'+
        '<div id="kz-all-history"></div><button class="secondary" id="kz-history-close">Zatvori</button>');
      $("dialog").classList.add("kz-quiz-dialog");
      $("kz-history-close").onclick=closeModal;
      const wrapper=$("kz-all-history");
      if(!games?.length){wrapper.innerHTML='<p>Još nema završenih partija.</p>';return;}
      games.forEach((g,i)=>{
        const section=document.createElement("section");
        section.className="kz-history-game";
        section.innerHTML='<details '+(i===0?"open":"")+'><summary>'+
          safe(dateTime(g.at))+' · '+g.correct+'/'+(g.questions?.length||10)+
          ' točnih · +'+safe(formatArea(g.earned))+'</summary>'+
          '<div class="kz-history-list"></div></details>';
        wrapper.append(section);
        const list=section.querySelector(".kz-history-list");
        const answered=(g.questions||[]).filter(q=>q.choice!=null);
        list.innerHTML=answered.map(q=>historyRow(q,g.id)).join("");
        bindHistory(list,answered,g.id);
      });
    }catch(e){toast(e.message);}
  }
  function paintWrapped(ctx,text,x,y,maxWidth,lineHeight){
    const words=String(text||"").split(/\s+/);let line="";
    for(const word of words){
      const next=line?line+" "+word:word;
      if(ctx.measureText(next).width>maxWidth&&line){
        ctx.fillText(line,x,y);y+=lineHeight;line=word;
      }else line=next;
    }
    if(line){ctx.fillText(line,x,y);y+=lineHeight;}
    return y;
  }
  async function makeHistoryImage(questions,correct){
    // PNG kao na Online kvizu, bez ovisnosti o vanjskim servisima.
    const canvas=document.createElement("canvas");
    canvas.width=900;canvas.height=Math.max(600,170+questions.length*270);
    const ctx=canvas.getContext("2d");
    ctx.fillStyle="#0b1527";ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle="#68e8b1";ctx.font="bold 33px system-ui";
    ctx.fillText("KRALJEVSTVO ZNANJA",42,62);
    ctx.fillStyle="#e7f3ff";ctx.font="23px system-ui";
    ctx.fillText("Rezultat: "+correct+"/"+questions.length+" točnih",42,107);
    let y=159;
    for(const q of questions){
      ctx.fillStyle="#d7e8f8";ctx.font="bold 19px system-ui";
      y=paintWrapped(ctx,q.position+". "+q.prompt,42,y,810,28)+5;
      ctx.font="16px system-ui";
      for(const key of ["A","B","C"]){
        ctx.fillStyle=key===q.correct_key?"#78ecaf":key===q.choice&&!q.correct?"#ff9f9f":"#adc5dd";
        y=paintWrapped(ctx,key+") "+answerLabel(q,key),65,y,790,23)+3;
      }
      y+=18;
    }
    // Prilagodi visinu u novom canvasu bez gubitka već iscrtanog sadržaja.
    const trimmed=document.createElement("canvas");trimmed.width=canvas.width;
    trimmed.height=Math.min(canvas.height,Math.max(240,Math.ceil(y+35)));
    trimmed.getContext("2d").drawImage(canvas,0,0);
    return await new Promise((resolve,reject)=>
      trimmed.toBlob(blob=>blob?resolve(blob):reject(Error("PNG nije moguće izraditi")),"image/png"));
  }
  async function downloadPlayed(questions,correct){
    try{
      const blob=await makeHistoryImage(questions,correct);
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a");a.href=url;a.download="kraljevstvo-znanja-povijest.png";
      a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
    }catch(e){toast(e.message);}
  }
  async function sharePlayed(questions,correct){
    try{
      const blob=await makeHistoryImage(questions,correct);
      const file=new File([blob],"kraljevstvo-znanja-povijest.png",{type:"image/png"});
      if(navigator.canShare?.({files:[file]})&&navigator.share)await navigator.share({
        files:[file],title:"Kraljevstvo Znanja",text:"Osvojio/la sam "+correct+"/"+questions.length+" točnih!"});
      else await downloadPlayed(questions,correct);
    }catch(e){if(e.name!=="AbortError")toast(e.message);}
  }
  async function play() {
    try {
      toggleBusy($("play-btn"),true);
      if (!current.game) current=await rpc("kz_start",args());
      renderDashboard();
      renderQuiz();
    }catch(e){toast(e.message);}
    finally{tick();}
  }
  function renderMembers() {
    if (!current?.kingdom) return modal("Članovi","<p>Još nemaš kraljevstvo.</p>");
    const king=current.kingdom.role==="kralj";
    const html=(current.members||[]).map(m => {
      const end=new Date(m.cooldown_until||0).getTime();
      const ready=end<=Date.now();
      const record=(m.last10||[]).map(g=>'<li>'+dateTime(g.at)+': '+g.correct+' točnih / '+
        g.wrong+' netočnih · '+formatArea(g.earned)+' · '+Number(g.seconds||0)+' s</li>').join("");
      const n=m.total_correct+m.total_wrong;
      return '<article class="member"><b>'+safe(m.name)+'</b> · '+roleName(m.role)+
        '<div class="member-meta">'+(ready?"Pitanja spremna":"Cooldown do "+dateTime(m.cooldown_until))+
        '</div><div class="member-meta">Sva vremena: '+m.total_correct+' točnih / '+m.total_wrong+
        ' netočnih · '+(n?Math.round(m.total_correct*100/n):0)+'% · '+formatArea(m.total_earned)+'</div>'+
        '<details><summary>Zadnjih 10 partija ('+(m.last10||[]).length+')</summary><ol>'+
        (record||'<li>Još nije igrao</li>')+'</ol></details>'+
        (king && m.id!==current.player.id ?
          '<div><button class="secondary" data-manage="duke" data-member="'+m.id+'">Postavi vojvodu</button>'+
          '<button class="secondary" data-manage="crown" data-member="'+m.id+'">Predaj krunu</button>'+
          '<button class="secondary" data-manage="kick" data-member="'+m.id+'">Isključi</button></div>':'')+
        '</article>';
    }).join("");
    modal("Članovi kraljevstva · "+current.kingdom.name,html);
    document.querySelectorAll("[data-manage]").forEach(b=>b.addEventListener("click",async()=>{
      if (!confirm("Potvrđuješ radnju za ovog člana?")) return;
      try {
        await rpc("kz_membership",args({p_action:b.dataset.manage,p_target:b.dataset.member}));
        closeModal();await reloadState();toast("Promjena članstva je spremljena.");
      }catch(e){toast(e.message);}
    }));
  }
  function boostInfo() {
    const enabled=(current?.kingdom?.area||0)>=500;
    modal("Boost kraljevstva",'<p>'+ (enabled?'⚡ Boost je uključen.':'Boost se uključuje čim kraljevstvo dosegne 500 m².')+'</p>'+
      '<p>Dok kraljevstvo ima najmanje 500 m², svaki točan odgovor donosi:</p>'+
      '<p><b>Kralj kvizaš: 60 m²</b><br><b>Vojvoda kvizaš: 50 m²</b><br><b>Vojnik kvizaš: 44 m²</b></p>'+
      '<p>Ispod 500 m² svaki točan odgovor donosi 40 m². Jedan blok ima 20 m². Slobodan blok košta 20 m², a napad na puni tuđi blok 40 m² za osvajanje 20 m².</p>');
  }
  function renderRequests() {
    const list=current?.requests||[];
    $("requests-panel").classList.toggle("hidden",current?.kingdom?.role!=="kralj");
    $("request-count").textContent=list.length?'('+list.length+')':'';
    $("requests-list").innerHTML=list.length ?
      list.map(r=>'<div><b>'+safe(r.name)+'</b> želi pristup · '+dateTime(r.at)+
        '<div class="request-controls"><button data-request="'+r.id+'" data-decision="yes">✓ Prihvati</button>'+
        '<button data-request="'+r.id+'" data-decision="no">✕ Odbij</button></div></div>').join("") :
      '<div class="empty-note">Nema zahtjeva na čekanju.</div>';
    document.querySelectorAll("[data-request]").forEach(b=>b.addEventListener("click",async()=>{
      try {
        b.disabled=true;
        await rpc("kz_review",args({p_request:b.dataset.request,p_accept:b.dataset.decision==="yes"}));
        toast("Odluka je spremljena i igrač će dobiti obavijest.");
        await reloadState(); await reloadMap();
      }catch(e){toast(e.message);b.disabled=false;}
    }));
  }
  function renderMail() {
    const msgs=current?.mail||[];
    $("mail-list").innerHTML = msgs.length ? msgs.map(m=>'<div><b>'+dateTime(m.at)+'</b>'+
      (!m.read?'<span style="color:#93f0b0"> · NOVO</span>':'')+'<p>'+safe(m.body)+'</p>'+
      (!m.read?'<button data-mail="'+m.id+'" class="minor">Označi pročitanim</button>':'')+'</div>').join("") :
      '<div class="empty-note">Nema obavijesti.</div>';
    document.querySelectorAll("[data-mail]").forEach(b=>b.addEventListener("click",async()=>{
      try{await rpc("kz_read_mail",args({p_mail_id:b.dataset.mail}));await reloadState();}
      catch(e){toast(e.message);}
    }));
  }
  async function createKingdom() {
    const name=$("realm-choice").value, color=$("realm-color").value;
    if (!name) return toast("Odaberi ime kraljevstva s popisa.");
    if (!confirm("Boja kraljevstva ostat će trajna. Osnovati " + name + " u boji " + color + "?")) return;
    try {
      toggleBusy($("create-btn"),true);
      await rpc("kz_create",args({p_name:name,p_color:color}));
      toast("Kraljevstvo " + name + " je osnovano!");
      await reloadState();await reloadMap();
    }catch(e){toast(e.message);}
    finally{toggleBusy($("create-btn"),false);}
  }
  async function leaveKingdom() {
    const king=current?.kingdom?.role==="kralj";
    if (king) {
      modal("Kraljevska kruna",'<p>Ako želiš napustiti kraljevstvo, prvo predaj krunu jednom od svojih članova. Ako si jedini član, možeš zatvoriti kraljevstvo samo dok nema teritorija ni kvadrata na kontu.</p>'+
        '<button id="open-members" class="primary">Pregled članova i predaja krune</button>'+
        '<button id="close-empty" class="secondary">Zatvori prazno kraljevstvo</button>');
      $("open-members").onclick=renderMembers;
      $("close-empty").onclick=()=>membership("close");
    } else {
      if (confirm("Izlaskom gubiš pravo na upravljanje dosadašnjim kraljevstvom. Već doprineseni kvadrati ostaju njemu. Napustiti?"))
        membership("leave");
    }
  }
  async function membership(action) {
    try {
      await rpc("kz_membership",args({p_action:action}));
      closeModal();await reloadState();await reloadCatalog();await reloadMap();
      toast("Članstvo je ažurirano.");
    }catch(e){toast(e.message);}
  }
  function bind() {
    $("choose-map-center").addEventListener("click",()=>chooseMapCentre(false));
    $("refresh-btn").addEventListener("click",async()=>{await reloadState();await reloadMap();});
    $("map-life-toggle").addEventListener("click",toggleLivingWorld);
    $("play-btn").addEventListener("click",play);
    $("history-open").addEventListener("click",showFullHistory);
    $("create-btn").addEventListener("click",createKingdom);
    $("realm-search").addEventListener("input",filterRealmCatalog);
    $("spawn-btn").addEventListener("click",placeSpawn);
    $("claim-block").addEventListener("click",saveBlock);
    document.querySelectorAll("[data-joy]").forEach(b=>b.addEventListener("click",()=>moveCursor(b.dataset.joy)));
    $("leave-btn").addEventListener("click",leaveKingdom);
    $("members-box").addEventListener("click",renderMembers);
    $("bank-box").addEventListener("click",boostInfo);



    $("dialog-close").addEventListener("click",closeModal);
    $("dialog-backdrop").addEventListener("click",e=>{if(e.target===$("dialog-backdrop"))closeModal();});
    document.addEventListener("keydown",e=>{if(e.key==="Escape")closeModal();});
    document.addEventListener("visibilitychange",async()=>{
      if (document.visibilityState==="visible" && identity) {
        try { await reloadState();await reloadMap(); }catch(_){}
      }
    });
  }
  async function init() {
    const btn=$("map-life-toggle");
    btn.textContent=lifeEnabled?"🐉 Živi svijet: UKLJ.":"🐉 Živi svijet: ISKLJ.";
    btn.setAttribute("aria-pressed",String(lifeEnabled));
    bind();
    if (!client) throw Error("Supabase nije učitan. Provjeri vezu.");
    await prepareIdentity();
    initMap();
    await Promise.all([reloadState(),reloadCatalog()]);
    await reloadMap();
    if (current?.kingdom?.anchor_x != null) {
      const p=ll(Number(current.kingdom.anchor_x),Number(current.kingdom.anchor_y));
      map.setView([p.lat,p.lng],20);
    }
    setInterval(tick,1000);
    refreshTimer=setInterval(async()=>{
      if(document.visibilityState==="visible"){try{await reloadState();await reloadMap();}catch(_){}}
    },45000);
  }
  init().catch(e=>{toast(e.message);$("map-count").textContent="Učitavanje nije uspjelo.";console.error("Kraljevstvo Znanja:",e);});
})();
