
(() => {
  "use strict";

  const API_URL = "https://hssfjguysejbosvholqu.supabase.co";
  const API_KEY = "sb_publishable_1wlZVov1csReXuZEgcuInA_7F7_gzIy";
  const R = 6371007.181, K = Math.sqrt(3) / 2; // sferna ekvivalentna projekcija; ćelija je ~1 m²
  const $ = (id) => document.getElementById(id);
  const client = window.supabase?.createClient(API_URL, API_KEY);
  let identity = null, current = null, kingdoms = [], cells = [], map = null, tilesLayer, borderLayer, labelsLayer;
  let focusCell = null, mapLoading = false, mapRevision = 0, dialogQuiz = false;
  let selectedShape = "blok", realmCatalog = [];
  const shapeDescriptions = {
    blok: "Zbijeni blok: širina i dubina su približno jednake.",
    traka: "Ravna traka: osvajanje se proteže u odabranom smjeru.",
    kut: "L-oblik: dvije okomite grane spajaju se na početnom kvadratu.",
    cikcak: "Cik-cak: povezani kvadrati tvore vijugavi pojas."
  };
  function setShape(shape) {
    if (!shapeDescriptions[shape]) return;
    selectedShape = shape;
    document.querySelectorAll("[data-shape]").forEach(b => {
      const active = b.dataset.shape === shape;
      b.classList.toggle("selected", active);
      b.setAttribute("aria-pressed", String(active));
    });
    $("shape-help").textContent = shapeDescriptions[shape] +
      " Odabrani oblik vrijedi i za GPS uporište i za širenje.";
  }
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
    $("dialog-title").textContent = title;
    $("dialog-body").innerHTML = body;
    $("dialog-backdrop").classList.remove("hidden");
  }
  function closeModal() {
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
    $("shape-tool").classList.toggle("hidden", !isKing);
    $("spawn-btn").textContent = (Number(k?.area) || 0) === 0 ?
      "⌖ Postavi prvih 20 m² s GPS-a" : "⌖ Novo GPS uporište";
    $("spawn-btn").disabled = !isKing || Number(k?.bank) < 20;
    $("leave-btn").classList.toggle("hidden", !k);
    $("leave-btn").textContent = isKing ? "Predaj krunu / Zatvori kraljevstvo" : "Napusti kraljevstvo";
    $("action-help").textContent = isKing ?
      "Klikni vlastiti kvadrat na jako uvećanoj karti i odaberi smjer. Novo, udaljeno uporište traži GPS." :
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
    $("play-btn").textContent = game ? "Nastavi 5 ABC pitanja" : "Pokreni 5 ABC pitanja";
    const hh = String(Math.floor(wait / 3600000)).padStart(2, "0");
    const mm = String(Math.floor(wait % 3600000 / 60000)).padStart(2, "0");
    const ss = String(Math.floor(wait % 60000 / 1000)).padStart(2, "0");
    $("cooldown").textContent = !current.kingdom ? "Najprije pronađi kraljevstvo." :
      game ? "Igra je započeta — dovrši preostala pitanja." :
      wait ? "Nova pitanja za " + hh + ":" + mm + ":" + ss :
      "Pitanja su spremna. Novo odbrojavanje počinje tek nakon svih 5 odgovora.";
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
  function drawMap() {
    labelsLayer.clearLayers();
    borderLayer.clearLayers();
    tilesLayer.clearLayers();
    const own = current?.kingdom?.id;
    const detailed = map.getZoom() >= 18;
    const byId = new Map(kingdoms.map(k => [k.id,k]));

    // Na širokom prikazu 1 m² nije vidljiv u mjerilu: jasna oznaka položaja.
    // Na uvećanoj karti crta se stvaran rub između vlasnika ćelija.
    for (const k of kingdoms) {
      if (k.anchor_x == null || k.anchor_y == null || Number(k.area) < 1) continue;
      const center = ll(Number(k.anchor_x),Number(k.anchor_y));
      const spacing = Math.min(0.17, Math.max(0, Math.log10(Number(k.area) + 1) / 24));
      const html = '<div class="realm-label" style="--realm-color:' + safe(k.color) +
        ';letter-spacing:' + spacing + 'rem"><span>' + safe(k.name) +
        '</span><small>' + safe(formatArea(k.area)) + '</small></div>';
      if (!detailed) {
        L.circleMarker([center.lat,center.lng], {
          radius: 11, color: "#ffffff", weight: 3.5, fillColor: k.color,
          fillOpacity: .95, interactive: true, renderer: map._kzCanvasRenderer
        }).on("click", () => showKingdom(k)).addTo(labelsLayer);
      }
      L.marker([center.lat,center.lng], { icon: L.divIcon({className:"",html,iconSize:[1,1]}) })
        .on("click", () => showKingdom(k)).addTo(labelsLayer);
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
          stroke: false, fillColor: k.color, fillOpacity: 0.72,
          interactive: true, renderer: map._kzCanvasRenderer
        }).on("click", event => {
          L.DomEvent.stopPropagation(event);
          if (c.k === own && current?.kingdom?.role === "kralj") {
            focusCell = {x,y};
            $("expand-panel").classList.remove("hidden");
            $("expand-location").textContent = "Odabrani kvadrat: " + x + ", " + y +
              " · Na kontu " + formatArea(current.kingdom.bank);
          } else showKingdom(k);
        }).addTo(tilesLayer);

        if (grid.get((x-1)+":"+y) !== c.k) edge(c.k,"V",x,y);
        if (grid.get((x+1)+":"+y) !== c.k) edge(c.k,"V",x+1,y);
        if (grid.get(x+":"+(y-1)) !== c.k) edge(c.k,"H",y,x);
        if (grid.get(x+":"+(y+1)) !== c.k) edge(c.k,"H",y+1,x);
      }
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
          // Tamni kontrastni rub + bijeli razdjelnik + kraljevska boja.
          for (const [color,weight] of [["#08101f",8],["#ffffff",5.3],[k.color,3.1]]) {
            L.polyline(points,{color,weight,opacity:1,interactive:false,
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
    borderLayer = L.layerGroup().addTo(map);
    labelsLayer = L.layerGroup().addTo(map);
    let timer;
    map.on("moveend zoomend", () => {
      clearTimeout(timer);
      timer=setTimeout(reloadMap,240);
    });
    map.on("click",() => $("expand-panel").classList.add("hidden"));
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
  async function getGPS() {
    if (!navigator.geolocation) throw Error("Ovaj preglednik ne podržava GPS.");
    if (!window.isSecureContext) throw Error("GPS zahtijeva HTTPS.");
    return new Promise((resolve,reject) => {
      navigator.geolocation.getCurrentPosition(
        pos => resolve({lat:pos.coords.latitude,lon:pos.coords.longitude,accuracy:pos.coords.accuracy}),
        err => reject(Error("GPS nije dostupan: " + err.message)),
        { enableHighAccuracy:true, maximumAge:0, timeout:18000 }
      );
    });
  }
  async function showGPS() {
    try {
      $("gps-status").textContent="Tražim GPS lokaciju…";
      const pos=await getGPS();
      const desc = "GPS ±" + Math.round(pos.accuracy) + " m";
      $("gps-status").textContent = desc;
      map.setView([pos.lat,pos.lon],19);
      toast(desc + " · Osvježena tvoja lokacija.");
    } catch(e){$("gps-status").textContent="GPS nije potvrđen";toast(e.message);}
  }
  async function placeSpawn() {
    if (Number(current?.kingdom?.bank)<20) {toast("Na kontu trebaš 20 m².");return;}
    if (!confirm("Potvrđuješ postavljanje teritorija na svojoj trenutnoj GPS lokaciji? Ta će lokacija biti vidljiva na javnoj karti.")) return;
    try {
      $("spawn-btn").disabled=true;
      const gps=await getGPS();
      if (gps.accuracy>100) throw Error("GPS je preslab (±"+Math.round(gps.accuracy)+" m). Pokušaj na otvorenom.");
      const out=await rpc("kz_place",args({
        p_spawn:true,p_lat:gps.lat,p_lon:gps.lon,p_accuracy:gps.accuracy,p_size:20,p_shape:selectedShape
      }));
      toast((out.attack ? "Osvojen suparnički teren: " : "Postavljen teritorij: ") +
        formatArea(out.added) + " za " + formatArea(out.spent) + ".");
      const {lat,lon}=gps;
      map.setView([lat,lon],20);
      await reloadState(); await reloadMap();
    } catch(e){toast(e.message);}
    finally { $("spawn-btn").disabled=false; tick(); }
  }
  async function expand(direction) {
    if (!focusCell) return toast("Dodirni jedan od svojih kvadrata na granici.");
    const size = Number($("expand-size").value);
    if (!Number.isInteger(size) || size<3 || size>20) return toast("Odaberi od 3 do 20 m².");
    try {
      document.querySelectorAll("[data-dir]").forEach(b=>b.disabled=true);
      const out=await rpc("kz_place",args({
        p_from_x:focusCell.x,p_from_y:focusCell.y,p_direction:direction,p_size:size,p_spawn:false,p_shape:selectedShape
      }));
      toast(out.attack ? "Okrašaj! Preuzeto 8 m² za 20 m² s konta." :
        "Kraljevstvo je prošireno za " + formatArea(out.added) + ".");
      $("expand-panel").classList.add("hidden");
      await reloadState(); await reloadMap();
    }catch(e){toast(e.message);}
    finally{document.querySelectorAll("[data-dir]").forEach(b=>b.disabled=false);}
  }
  function renderQuiz() {
    const game=current?.game;
    if (!game) return;
    dialogQuiz=true;
    const pending = game.questions.find(q => q.choice == null);
    const answered=game.questions.filter(q=>q.choice != null).length;
    if (!pending) {
      const correct=game.questions.filter(q=>q.correct).length;
      const earned=game.questions.reduce((sum,q)=>sum+Number(q.earned||0),0);
      modal("Partija završena",'<p class="quiz-question">Točnih odgovora: '+correct+'/5</p>' +
        '<p>Osvojeno ' + formatArea(earned) + ' za tvoje kraljevstvo.</p>' +
        '<button id="quiz-finish" class="primary">Povratak kraljevstvu</button>');
      $("quiz-finish").addEventListener("click",async()=>{closeModal();await reloadState();});
      return;
    }
    const options=pending.options||{};
    modal("ABC · Kraljevstvo Znanja",'<div class="quiz-progress">PITANJE '+pending.position+' / 5 · '+answered+' riješeno</div>'+
      '<p class="quiz-question">'+safe(pending.prompt)+'</p>'+
      (pending.image?'<img class="question-image" src="'+safe(pending.image)+'" alt="Slika uz pitanje">':'')+
      ["A","B","C"].map(key =>
      '<button class="option" data-answer="'+key+'">'+key+') '+safe(options[key]||"")+'</button>').join('')+
      '<p class="member-meta">Za točan odgovor +'+
      (current?.kingdom?.area>=500?(current.kingdom.role==="kralj"?30:current.kingdom.role==="vojvoda"?25:22):20)+
      ' m².</p><p id="answer-result" aria-live="polite"></p>');
    document.querySelectorAll("[data-answer]").forEach(btn=>btn.addEventListener("click",() => submitAnswer(game.id,pending.position,btn.dataset.answer)));
  }
  async function submitAnswer(gameId,number,key) {
    const buttons=[...document.querySelectorAll("[data-answer]")];
    buttons.forEach(b=>b.disabled=true);
    try {
      const out=await rpc("kz_answer",args({p_game_id:gameId,p_number:number,p_choice:key}));
      const message = out.correct ? "Točno! +" + formatArea(out.earned) : "Netočno! Točan odgovor: " + out.correct_key;
      const result=$("answer-result");
      result.innerHTML='<div class="outcome">'+safe(message)+'</div>';
      buttons.forEach(b => {
        if (b.dataset.answer===out.correct_key) b.classList.add("correct");
        else if (b.dataset.answer===key && !out.correct) b.classList.add("wrong");
      });
      const lastCorrect = (current.game?.questions || []).filter(q => q.correct).length + (out.correct ? 1 : 0);
      const lastEarned = (current.game?.questions || []).reduce((sum,q) => sum + Number(q.earned || 0), 0) + Number(out.earned || 0);
      const next=document.createElement("button");
      next.className="primary";
      next.textContent=out.finished ? "Pogledaj rezultat" : "Sljedeće pitanje →";
      next.onclick=async()=>{
        await reloadState();
        if (out.finished) {
          modal("Partija završena",'<p class="quiz-question">Točnih odgovora: '+lastCorrect+'/5</p>'+
            '<p>Osvojeno '+formatArea(lastEarned)+' za tvoje kraljevstvo.</p>'+
            '<p>Sljedeća pitanja bit će dostupna četiri sata nakon završetka ove partije.</p>'+
            '<button id="quiz-finish" class="primary">Povratak kraljevstvu</button>');
          $("quiz-finish").onclick=closeModal;
        } else renderQuiz();
      };
      result.append(next);
    }catch(e){toast(e.message);buttons.forEach(b=>b.disabled=false);}
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
      '<p><b>Kralj kvizaš: 30 m²</b><br><b>Vojvoda kvizaš: 25 m²</b><br><b>Vojnik kvizaš: 22 m²</b></p>'+
      '<p>Ispod 500 m² svi ponovno dobivaju 20 m². Širenje na slobodno područje troši 3–20 m² po potezu, a napad ili obrana troše 20 m² za osvajanje 8 m².</p>');
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
    $("gps-btn").addEventListener("click",showGPS);
    $("refresh-btn").addEventListener("click",async()=>{await reloadState();await reloadMap();});
    $("play-btn").addEventListener("click",play);
    $("create-btn").addEventListener("click",createKingdom);
    $("realm-search").addEventListener("input",filterRealmCatalog);
    $("spawn-btn").addEventListener("click",placeSpawn);
    $("leave-btn").addEventListener("click",leaveKingdom);
    $("members-box").addEventListener("click",renderMembers);
    $("bank-box").addEventListener("click",boostInfo);
    $("expand-close").addEventListener("click",()=> $("expand-panel").classList.add("hidden"));
    document.querySelectorAll("[data-dir]").forEach(b=>b.addEventListener("click",()=>expand(b.dataset.dir)));
    document.querySelectorAll("[data-shape]").forEach(b=>b.addEventListener("click",()=>setShape(b.dataset.shape)));
    setShape("blok");
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
    bind();
    if (!client) throw Error("Supabase nije učitan. Provjeri vezu.");
    await prepareIdentity();
    initMap();
    await Promise.all([reloadState(),reloadCatalog()]);
    await reloadMap();
    if (current?.kingdom?.anchor_x != null) {
      const p=ll(Number(current.kingdom.anchor_x),Number(current.kingdom.anchor_y));
      map.setView([p.lat,p.lng],17);
    }
    setInterval(tick,1000);
    refreshTimer=setInterval(async()=>{
      if(document.visibilityState==="visible"){try{await reloadState();await reloadMap();}catch(_){}}
    },45000);
  }
  init().catch(e=>{toast(e.message);$("map-count").textContent="Učitavanje nije uspjelo.";console.error("Kraljevstvo Znanja:",e);});
})();
