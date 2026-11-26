
(() => {
  "use strict";

  const API_URL = "https://hssfjguysejbosvholqu.supabase.co";
  const API_KEY = "sb_publishable_1wlZVov1csReXuZEgcuInA_7F7_gzIy";
  const R = 6371007.181, K = Math.sqrt(3) / 2; // sferna ekvivalentna projekcija; ćelija je ~1 m²
  const $ = (id) => document.getElementById(id);
  const client = window.supabase?.createClient(API_URL, API_KEY);
  let identity = null, current = null, kingdoms = [], cells = [], map = null, tilesLayer, borderLayer, labelsLayer, lifeLayer;
  let lifeEnabled = true;
  // The map toolbar no longer exposes the world toggle; keep characters visible for everyone.
  let mapLoading = false, mapRevision = 0, dialogQuiz = false;
  let mainQuizSession=null, territoryDuel=null, duelResumeButton=null, duelLoading=false;
  function stopMainTimer(){if(mainQuizSession){clearInterval(mainQuizSession.timer);mainQuizSession.timer=null;}}
  let territoryPaintKey=null, blockGridPaintKey=null, initialMapReady=false;
  let territoryCellBounds=null;
  let cursor = null, cursorSpawnMode = false, previewLayer = null, blockGridLayer = null, previewBusy = false;
  let firstGpsFix = null, firstGpsBusy = false;
  const needsFirstGps = () => current?.kingdom?.role === 'kralj' && Number(current.kingdom.area||0)===0;
  const firstGpsFlexible=()=>needsFirstGps()&&!!firstGpsFix&&firstGpsFix.radius>0;
  const gpsLocked=()=> (needsFirstGps()||cursorSpawnMode)&&!firstGpsFlexible();
  const gpsAllows=b=>!firstGpsFlexible()||map.distance([firstGpsFix.lat,firstGpsFix.lon],previewCentre(b))<=firstGpsFix.radius;
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
    y: Math.floor(window.KZWorldRegistry.gridYFromLatitude(lat))
  });
  const ll = (x, y) => ({
    lat: window.KZWorldRegistry.latitudeFromGridY(y),
    lng: x / (R * K) * 180 / Math.PI
  });
  const args = (extra = {}) => ({ p_guest_id: identity.id, p_guest_secret: identity.secret, ...extra });
  async function rpc(name, params = {}) {
    if (!client) throw Error("Supabase nije učitan. Osvježi stranicu.");
    const { data, error } = await client.rpc(name, params);
    if (error) throw Error(error.message || "Pogreška poslužitelja");
    if(name==="kz_territory_duel"&&(["start","join","answer"].includes(params.p_action)||(params.p_action==="state"&&data?.status!=="active")))void refreshBattleMarkers();
    return data;
  }
  // Zajednički RPC za napade na putujuće dvorce; koristi postojeći
  // KZ gostujući/autentificirani identitet, bez drugog Supabase klijenta.
  // Pitanja i nagrade: provjera GPS-a i 50 pokušaja po danu na poslužitelju.
  window.KZCastleRPC = {
    status: () => rpc("kz_castle_status"),
    catalog: () => rpc("kz_castle_active_catalog"),
    ironMap: (params) => rpc("kz_iron_map",params),
    quota: () => rpc("kz_guardian_quota", args()),
    challenge: (guardianId, fix) => rpc("kz_guardian_challenge", args({
      p_guardian_id:guardianId,p_lat:fix.lat,p_lng:fix.lng,p_accuracy:fix.accuracy
    })),
    answer: (challengeId, choice, fix) => rpc("kz_guardian_answer", args({
      p_challenge_id:challengeId,p_choice:choice,
      p_lat:fix.lat,p_lng:fix.lng,p_accuracy:fix.accuracy
    }))
  };

  window.KZFlagRPC = {
    map: (params) => rpc("kz_flag_map", params),
    challenge: (id,generation,fix) => rpc("kz_flag_challenge", args({p_flag_id:id,p_generation:generation,p_lat:fix.lat,p_lng:fix.lng,p_accuracy:fix.accuracy})),
    answer: (id,choice,fix) => rpc("kz_flag_answer", args({p_challenge_id:id,p_choice:choice,p_lat:fix.lat,p_lng:fix.lng,p_accuracy:fix.accuracy}))
  };

  // Samo koordinatne RPC operacije; postojeći identitet ostaje privatno u ovoj skripti.
  window.KZCoordinateRPC = (name, extra = {}) => {
    if (!["kz_coord_list","kz_coord_save","kz_coord_delete"].includes(name)) {
      throw Error("Nepoznata operacija koordinata.");
    }
    return rpc(name, args(extra));
  };

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
    const abandoned=mainQuizSession;stopMainTimer();mainQuizSession=null;
    if(abandoned&&!abandoned.done&&!abandoned.busy&&abandoned.position){rpc("kz_answer",args({p_game_id:abandoned.gameId,p_number:abandoned.position,p_choice:"SKIP"})).then(()=>reloadState()).catch(()=>{});}
    const duel=territoryDuel;
    if(duel){clearInterval(duel.timer);clearInterval(duel.poll);territoryDuel=null;
      if(!duel.done&&!duel.busy&&!duel.q.submitted&&!duel.q.intermission&&duel.q.status==="active"){
        rpc("kz_territory_duel",args({p_action:"answer",p_id:duel.q.id,p_number:duel.q.position,p_choice:"SKIP"}))
          .then(out=>{setDuelResume(out.status==="active");return reloadState();}).catch(e=>toast(e.message));
      }
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
  function realPlayerName(value){
    const name=String(value||"").trim();
    return name&&!/^(?:kvizaš|kvizas|gost|guest|kviztogo korisnik|kvizoman|tvoj rezultat|your score|kvizaš\d{3})$/iu.test(name)?name:"";
  }
  function saveSharedGuestName(guest,name){
    const raw=JSON.parse(localStorage.getItem("kviztogo_guest_identity_v1")||"null");
    if(!raw||raw.id!==guest.id)throw Error("Gostujući identitet je promijenjen. Osvježi stranicu.");
    raw.displayName=name;
    localStorage.setItem("kviztogo_guest_identity_v1",JSON.stringify(raw));
    localStorage.removeItem("kviztogo_multiplayer_guest_alias_v1");
    guest.name=name;
  }
  function requestPlayerName(guest,user){
    const gate=$("kz-name-gate"),form=$("kz-name-form"),input=$("kz-name-input"),message=$("kz-name-message"),button=$("kz-name-save");
    const main=document.querySelector("main.page");
    gate.classList.remove("hidden");main.inert=true;main.setAttribute("aria-hidden","true");
    return new Promise(resolve=>{
      form.onsubmit=async event=>{
        event.preventDefault();
        const name=realPlayerName(input.value);
        if(!name||!/^[\p{L}\p{N}]{3,20}$/u.test(name)){
          message.textContent="Upiši 3–20 slova ili brojeva. Zadano ime nije dopušteno.";return;
        }
        button.disabled=true;message.textContent="Provjeravam ime…";
        try{
          if(user){
            const available=await rpc("username_available",{candidate:name});
            if(available!==true)throw Error("To korisničko ime već je zauzeto ili nije dopušteno.");
            const result=await client.from("profiles").update({username:name}).eq("id",user.id).select("username").single();
            if(result.error)throw result.error;
            const meta=await client.auth.updateUser({data:{username:name}});
            if(meta.error)throw meta.error;
            localStorage.setItem("kviztogo_username",name);
          }
          const result=await rpc("kz_identity",{p_guest_id:guest.id,p_guest_secret:guest.secret,p_name:name});
          if(!user)saveSharedGuestName(guest,result.name||name);
          gate.classList.add("hidden");main.inert=false;main.removeAttribute("aria-hidden");
          form.onsubmit=null;resolve(result);
        }catch(e){message.textContent=e.message||"Ime nije spremljeno. Pokušaj ponovno.";}
        finally{button.disabled=false;}
      };
      input.focus();
    });
  }
  async function prepareIdentity() {
    const guest=getGuestIdentity();
    const auth=await client.auth.getSession();
    if(auth.error)throw auth.error;
    const user=auth.data?.session?.user||null;
    const credentials={p_guest_id:guest.id,p_guest_secret:guest.secret};
    let name=realPlayerName(await rpc("kz_saved_name",credentials));
    if(user)$("account-warning").classList.add("hidden");
    else if(!name)name=realPlayerName(guest.name);
    let result=null;
    if(name){
      try{result=await rpc("kz_identity",{...credentials,p_name:name});}
      catch(e){if(user)throw e;console.warn("Zajedničko ime nije potvrđeno:",e.message);}
    }
    if(!result)result=await requestPlayerName(guest,user);
    else if(!user)saveSharedGuestName(guest,result.name||name);
    identity=guest;
  }
  async function reloadState() {
    current = await rpc("kz_state", args());
    window.dispatchEvent(new CustomEvent("kz:state", {detail:{state:current}}));
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
    $("members-total").textContent = (current?.members?.length || 0) + " / 10";
    $("bank-count").textContent = formatArea(k?.bank);
    $("bank-count").style.color = k?.bank >= 20 ? "#91f0ad" : "";
    $("boost-caption").textContent = k?.area > 1000 ? "⚡ BOOST UKLJUČEN · Pravila" : "Boost se uključuje iznad 1.000 m²";
    $("create-panel").classList.toggle("hidden", !!k);
    $("joystick-panel").classList.toggle("hidden", !k || !map || map.getZoom()<18);
    document.querySelectorAll("[data-joy]").forEach(b=>b.disabled=!k||gpsLocked()||firstGpsBusy||previewBusy);
    $("gps-status").textContent=firstGpsFlexible()?"GPS blok zauzet · odaberi slobodan blok do "+firstGpsFix.radius+" m":needsFirstGps()?"Prvi blok na GPS lokaciji ili najbližem slobodnom području":"Novo uporište isključivo na GPS lokaciji";
    if(needsFirstGps()&&!firstGpsFix){cursor=null;cursorSpawnMode=false;}
    if(!needsFirstGps()&&!cursorSpawnMode)firstGpsFix=null;
    if (isKing && !needsFirstGps() && !cursor && k.anchor_x != null) {
      const point = alignBlock(Number(k.anchor_x),Number(k.anchor_y));
      cursor = {x:point.x+5,y:point.y};
    }
    if (!isKing) { if(!k||cursorSpawnMode)cursor=null; cursorSpawnMode = false; firstGpsFix=null; }
    updateCursorPreview();
    $("leave-btn").classList.toggle("hidden", !k);
    $("leave-btn").textContent = isKing ? "Predaj krunu / Zatvori kraljevstvo" : "Napusti kraljevstvo";
    $("action-help").textContent = isKing ?
      (needsFirstGps()?"Prvi blok postavi na GPS lokaciji; ako je zauzeta, odaberi slobodan blok unutar dopuštenog kruga.":"Dodirni mjesto na karti, prilagodi blok strelicama i pritisni POSTAVI.") :
      k ? "Možeš napadati protivničke blokove uz granicu i braniti svoje kraljevstvo. Slobodne blokove postavlja kralj kvizaš." :
      "Osnuj kraljevstvo ili dodirni drugo kraljevstvo na karti i zatraži članstvo.";
    renderRequests();
    renderMail();
    void refreshRealmEvents();
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
    const cellParams=()=>{
      const lo = xy(bounds.getSouth(), bounds.getWest());
      const hi = xy(bounds.getNorth(), bounds.getEast());
      const pad=map.getZoom()>=18?52:0; // Two tower-clearance halos keep crop edges outside the visible map.
      return { p_min_x: Math.min(lo.x,hi.x)-pad, p_max_x: Math.max(lo.x,hi.x)+pad,
        p_min_y: Math.min(lo.y,hi.y)-pad, p_max_y: Math.max(lo.y,hi.y)+pad };
    };
    if(map.getZoom()>=17||overviewNeedsCells(kingdoms))params=cellParams();
    try {
      let data = await rpc("kz_map", params);
      if (rev !== mapRevision) return;
      if(params.p_min_x==null&&overviewNeedsCells(data.kingdoms||[])){
        data=await rpc("kz_map",cellParams());
        if(rev!==mapRevision)return;
      }
      kingdoms = data.kingdoms || [];
      window.dispatchEvent(new CustomEvent("kz:kingdoms", {detail:{kingdoms}}));
      cells = data.cells || [];
      territoryCellBounds=params.p_min_x==null?null:{...params};
      drawMap();
    } catch (error) {
      if (rev === mapRevision) toast(error.message);
    } finally { if (rev === mapRevision) mapLoading = false; }
  }
  // Independent, lightweight world-wide active battle layer.
  let battleLayer=null,battleBusy=false,battleQueued=false;
  const battleMarkers=new Map();
  function battleIconSize(b){
    const z=map.getZoom();
    const sw=map.project(ll(Number(b.x),Number(b.y)),z);
    const ne=map.project(ll(Number(b.x)+5,Number(b.y)+4),z);
    const w=Math.abs(ne.x-sw.x),h=Math.abs(ne.y-sw.y);
    return Math.min(w,h)>=15?[w,h]:[15,15];
  }
  function resizeBattleMarker(entry){
    const size=battleIconSize(entry.battle),key=size.map(v=>v.toFixed(2)).join(":");
    if(entry.sizeKey===key)return;
    entry.sizeKey=key;
    entry.marker.setIcon(L.divIcon({
      className:"kz-active-battle-marker",iconSize:size,iconAnchor:[size[0]/2,size[1]/2],
      html:'<img src="./media/active-battle.webp" alt="" draggable="false">'
    }));
  }
  function pruneBattleMarkers(){
    for(const [id,entry] of battleMarkers){
      if(entry.expiresAt<=Date.now()){battleLayer.removeLayer(entry.marker);battleMarkers.delete(id);}
    }
  }
  function syncBattleMarkers(rows){
    const seen=new Set();
    for(const b of rows){
      if(!b.id||!Number.isFinite(Number(b.x))||!Number.isFinite(Number(b.y))||!(Number(b.remaining_ms)>0))continue;
      seen.add(b.id);
      let entry=battleMarkers.get(b.id);
      const mine=current?.kingdom?.id;
      const text='<strong>⚔ Bitka u tijeku</strong><br>'+safe(b.attacker)+' → '+safe(b.defender)+
        (b.defended?'<br>🛡 Aktivna obrana':'')+
        (mine===b.defender_id&&!b.defended&&!(duelResumeButton&&!duelResumeButton.hidden)?'<br><button type="button" class="kz-defend-battle">🛡 BRANI TERITORIJ</button>':
        mine===b.defender_id&&b.defended?'<br>Mjesto branitelja je zauzeto.':'');
      if(!entry){
        const marker=L.marker(ll(Number(b.x)+2.5,Number(b.y)+2),{
          pane:"kz-active-battle-pane",bubblingMouseEvents:false,keyboard:true,title:"Bitka u tijeku",
          icon:L.divIcon({className:"kz-active-battle-marker",iconSize:[15,15]})
        });
        entry={marker,battle:b,sizeKey:null,expiresAt:0};battleMarkers.set(b.id,entry);
        resizeBattleMarker(entry);marker.bindPopup(text).addTo(battleLayer);
        marker.on("popupopen",e=>{const btn=e.popup.getElement()?.querySelector(".kz-defend-battle");if(btn)btn.onclick=()=>{
          map.closePopup();void openLiveBattle(entry.battle.id,current?.kingdom?.id===entry.battle.defender_id?"join":"state");
        };});
      }else{
        entry.battle=b;
        if(entry.marker.getPopup().getContent()!==text){
          entry.marker.setPopupContent(text);
          const btn=entry.marker.getPopup().getElement()?.querySelector(".kz-defend-battle");
          if(btn)btn.onclick=()=>{map.closePopup();void openLiveBattle(entry.battle.id,current?.kingdom?.id===entry.battle.defender_id?"join":"state");};
        }
        resizeBattleMarker(entry);
      }
      entry.expiresAt=Date.now()+Number(b.remaining_ms);
    }
    for(const [id,entry] of battleMarkers){
      if(!seen.has(id)){battleLayer.removeLayer(entry.marker);battleMarkers.delete(id);}
    }
  }
  async function refreshBattleMarkers(){
    if(!battleLayer||document.visibilityState==="hidden")return;
    if(battleBusy){battleQueued=true;return;}
    battleBusy=true;
    try{const rows=await rpc("kz_active_battles");if(Array.isArray(rows))syncBattleMarkers(rows);}
    catch(e){pruneBattleMarkers();console.warn("KZ active battles:",e.message);}
    finally{battleBusy=false;if(battleQueued){battleQueued=false;void refreshBattleMarkers();}}
  }
  function initBattleMarkers(){
    const pane=map.createPane("kz-active-battle-pane");
    pane.style.zIndex="1600";
    battleLayer=L.layerGroup().addTo(map);
    map.on("zoomend",()=>{for(const entry of battleMarkers.values())resizeBattleMarker(entry);});
    document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")void refreshBattleMarkers();});
    void refreshBattleMarkers();
    setInterval(()=>{if(document.visibilityState==="visible"){pruneBattleMarkers();void refreshBattleMarkers();}},5000);
  }
  function cellOwner(x,y) {
    return cells.find(c => Number(c.x) === x && Number(c.y) === y)?.k || null;
  }

  // Largest fitting horizontal rectangle of actual owned cells, never a bounding box across holes.
  function labelRectangles(positions,visit){
    const rows=new Map();
    for(const [x,y] of positions){
      if(!rows.has(y))rows.set(y,[]);
      rows.get(y).push(x);
    }
    let previous=new Map(),lastY=null;
    for(const y of [...rows.keys()].sort((a,b)=>a-b)){
      const row=rows.get(y).sort((a,b)=>a-b),heights=new Map(),stack=[];
      if(lastY!==y-1)previous=new Map();
      let lastX=null;
      const flush=(x,h)=>{
        let start=x;
        while(stack.length&&stack[stack.length-1].h>h){
          const item=stack.pop();start=item.x;
          visit({x0:start,x1:x,y0:y+1-item.h,y1:y+1});
        }
        if(h&&(!stack.length||stack[stack.length-1].h<h))stack.push({x:start,h});
      };
      for(const x of row){
        if(lastX!==null&&x!==lastX+1)flush(lastX+1,0);
        const h=(previous.get(x)||0)+1;
        heights.set(x,h);flush(x,h);lastX=x;
      }
      if(lastX!==null)flush(lastX+1,0);
      previous=heights;lastY=y;
    }
  }
  const labelMeasure=document.createElement("canvas").getContext("2d");
  const LABEL_FONT="600 100px Arial, sans-serif";
  function nameWidthRatio(name){
    if(!labelMeasure)return [...name].length*.65;
    labelMeasure.font=LABEL_FONT;
    const m=labelMeasure.measureText(name);
    return Math.max(m.width,(m.actualBoundingBoxLeft||0)+(m.actualBoundingBoxRight||0))/100;
  }
  function labelInk(color){
    const h=/^#[0-9a-f]{6}$/i.test(color||"")?color:"#808080";
    const rgb=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255);
    const lum=rgb.map(v=>v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4));
    return lum[0]*.2126+lum[1]*.7152+lum[2]*.0722>.36?"#111827":"#ffffff";
  }
  function drawTerritoryLabels(grid,byId){
    const zoom=map.getZoom(),owners=new Map();
    for(const c of cells){
      if(!owners.has(c.k))owners.set(c.k,[]);
      owners.get(c.k).push([Number(c.x),Number(c.y)]);
    }
    for(const [id,positions] of owners){
      const k=byId.get(id);
      if(!k||!k.name||!positions.length)continue;
      const ratio=Math.max(.5,nameWidthRatio(k.name));
      const cx=positions.reduce((n,p)=>n+p[0]+.5,0)/positions.length;
      const cy=positions.reduce((n,p)=>n+p[1]+.5,0)/positions.length;
      let best=null;
      labelRectangles(positions,r=>{
        const a=map.project(ll(r.x0,r.y0),zoom),b=map.project(ll(r.x1,r.y1),zoom);
        const width=Math.abs(b.x-a.x),height=Math.abs(b.y-a.y);
        const font=Math.min(96,(width-2)*.88/ratio,(height-2)*.72/1.15);
        if(font<7)return;
        const x=(r.x0+r.x1)/2,y=(r.y0+r.y1)/2;
        const distance=(x-cx)**2+(y-cy)**2;
        if(!best||font>best.font+.01||(Math.abs(font-best.font)<=.01&&distance<best.distance))
          best={x,y,font,distance};
      });
      if(!best)continue;
      const center=ll(best.x,best.y);
      const label='<div class="kz-realm-name" style="font-size:'+Math.floor(best.font*10)/10+'px;color:'+labelInk(k.color)+'">'+safe(k.name)+'</div>';
      L.marker([center.lat,center.lng],{
        icon:L.divIcon({className:"territory-ink-holder",html:label,iconSize:[0,0],iconAnchor:[0,0]}),
        interactive:false,keyboard:false,zIndexOffset:700
      }).addTo(labelsLayer);
    }
  }

  // At overview zooms only request real geometry when some kingdom could fit a legible name.
  function overviewNeedsCells(list){
    const zoom=map.getZoom(),bounds=map.getBounds();
    return list.some(k=>{
      if(k.anchor_x==null||k.anchor_y==null||!k.name||!k.area)return false;
      const p=ll(Number(k.anchor_x),Number(k.anchor_y));
      if(!bounds.pad(.5).contains(p))return false;
      const a=map.project(p,zoom),b=map.project(ll(Number(k.anchor_x)+1,Number(k.anchor_y)+1),zoom);
      const pixelArea=Math.abs((b.x-a.x)*(b.y-a.y))*Number(k.area);
      return pixelArea>=7*7*1.15*Math.max(.5,nameWidthRatio(k.name));
    });
  }

  // Ručno crtani, originalni SVG likovi, bez vanjskih animacijskih biblioteka.
  // Ovaj sloj je samo dekoracija i ne sudjeluje u osvajanjima ili GPS-u.
  function paintLivingWorld() {
    if (!lifeLayer || !map) return;
    lifeLayer.clearLayers();
    // Ostala su samo tri posebna sustava: šume, dvorci i Željezni.
    // Njihovi moduli samostalno prate uključivanje "Živog svijeta".
  }
  function toggleLivingWorld() {
    lifeEnabled=!lifeEnabled;
    try{localStorage.setItem("kz_animated_world_v1",lifeEnabled?"on":"off");}catch(_){}
    const btn=$("map-life-toggle");
    if(btn){
      btn.textContent=lifeEnabled?"🌲 Živi svijet: UKLJ.":"🌲 Živi svijet: ISKLJ.";
      btn.setAttribute("aria-pressed",String(lifeEnabled));
      btn.title=lifeEnabled?"Isključi animirane likove":"Uključi animirane likove";
    }
    paintLivingWorld();
  }

  // Four transparent directional sprites, anchored to the existing territorial grid.
  const DRY_WALL_URLS=Object.freeze({
    N:"./media/wall-north.webp?v=1",E:"./media/wall-east.webp?v=1",
    S:"./media/wall-south.webp?v=1",W:"./media/wall-west.webp?v=1"
  });
  let dryWallReady=false, towerReady=false;
  const TOWER_URL="./media/kz-tower.webp?v=1";
  const FORTIFICATION_HEIGHT_SCALE=1.20;
  function prepareTowers(){
    const image=new Image();
    image.onload=()=>{towerReady=true;if(dryWallReady&&map&&borderLayer)drawMap();};
    image.src=TOWER_URL;
  }
  // Towers use real world coordinates and only inspect known territory cells.
  function towerContextKnown(bounds,x,y,margin=1){
    return !!bounds&&x-margin>=bounds.p_min_x&&x+margin-1<=bounds.p_max_x&&
      y-margin>=bounds.p_min_y&&y+margin-1<=bounds.p_max_y;
}
  function collectTowerCorners(grid,bounds){
    const vertices=new Set(), towers=new Set();
    for(const key of grid.keys()){
      const [x,y]=key.split(":").map(Number);
      for(const dx of [0,1])for(const dy of [0,1])vertices.add((x+dx)+":"+(y+dy));
    }
    for(const key of vertices){
      const [x,y]=key.split(":").map(Number);
      // Outside a loaded window, absence of a cell does not mean empty territory.
      if(!towerContextKnown(bounds,x,y))continue;
      const owners=[grid.get((x-1)+":"+(y-1)),grid.get(x+":"+(y-1)),grid.get(x+":"+y),grid.get((x-1)+":"+y)];
      for(const owner of new Set(owners.filter(v=>v!=null))){
        const a=owners.map(v=>v===owner),n=a.filter(Boolean).length;
        if(n===1||n===3||(n===2&&a[0]===a[2]&&a[1]===a[3])){towers.add(key);break;}
      }
    }
    return towers;
}
  function addStraightTowerJoints(towers,corners,bounds,side,fixed,from,to){
    const horizontal=side==="N"||side==="S",block=horizontal?5:4,clearance=block*5;
    const keyAt=v=>horizontal?v+":"+fixed:fixed+":"+v;
    if(to-from<2*clearance)return;
    // Fixed world-grid phase, never relative to the clipped beginning of a wall.
    for(let v=Math.ceil((from+clearance)/clearance)*clearance;v<=to-clearance;v+=clearance){
      const x=horizontal?v:fixed,y=horizontal?fixed:v;
      if(!towerContextKnown(bounds,x,y,clearance+1))continue;
      let clear=true;
      for(let d=1-clearance;d<clearance;d++){
        if(corners.has(keyAt(v+d))){clear=false;break;}
      }
      if(clear)towers.add(keyAt(v));
    }
}
  // One owner per existing tower. Same rule as kz_private.tower_owner.
  // Capture priority beats peaceful occupation; ties are deterministic.
  const towerOwners=new Map();
  function resolveTowerOwner(key,cellMetadata){
    const [x,y]=key.split(":").map(Number);
    const adjacent=[cellMetadata.get((x-1)+":"+(y-1)),cellMetadata.get(x+":"+(y-1)),
      cellMetadata.get(x+":"+y),cellMetadata.get((x-1)+":"+y)].filter(Boolean);
    adjacent.sort((a,b)=>(Number(b.a)||0)-(Number(a.a)||0)||
      (Number(a.t)||0)-(Number(b.t)||0)||(a.k<b.k?-1:a.k>b.k?1:0));
    return adjacent[0]?.k||null;
  }
  function paintTower(key,owner){
    const [x,y]=key.split(":").map(Number),zoom=map.getZoom();
    const p=map.project(ll(x,y),zoom),e=map.project(ll(x+5,y),zoom),n=map.project(ll(x,y+4),zoom);
    const baseWidth=Math.max(8,Math.max(Math.abs(e.x-p.x),Math.abs(n.y-p.y)*.85)*.43);
    const w=baseWidth*1.10;
    const h=baseWidth*92/40;
    // Keep the original bottom/ground anchor and grow only upwards.
    const bottom=p.y+h*.15,top=bottom-h*FORTIFICATION_HEIGHT_SCALE;
    const bounds=L.latLngBounds(map.unproject(L.point(p.x-w/2,bottom),zoom),map.unproject(L.point(p.x+w/2,top),zoom));
    const tower=L.imageOverlay(TOWER_URL,bounds,{pane:"kz-tower-pane",interactive:false,alt:"",opacity:1}).addTo(borderLayer);
    if(owner){
      towerOwners.set(key,owner);
      const node=tower.getElement();
      if(node){node.dataset.kingdomId=owner;node.dataset.towerKey=key;}
    }
  }
  const dryWallSprites={...DRY_WALL_URLS};
  // Remove the perspective lean in the two vertical textures, not in the map
  // geometry. The measured stone centreline is aligned at both endpoints.
  function straightenDryWall(img,side){
    const w=img.naturalWidth,h=img.naturalHeight;
    // Normalized centreline measured from the original transparent artwork.
    const [top,delta]=side==="W"?[.5953,-.2206]:[.6735,-.2749];
    const canvas=document.createElement("canvas");
    canvas.width=Math.ceil(w*1.38);canvas.height=h;
    const ctx=canvas.getContext("2d");
    if(!ctx)return DRY_WALL_URLS[side];
    ctx.imageSmoothingEnabled=true;
    ctx.imageSmoothingQuality="high";
    ctx.setTransform(1,0,-delta*w/h,1,canvas.width/2-top*w,0);
    ctx.drawImage(img,0,0);
    return canvas.toDataURL("image/png");
  }
  function prepareDryWalls(){
    Promise.all(Object.entries(DRY_WALL_URLS).map(([side,url])=>new Promise((resolve,reject)=>{
      const img=new Image();
      img.onload=()=>{
        try{
          if(side==="W"||side==="E")dryWallSprites[side]=straightenDryWall(img,side);
          resolve();
        }catch(error){reject(error);}
      };
      img.onerror=reject;img.src=url;
    }))).then(()=>{dryWallReady=true;if(map&&tilesLayer&&borderLayer)drawMap();})
      .catch(()=>{dryWallReady=false;});
  }
  function isDryWallSide(owner,neighbor,side){
    // Between different realms there is exactly one physical wall; between
    // cells of the same realm there is no wall at all.
    return neighbor!==owner&&(neighbor==null||side==="N"||side==="E");
  }
  function paintDryWall(side,fixed,from,to){
    const horizontal=side==="N"||side==="S";
    const zoom=map.getZoom(),step=horizontal?5:4;
    // Split merged edges at the original 5 x 4 m block boundaries.
    // Partial historic cells still receive an accurate, shorter segment.
    for(let start=from;start<to;){
      const end=Math.min(to,(Math.floor(start/step)+1)*step);
      const a=map.project(horizontal?ll(start,fixed):ll(fixed,start),zoom);
      const b=map.project(horizontal?ll(end,fixed):ll(fixed,end),zoom);
      const full=map.project(horizontal?ll(start+step,fixed):ll(fixed,start+step),zoom);
      const length=Math.abs(horizontal?full.x-a.x:full.y-a.y);
      const thick=Math.max(3,length*(horizontal?.36:.29));
      const overlap=Math.max(.35,thick*.10);
      let left,top,right,bottom;
      if(horizontal){
        left=Math.min(a.x,b.x)-overlap;right=Math.max(a.x,b.x)+overlap;
        top=a.y-thick*.78;bottom=a.y+thick*.22;
      }else{
        left=a.x-thick*.5;right=a.x+thick*.5;
        top=Math.min(a.y,b.y)-overlap;bottom=Math.max(a.y,b.y)+overlap;
      }
      // Horizontal sprites' screen height is the wall thickness; north/south
      // running segments also contain ground length. Raise only their nominal
      // wall height so the 4 m grid segments do not grow by 20% in length.
      top-=(horizontal?bottom-top:thick)*(FORTIFICATION_HEIGHT_SCALE*1.20-1);
      const bounds=L.latLngBounds(map.unproject(L.point(left,bottom),zoom),map.unproject(L.point(right,top),zoom));
      L.imageOverlay(dryWallSprites[side],bounds,{
        pane:"kz-dry-wall-pane",interactive:false,opacity:1,alt:"",className:"kz-dry-wall",
        zIndex:horizontal?(side==="S"?3:1):2
      }).addTo(borderLayer);
      start=end;
    }
  }
  // Merge same-owner unit cells into rectangular strips. Every occupied square
  // is preserved, including holes, old partial blocks and irregular edges.
  function mergeTerritoryCells(cells){
    const rows=new Map(),out=[];
    for(const c of cells){
      const x=Number(c.x),y=Number(c.y);
      if(!rows.has(y))rows.set(y,[]);
      rows.get(y).push({x,k:c.k});
    }
    let active=new Map();
    for(const y of [...rows.keys()].sort((a,b)=>a-b)){
      const row=rows.get(y).sort((a,b)=>a.x-b.x),next=new Map();
      for(let i=0;i<row.length;){
        const k=row[i].k,x0=row[i].x;
        let x1=x0+1;i++;
        while(i<row.length&&row[i].k===k&&row[i].x===x1){x1++;i++;}
        const key=JSON.stringify([k,x0,x1]);
        let rect=active.get(key);
        if(rect&&rect.y1===y)rect.y1=y+1;
        else{rect={k,x0,x1,y0:y,y1:y+1};out.push(rect);}
        next.set(key,rect);
      }
      active=next;
    }
    return out;
  }
  function currentTerritoryPaintKey(){
    const z=map.getZoom(),ks=kingdoms.map(k=>JSON.stringify(k)).sort();
    const cs=cells.map(c=>c.x+":"+c.y+":"+c.k+(z>=18?":"+c.t+":"+(c.a??""):"")).sort();
    // Only invalidate for crop changes near the actual geometry, not ordinary pans.
    let towerContext=null;
    if(z>=18&&territoryCellBounds&&cells.length){
      let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
      for(const c of cells){
        const x=Number(c.x),y=Number(c.y);
        minX=Math.min(minX,x);maxX=Math.max(maxX,x);
        minY=Math.min(minY,y);maxY=Math.max(maxY,y);
      }
      const b=territoryCellBounds;
      towerContext=[Math.max(b.p_min_x,minX-26),Math.min(b.p_max_x,maxX+26),
        Math.max(b.p_min_y,minY-26),Math.min(b.p_max_y,maxY+26)];
    }
    return JSON.stringify([z,dryWallReady,towerReady,ks,cs,towerContext]);
  }
  // Count distinct kingdoms actually represented inside the current viewport, not the global catalog.
  function countVisibleKingdoms(){
    const bounds=map.getBounds(), detailed=map.getZoom()>=17;
    const lo=xy(bounds.getSouth(),bounds.getWest()),hi=xy(bounds.getNorth(),bounds.getEast());
    const minX=Math.min(lo.x,hi.x),maxX=Math.max(lo.x,hi.x);
    const minY=Math.min(lo.y,hi.y),maxY=Math.max(lo.y,hi.y);
    const known=new Set(kingdoms.map(k=>k.id)), visible=new Set(),represented=new Set();
    for(const c of cells){
      if(!known.has(c.k))continue;
      represented.add(c.k);
      const x=Number(c.x),y=Number(c.y);
      if(x>=minX&&x<=maxX&&y>=minY&&y<=maxY)visible.add(c.k);
    }
    if(!detailed){
      const size=map.getSize(), radius=8.5;
      for(const k of kingdoms){
        if(represented.has(k.id)||k.anchor_x==null||k.anchor_y==null||Number(k.area)<1)continue;
        const p=map.latLngToContainerPoint(ll(Number(k.anchor_x),Number(k.anchor_y)));
        if(p.x>=-radius&&p.x<=size.x+radius&&p.y>=-radius&&p.y<=size.y+radius)visible.add(k.id);
      }
    }
    return visible.size;
  }
  function updateMapCount(){
    if(!map)return;
    const detailed=map.getZoom()>=17;
    $("map-count").textContent=countVisibleKingdoms()+" kraljevstava · "+
      (detailed?cells.length+" m² u prikazu":kingdoms.reduce((sum,k)=>sum+(Number(k.area)||0),0)+" m² ukupno");
  }
  function drawMap() {
    updateMapCount();
    const nextPaintKey=currentTerritoryPaintKey();
    if(nextPaintKey===territoryPaintKey){
      refreshBlockGrid();updateCursorPreview();return;
    }
    labelsLayer.clearLayers();
    borderLayer.clearLayers();
    towerOwners.clear();
    tilesLayer.clearLayers();
    const own = current?.kingdom?.id;
    const detailed = map.getZoom() >= 17;
    const byId = new Map(kingdoms.map(k => [k.id,k]));

    if (!detailed) {
      const represented=new Set(cells.map(c=>c.k));
      // Na regionalnom prikazu stvarni kvadrat od 1 m² ne može biti čitljiv:
      // čuva se precizna oznaka položaja bez glumljenja većeg teritorija.
      for (const k of kingdoms) {
        if (represented.has(k.id)||k.anchor_x == null || k.anchor_y == null || Number(k.area) < 1) continue;
        const center = ll(Number(k.anchor_x), Number(k.anchor_y));
        L.circleMarker([center.lat, center.lng], {
          radius: 8.5, stroke:false, fillColor: k.color,
          fillOpacity: 0.96, renderer: map._kzCanvasRenderer
        }).on("click", () => showKingdom(k)).addTo(labelsLayer);
      }
    }

    if (detailed||cells.length) {
      const grid = new Map(cells.map(c => [Number(c.x)+":"+Number(c.y), c.k]));
      // Obrisi se skupljaju u duge, spojene odsječke; nema debelih unutarnjih crta.
      const outline = new Map();
      const showWalls=map.getZoom()>=18;
      const useDryWalls=dryWallReady&&showWalls;
      const corners=useDryWalls&&towerReady?collectTowerCorners(grid,territoryCellBounds):null;
      const towers=corners?new Set(corners):null;
      for(const rect of mergeTerritoryCells(cells)){
        const k=byId.get(rect.k);
        if(!k)continue;
        const sw=ll(rect.x0,rect.y0),ne=ll(rect.x1,rect.y1);
        L.rectangle([[sw.lat,sw.lng],[ne.lat,ne.lng]],{
          stroke:false,fillColor:k.color,fillOpacity:0.58,
          interactive:true,renderer:map._kzCanvasRenderer
        }).on("click",event=>{
          L.DomEvent.stopPropagation(event);
          if(map.getZoom()>=18&&current?.kingdom&&current.kingdom.role!=="kralj"&&current.kingdom.id!==k.id&&!previewBusy&&!firstGpsBusy){
            chooseMapCentre(false,event.latlng);return;
          }
          showKingdom(k);
        }).addTo(tilesLayer);
      }
      const edge = (owner, axis, fixed, variable) => {
        const key = owner + "|" + axis + "|" + fixed;
        if (!outline.has(key)) outline.set(key, []);
        outline.get(key).push(variable);
      };
      for (const c of cells) {
        const x = Number(c.x), y = Number(c.y), k = byId.get(c.k);
        if (!k) continue;
        if (!showWalls) continue;
        if (useDryWalls) {
          if(isDryWallSide(c.k,grid.get((x-1)+":"+y),"W"))edge(c.k,"W",x,y);
          if(isDryWallSide(c.k,grid.get((x+1)+":"+y),"E"))edge(c.k,"E",x+1,y);
          if(isDryWallSide(c.k,grid.get(x+":"+(y-1)),"S"))edge(c.k,"S",y,x);
          if(isDryWallSide(c.k,grid.get(x+":"+(y+1)),"N"))edge(c.k,"N",y+1,x);
        } else {
          if (grid.get((x-1)+":"+y) !== c.k) edge(c.k,"V",x,y);
          if (grid.get((x+1)+":"+y) !== c.k) edge(c.k,"V",x+1,y);
          if (grid.get(x+":"+(y-1)) !== c.k) edge(c.k,"H",y,x);
          if (grid.get(x+":"+(y+1)) !== c.k) edge(c.k,"H",y+1,x);
        }
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
          if(useDryWalls){paintDryWall(axis,fixed,a,b+1);if(towers)addStraightTowerJoints(towers,corners,territoryCellBounds,axis,fixed,a,b+1);return;}
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
      if(towers){
        const metadata=new Map(cells.map(c=>[Number(c.x)+":"+Number(c.y),c]));
        for(const key of towers)paintTower(key,resolveTowerOwner(key,metadata));
      }
    }
    refreshBlockGrid(true);
    territoryPaintKey=nextPaintKey;
    updateCursorPreview();
    paintLivingWorld();
    $("map-hint").textContent = needsFirstGps() ? "Prvi blok: uključi GPS i odaberi svoju lokaciju." : detailed
      ? "Fantasy granice na pravoj karti · 20 m² po bloku · POSTAVI u joysticku."
      : "Dodirni mjesto na karti i postavi blok joystickom.";

  }
  function updateMapXY() {
    if(!map)return;
    const center=map.getCenter();
    // Isti centralni X/Y kvadrat koristi se za teritorij i za svakog čuvara.
    const {x:gridX,y:gridY}=window.KZWorldRegistry.blockFor(center.lat,center.lng);
    const element=$("kz-map-xy");
    if(element)element.textContent="X "+gridX+" · Y "+gridY;
  }
  function setupCompassTravel(){
    const compass=$("kz-travel-compass"),arrow=$("kz-compass-arrow");
    if(!compass||!arrow)return;
    let heading=0,running=false,timer=null,gesture=null,lastSteer=0;
    const radians=()=>heading*Math.PI/180;
    function positionArrow(){
      const radius=compass.clientWidth/2+5;
      arrow.style.left=`calc(50% + ${Math.sin(radians())*radius}px)`;
      arrow.style.top=`calc(50% + ${-Math.cos(radians())*radius}px)`;
      arrow.style.transform=`translate(-50%,-50%) rotate(${heading}deg)`;
      arrow.setAttribute("aria-pressed",String(running));
      const names=["sjever","sjeveroistok","istok","jugoistok","jug","jugozapad","zapad","sjeverozapad"];
      const label="Drži za putovanje · "+names[Math.round(heading/45)%8]+" · povuci za smjer, pusti za zaustavljanje";
      arrow.setAttribute("aria-label",label);arrow.title=label;
    }
    function stopTravel(){
      if(!running)return;
      running=false;clearTimeout(timer);timer=null;map.stop();positionArrow();
    }
    function travelStep(){
      if(!running)return;
      if(document.hidden){stopTravel();return;}
      const zoom=map.getZoom(),center=map.project(map.getCenter(),zoom);
      const speed=Math.max(350,Math.min(850,Math.max(map.getSize().x,map.getSize().y)*1.15));
      const distance=speed*.75;
      const target=L.point(center.x+Math.sin(radians())*distance,center.y-Math.cos(radians())*distance);
      // Keep the traveller within the extended fantasy world's geographic extent.
      const nw=map.project([90,-180],zoom),se=map.project([-90,180],zoom);
      target.x=Math.max(nw.x,Math.min(se.x,target.x));
      target.y=Math.max(nw.y,Math.min(se.y,target.y));
      const offset=target.subtract(center).round();
      if(!offset.x&&!offset.y){stopTravel();return;}
      map.panBy(offset,{animate:true,duration:.75,easeLinearity:1});
      timer=setTimeout(travelStep,790);
    }
    function startTravel(){
      if(running)return;
      running=true;positionArrow();lastSteer=performance.now();travelStep();
    }
    function steer(angle){
      const next=(angle%360+360)%360;
      const change=Math.abs((next-heading+540)%360-180);
      heading=next;positionArrow();
      if(running&&change>=8&&performance.now()-lastSteer>=150){
        lastSteer=performance.now();clearTimeout(timer);map.stop();travelStep();
      }
    }
    arrow.addEventListener("pointerdown",e=>{
      if(!e.isPrimary||e.button!==0)return;
      e.preventDefault();e.stopPropagation();
      gesture={id:e.pointerId,x:e.clientX,y:e.clientY,dragged:false};
      arrow.setPointerCapture(e.pointerId);
      startTravel();
    });
    arrow.addEventListener("pointermove",e=>{
      if(!gesture||gesture.id!==e.pointerId)return;
      if(!gesture.dragged&&Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)<5)return;
      gesture.dragged=true;e.preventDefault();
      const r=compass.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2;
      if(Math.hypot(dx,dy)<8)return;
      steer(Math.atan2(dx,-dy)*180/Math.PI);
    });
    arrow.addEventListener("pointerup",e=>{
      if(!gesture||gesture.id!==e.pointerId)return;
      e.preventDefault();e.stopPropagation();
      gesture=null;stopTravel();
    });
    const cancelGesture=()=>{gesture=null;stopTravel();};
    arrow.addEventListener("pointercancel",cancelGesture);
    arrow.addEventListener("lostpointercapture",()=>{if(gesture)cancelGesture();});
    arrow.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();});
    arrow.addEventListener("keydown",e=>{
      if(e.key==="Escape"){e.preventDefault();stopTravel();return;}
      if(e.key===" "||e.key==="Enter"){e.preventDefault();if(!e.repeat)startTravel();return;}
      const turns={ArrowUp:0,ArrowRight:90,ArrowDown:180,ArrowLeft:270};
      if(Object.prototype.hasOwnProperty.call(turns,e.key)){e.preventDefault();steer(turns[e.key]);}
    });
    arrow.addEventListener("keyup",e=>{
      if(e.key===" "||e.key==="Enter"){e.preventDefault();stopTravel();}
    });
    arrow.addEventListener("blur",stopTravel);
    window.addEventListener("blur",cancelGesture);
    map.getContainer().addEventListener("pointerdown",stopTravel,{capture:true});
    map.getContainer().addEventListener("wheel",stopTravel,{capture:true,passive:true});
    map.on("zoomstart dragstart",stopTravel);
    // The existing joystick and explicit map actions take priority over travel.
    document.querySelector(".map-panel")?.addEventListener("pointerdown",e=>{
      if(!compass.contains(e.target)&&e.target.closest("button"))stopTravel();
    },true);
    document.addEventListener("visibilitychange",()=>{if(document.hidden)stopTravel();});
    window.addEventListener("pagehide",stopTravel);
    window.addEventListener("resize",positionArrow);
    positionArrow();
}
  function initMap() {
    if (!window.L) throw Error("Karta Leaflet nije učitana");
    // Preserve the normal Web Mercator map, but allow fictional discoveries beyond its tile edge.
    // The projection's original bounds remain unchanged for the real OSM tile grid.
    const earthlyProjection=L.Projection.SphericalMercator;
    const extendedProjection=Object.create(earthlyProjection);
    const edgeLat=earthlyProjection.MAX_LATITUDE;
    const edgePoint=earthlyProjection.project(L.latLng(edgeLat,0)).y;
    const edgeScale=earthlyProjection.R*Math.PI/180/Math.cos(edgeLat*Math.PI/180);
    extendedProjection.project=function(latlng){
      if(Math.abs(latlng.lat)<=edgeLat)return earthlyProjection.project(latlng);
      return L.point(this.R*latlng.lng*Math.PI/180,
        Math.sign(latlng.lat)*(edgePoint+(Math.abs(latlng.lat)-edgeLat)*edgeScale));
    };
    extendedProjection.unproject=function(point){
      if(Math.abs(point.y)<=edgePoint)return earthlyProjection.unproject(point);
      return L.latLng(Math.sign(point.y)*(edgeLat+(Math.abs(point.y)-edgePoint)/edgeScale),
        point.x/this.R*180/Math.PI);
    };
    // Explicitly use the extended projection for both directions of every pixel conversion.
    const fantasyCRS=L.extend({},L.CRS.EPSG3857,{
      projection:extendedProjection,
      wrapLng:undefined,
      latLngToPoint(latlng,zoom){
        return this.transformation.transform(extendedProjection.project(L.latLng(latlng)),this.scale(zoom));
      },
      pointToLatLng(point,zoom){
        return extendedProjection.unproject(this.transformation.untransform(point,this.scale(zoom)));
      },
      project(latlng){return extendedProjection.project(L.latLng(latlng));},
      unproject(point){return extendedProjection.unproject(point);}
    });
    // Keep pinch zoom within the actual map limits, including during the gesture.
    // Game-like flick scrolling: slow drags stay precise, quick swipes coast and ease out.
    // Leaflet stops inertia on the next touch; compass and joystick keep their own controls.
    map = L.map("kingdom-map",{
      crs:fantasyCRS,zoomControl:true,worldCopyJump:false,minZoom:2,maxZoom:21,bounceAtZoomLimits:false,
      inertia:true,inertiaDeceleration:1700,inertiaMaxSpeed:1100,easeLinearity:.25
    }).setView([43.5,17.3],7);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      minZoom:2,maxZoom:21,maxNativeZoom:19,noWrap:true,attribution:'&copy; OpenStreetMap'
    }).addTo(map);
    // Secret island: use the same X/Y block indices as the visible coordinate counter.
    const lotarCentre=ll(600652*5+2.5,1832429*4+2);
    const lotarPoint=extendedProjection.project(L.latLng(lotarCentre.lat,lotarCentre.lng));
    const halfWidth=250/Math.cos(Math.min(edgeLat,Math.abs(lotarCentre.lat))*Math.PI/180);
    const halfHeight=halfWidth*2/3;
    const lotarBounds=L.latLngBounds(
      extendedProjection.unproject(L.point(lotarPoint.x-halfWidth,lotarPoint.y-halfHeight)),
      extendedProjection.unproject(L.point(lotarPoint.x+halfWidth,lotarPoint.y+halfHeight))
    );
    map.createPane("kz-lotar-pane").style.zIndex="250";
    map.getPane("kz-lotar-pane").style.pointerEvents="none";
    L.imageOverlay("./media/lotar.webp",lotarBounds,{pane:"kz-lotar-pane",interactive:false,opacity:1,alt:"Kraljevstvo Lotar"}).addTo(map);
    map._kzCanvasRenderer = L.canvas({ padding: .1 });
    tilesLayer = L.layerGroup().addTo(map);
    blockGridLayer = L.layerGroup().addTo(map);
    borderLayer = L.layerGroup().addTo(map);
    map.createPane("kz-dry-wall-pane").style.zIndex="430";
    map.getPane("kz-dry-wall-pane").style.pointerEvents="none";
    map.createPane("kz-tower-pane").style.zIndex="440";
    map.getPane("kz-tower-pane").style.pointerEvents="none";
    prepareDryWalls();
    prepareTowers();
    labelsLayer = L.layerGroup().addTo(map);
    previewLayer = L.layerGroup().addTo(map);
    lifeLayer = L.layerGroup().addTo(map);
    updateMapXY();
    setupCompassTravel();
    window.dispatchEvent(new CustomEvent("kz:map-ready", {detail:{map}}));
    let timer;
    map.on("moveend zoomend", () => {
      updateMapCount();
      refreshBlockGrid();
      updateCursorPreview();
      clearTimeout(timer);
      if(initialMapReady)timer=setTimeout(reloadMap,180);
    });
    // Oznaka slijedi kartu dok je korisnik povlači, bez ažuriranja DOM-a 60x/s.
    let xyFrame=0;
    map.on("move zoom",()=>{
      if(xyFrame)return;
      xyFrame=requestAnimationFrame(()=>{xyFrame=0;updateMapXY();});
    });
    map.on("click",e=>{
      if(map.getZoom()<18||!current?.kingdom||(needsFirstGps()&&!firstGpsFlexible())||cursorSpawnMode&&!firstGpsFlexible()||previewBusy||firstGpsBusy)return;
      chooseMapCentre(false,e.latlng);
    });
  }
  function showKingdom(k) {
    const mine = current?.kingdom?.id === k.id;
    const request = !current?.kingdom && !mine;
    modal(k.name, '<p><b style="color:' + safe(k.color) + '">●</b> ' +
      formatArea(k.area) + ' · ' + Number(k.members) + '/10 članova</p>' +
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

  // Prvi blok određuje GPS; naknadna uporišta zadržavaju odabir na karti.
  function readFirstGps(){
    return new Promise((resolve,reject)=>{
      if(!window.isSecureContext||!navigator.geolocation)return reject(Error("Za novo uporište potreban je GPS na sigurnoj HTTPS vezi."));
      navigator.geolocation.getCurrentPosition(p=>{
        const c=p.coords;
        if(!Number.isFinite(c.latitude)||!Number.isFinite(c.longitude)||Math.abs(c.latitude)>85||Math.abs(c.longitude)>180||!Number.isFinite(c.accuracy)||c.accuracy<0||c.accuracy>100||Date.now()-p.timestamp>15000)return reject(Error("GPS nije dovoljno precizan ili svjež. Pokušaj ponovno (do 100 m)."));
        resolve({lat:c.latitude,lon:c.longitude,accuracy:c.accuracy});
      },e=>reject(Error("GPS je obvezan za novo uporište. "+e.message)),{enableHighAccuracy:true,maximumAge:0,timeout:20000});
    });
  }
  async function firstGpsZone(fix){
    if(!needsFirstGps())return {...fix,radius:0};
    const zone=await rpc("kz_first_spawn_zone",args({p_lat:fix.lat,p_lon:fix.lon,p_accuracy:fix.accuracy}));
    return {...fix,radius:Number(zone.radius_m),suggested:{x:Number(zone.x),y:Number(zone.y)}};
  }
  function showFirstGps(fix){
    firstGpsFix=fix;
    const point=xy(fix.lat,fix.lon);
    cursor=fix.suggested||alignBlock(point.x,point.y);cursorSpawnMode=true;
    map.setView(previewCentre(cursor),Math.max(map.getZoom(),20));
    updateCursorPreview();
    $("gps-status").textContent=firstGpsFlexible()?"GPS blok zauzet · odaberi slobodan blok do "+fix.radius+" m":"GPS pronađen · preciznost "+Math.round(fix.accuracy)+" m";
  }
  async function chooseFirstGps(){
    if(firstGpsBusy||previewBusy||current?.kingdom?.role!=="kralj")return;
    firstGpsBusy=true;firstGpsFix=null;cursor=null;cursorSpawnMode=false;updateCursorPreview();
    $("gps-status").textContent="Tražim GPS lokaciju…";
    try{const fix=await firstGpsZone(await readFirstGps());if(current?.kingdom?.role==="kralj"){showFirstGps(fix);await reloadMap();toast(fix.radius>0?"GPS blok je zauzet. Odaberi slobodan blok unutar "+fix.radius+" m.":"Pronađena GPS lokacija. Pritisni POSTAVI za novo uporište.");}}
    catch(e){$("gps-status").textContent="GPS nije dostupan";toast(e.message);}
    finally{firstGpsBusy=false;updateCursorPreview();}
  }
  function chooseMapCentre(remote=false,position=null) {
    if (!current?.kingdom) return toast("Prvo se pridruži kraljevstvu.");
    if(needsFirstGps()&&!firstGpsFlexible()){chooseFirstGps();return;}
    const centre=position||map.getCenter();
    const projected=xy(centre.lat,centre.lng);
    const candidate=alignBlock(projected.x,projected.y);
    if(!gpsAllows(candidate))return toast("Odaberi blok unutar "+firstGpsFix.radius+" m od GPS lokacije.");
    cursor=candidate;
    if(!firstGpsFlexible()){cursorSpawnMode=false;firstGpsFix=null;}
    if (map.getZoom()<19) map.setView(previewCentre(cursor),20);
    else map.panTo(previewCentre(cursor));
    updateCursorPreview();

  }
  // Mreža je globalno poravnata: svaka pločica uvijek zauzima 5 × 4 = 20 m².
  function refreshBlockGrid(force=false) {
    if(!map||!blockGridLayer)return;
    const zoom=map.getZoom();
    if(zoom<19){
      if(blockGridPaintKey!==null){blockGridLayer.clearLayers();blockGridPaintKey=null;}
      return;
    }
    const bounds=map.getBounds();
    const sw=xy(bounds.getSouth(),bounds.getWest()),ne=xy(bounds.getNorth(),bounds.getEast());
    const left=Math.floor(Math.min(sw.x,ne.x)/5)*5;
    const right=Math.floor(Math.max(sw.x,ne.x)/5)*5;
    const bottom=Math.floor(Math.min(sw.y,ne.y)/4)*4;
    const top=Math.floor(Math.max(sw.y,ne.y)/4)*4;
    const key=[zoom,left,right,bottom,top].join(":");
    if(!force&&key===blockGridPaintKey)return;
    blockGridPaintKey=key;
    blockGridLayer.clearLayers();
    const estimated=(Math.floor((right-left)/5)+1)*(Math.floor((top-bottom)/4)+1);
    if(estimated>950)return;
    // Draw each grid line just once rather than four edges for every square.
    // Interior lines retain the effective opacity of the original doubled edges.
    const outer=[],inner=[];
    for(let x=left;x<=right+5;x+=5)
      (x===left||x===right+5?outer:inner).push([ll(x,bottom),ll(x,top+4)]);
    for(let y=bottom;y<=top+4;y+=4)
      (y===bottom||y===top+4?outer:inner).push([ll(left,y),ll(right+5,y)]);
    for(const [lines,opacity] of [[outer,.45],[inner,.6975]]){
      if(lines.length)L.polyline(lines,{color:"#e8d29c",weight:.85,opacity,interactive:false,
        renderer:map._kzCanvasRenderer}).addTo(blockGridLayer);
    }
    if(zoom>=21&&estimated<=175)
    for(let x=left;x<=right;x+=5)for(let y=bottom;y<=top;y+=4) {
      // Pri izrazito bliskom zumu svaki pojedini kvadrat diskretno nosi X/Y.
      // Pri daljem zumu ostaje samo mala oznaka središta karte.
      if(map.getZoom()>=21 && estimated<=175){
        const center=ll(x+2.5,y+2);
        L.marker([center.lat,center.lng],{
          icon:L.divIcon({
            className:"kz-grid-xy-label",
            html:"X "+Math.floor(x/5)+"<span>Y "+Math.floor(y/4)+"</span>",
            iconSize:[68,20],iconAnchor:[34,10]
          }),
          interactive:false,keyboard:false
        }).addTo(blockGridLayer);
      }
    }
  }
  function blockStatus(b) {
    if(!b)return {text:"Pomakni kartu i odaberi mjesto.",kind:"unknown"};
    if(!gpsAllows(b))return {text:"Izvan dopuštenog GPS kruga.",kind:"outside"};
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
      return {text:"Blok nije uz granicu.",kind:"unconnected"};
    if(owners.length===1){
      if([...battleMarkers.values()].some(e=>Number(e.battle.x)===b.x&&Number(e.battle.y)===b.y))
        return {text:"Na tom bloku već traje okršaj.",kind:"battle_busy"};
      return {text:"⚔ NAPAD: suparnički blok 20 m², cijena 100 m².",kind:"attack"};
    }
    if(current?.kingdom?.role!=="kralj")return {text:"Slobodne blokove može postavljati samo kralj kvizaš.",kind:"king_only"};
    return {text:"Slobodan blok 20 m², cijena 20 m².",kind:"free"};
  }
  function updateCursorPreview() {
    if (!map || !previewLayer) return;
    previewLayer.clearLayers();
    if(firstGpsFlexible())L.circle([firstGpsFix.lat,firstGpsFix.lon],{radius:firstGpsFix.radius,color:"#80caff",weight:2,fill:false,dashArray:"8 5",interactive:false}).addTo(previewLayer);
    const btn=$("claim-block");
    const label=$("cursor-status");
    const isKing=current?.kingdom?.role==="kralj";
    const gpsButton=$("gps-outpost-btn");
    if(gpsButton){
      gpsButton.classList.toggle("hidden",!isKing||needsFirstGps());
      gpsButton.disabled=!isKing||needsFirstGps()||Number(current?.kingdom?.bank||0)<20||firstGpsBusy||previewBusy;
    }
    const showPlacement=!!current?.kingdom&&map.getZoom()>=18;
    $("joystick-panel")?.classList.toggle("hidden",!showPlacement);
    if(!showPlacement){if(btn)btn.disabled=true;return;}
    if(!cursor) {
      if(label)label.textContent=needsFirstGps()?"Pritisni POSTAVI za GPS.":isKing?"Dodirni mjesto na karti.":"Odaberi protivnički blok uz granicu.";
      if(btn){btn.textContent="POSTAVI";btn.disabled=!(isKing&&needsFirstGps()&&!firstGpsBusy&&!previewBusy);btn.title=needsFirstGps()?"Pronađi svoju GPS lokaciju":"Postavi blok";btn.setAttribute("aria-label",btn.title);}
      return;
    }
    const status=blockStatus(cursor);
    const bank=Number(current?.kingdom?.bank||0);
    const cost=status.kind==="attack"?100:20;
    const valid=["free","attack"].includes(status.kind)&&!(status.kind==="attack"&&(territoryDuel||duelResumeButton&&!duelResumeButton.hidden))&&bank>=cost&&(!(needsFirstGps()||cursorSpawnMode)||!!firstGpsFix)&&!firstGpsBusy&&!previewBusy;
    document.querySelectorAll("[data-joy]").forEach(b=>b.disabled=gpsLocked()||firstGpsBusy||previewBusy);
    if(label)label.textContent=status.kind==="attack"?"⚔ Napad · 100 m²":
      status.kind==="free"?(firstGpsFlexible()?"Prvi blok · unutar "+firstGpsFix.radius+" m":cursorSpawnMode?"GPS uporište · 20 m²":"Nadogradnja · 20 m²"):
      status.kind==="outside"?"⚠ Izvan GPS kruga":status.kind==="own"?"Već osvojeno":status.kind==="unconnected"?"⚠ Nije uz granicu":status.kind==="king_only"?"Slobodne blokove postavlja kralj kvizaš":status.kind==="battle_busy"?"Okršaj je već u tijeku":"Blok je zauzet";
    if(label && ["free","attack"].includes(status.kind) && bank<cost)label.textContent="Nedovoljno m² na kontu";
    if(btn) {
      btn.disabled=!valid;
      btn.textContent=status.kind==="attack"?"NAPADNI":"POSTAVI";
      btn.title=status.kind==="unconnected"?"Blok nije uz granicu":status.kind==="attack"?"Okršaj znanja: ulog 100 m², 1 točan ako je protivničko konto prazno, inače 3":"Zauzmi slobodni blok od 20 m² za 20 m²";
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
    if(!map||map.getZoom()<18||!current?.kingdom)return;
    if(gpsLocked())return toast("GPS uporište ne možeš pomicati. Određuje ga GPS.");
    if(!cursor){ chooseMapCentre(false);if(!cursor)return; }
    const dir={N:[0,4],S:[0,-4],E:[5,0],W:[-5,0]}[direction];
    if(!dir)return;
    const candidate={x:cursor.x+dir[0],y:cursor.y+dir[1]};
    if(!gpsAllows(candidate))return toast("Dosegnut je rub dopuštenog GPS kruga.");
    cursor=candidate;
    map.setView(previewCentre(cursor),Math.max(map.getZoom(),19));
    updateCursorPreview();
  }
  async function saveBlock() {
    if(!map||map.getZoom()<18||previewBusy||firstGpsBusy||!current?.kingdom)return;
    if(needsFirstGps()&&!firstGpsFix){await chooseFirstGps();return;}
    if(!cursor)return;
    const status=blockStatus(cursor);
    if(status.kind==="attack"&&(territoryDuel||duelResumeButton&&!duelResumeButton.hidden)){toast("Prvo završi svoj trenutni okršaj.");return;}
    if(status.kind==="unconnected"){updateCursorPreview();return;}
    const cost=status.kind==="attack"?100:20;
    if(!["free","attack"].includes(status.kind)||Number(current.kingdom.bank)<cost)
      return toast("Odabrani blok nije moguće zauzeti.");
    const question=status.kind==="attack"?"Pokrenuti Okršaj znanja za 100 m²? Osvoji blok s 1 točnim odgovorom ako je protivničko konto prazno na početku napada, inače s 3 točna. Najviše 8 pitanja. Točan odgovor: protivnik gubi 20 m². Pogrešan ili istek: tvoje kraljevstvo gubi 20 m². Pobjeda vraća 100 m².":
      (cursorSpawnMode&&!needsFirstGps()?"Postaviti udaljeno uporište od 20 m² za 20 m² s konta?":"Zauzeti odabrani blok od 20 m² za 20 m² s konta?");
    if(!confirm(firstGpsFlexible()?"Postaviti odabrani prvi blok od 20 m² unutar "+firstGpsFix.radius+" m od GPS lokacije?":needsFirstGps()||cursorSpawnMode?"Postaviti uporište od 20 m² na tvojoj trenutnoj GPS lokaciji?":question))return;
    previewBusy=true;$("claim-block").disabled=true;
    try{
      let gpsParams={};
      if(needsFirstGps()||cursorSpawnMode){
        const kingdomId=current.kingdom.id;
        const selected={...cursor},wasFlexible=firstGpsFlexible();
        const fix=await firstGpsZone(await readFirstGps());
        if(current?.kingdom?.role!=="kralj"||current.kingdom.id!==kingdomId)throw Error("Stanje kraljevstva se promijenilo. Pokušaj ponovno.");
        if(wasFlexible&&fix.radius>0){
          firstGpsFix=fix;
          if(!gpsAllows(selected)){showFirstGps(fix);await reloadMap();throw Error("GPS krug se promijenio. Odaberi novi blok.");}
          cursor=selected;
        }else if(wasFlexible||fix.radius>0){
          showFirstGps(fix);await reloadMap();throw Error("Dopuštena GPS lokacija se promijenila. Potvrdi novi odabir.");
        }else showFirstGps(fix);
        gpsParams={p_lat:fix.lat,p_lon:fix.lon,p_accuracy:fix.accuracy};
      }
      const params={p_x:cursor.x,p_y:cursor.y,p_spawn:cursorSpawnMode||Number(current.kingdom.area||0)===0,...gpsParams};
      if(status.kind==="attack"){
        const out=await rpc("kz_territory_duel",args({p_action:"start",p_x:params.p_x,p_y:params.p_y}));
        if(out){setDuelResume(out.status==="active");renderTerritoryDuel(out);}
        await reloadState();return;
      }
      const result=await rpc("kz_place_block",args(params));
      cursorSpawnMode=false;firstGpsFix=null;
      cursor={x:cursor.x+5,y:cursor.y};
      toast((result.attack?"⚔ Osvojen tuđi blok! ":"✓ Osvojen novi blok! ")+
        formatArea(result.added)+" · trošak "+formatArea(result.spent));
      await reloadState();await reloadMap();
    }catch(e){toast(e.message);}
    finally{previewBusy=false;updateCursorPreview();}
  }

  // Territory duels are separate from the regular ten-question game.
  function setDuelResume(active){
    if(duelResumeButton)duelResumeButton.hidden=!active;
    if(map)updateCursorPreview();
  }
  async function openLiveBattle(id,action){
    if(duelLoading||territoryDuel)return;
    if(mainQuizSession){toast("Prvo završi ili zatvori trenutni kviz.");return;}
    duelLoading=true;
    try{
      const out=await rpc("kz_territory_duel",args({p_action:action,p_id:id}));
      setDuelResume(out?.status==="active");
      if(out)renderTerritoryDuel(out);
    }catch(e){toast(e.message);}
    finally{duelLoading=false;}
  }
  async function resumeTerritoryDuel(){await openLiveBattle(null,"resume");}
  function roundMark(v){return v===true?"✓":v===false?"✕":"—";}
  function battleRounds(q){
    return '<div class="kz-battle-rounds"><strong>Rezultati po pitanjima</strong><div class="kz-battle-table">'+
      '<span>Pitanje</span><span>⚔ Napadač</span><span>🛡 Branitelj</span><span>Napredak</span>'+
      (q.rounds||[]).map(r=>'<span>'+r.position+'.</span><span class="'+(r.attacker_correct?"kz-battle-good":"kz-battle-bad")+'">'+roundMark(r.attacker_correct)+'</span>'+
        '<span class="'+(r.defender_correct===true?"kz-battle-good":r.defender_correct===false?"kz-battle-bad":"")+'">'+roundMark(r.defender_correct)+'</span><span>'+r.progress+' / '+q.required_hits+'</span>').join("")+'</div></div>';
  }
  function duelSummary(q){
    const rows=q.rounds||[], ac=rows.filter(r=>r.attacker_correct===true).length, dc=rows.filter(r=>r.defender_correct===true).length;
    return '<div class="kz-battle-score"><div><small>⚔ '+safe(q.attacker_realm||"Napadač")+'</small><b>'+q.hits+' / '+q.required_hits+'</b><small>'+safe(q.attacker_name||"")+' · ✓ '+ac+'</small></div>'+
      '<div><small>🛡 '+safe(q.defender_realm||"Branitelj")+'</small><b>'+dc+'</b><small>'+safe(q.defender_name||"Bez aktivnog branitelja")+'</small></div></div>'+
      '<p class="member-meta">Napad: −'+formatArea(100+Number(q.attack_loss||0))+' s ulogom · Obrana: −'+formatArea(q.defense_loss)+'</p>';
  }
  async function showDuelResult(q){
    const previous=territoryDuel;
    if(previous){clearInterval(previous.timer);clearInterval(previous.poll);}
    territoryDuel=null;setDuelResume(false);
    const won=q.status==="won", defender=q.side==="defender";
    const title=q.status==="invalid"?"Okršaj prekinut":q.insufficient_bank?"Nema dovoljno m²":won?"⚔ Blok osvojen!":"🛡 Teritorij obranjen!";
    modal(title,duelSummary(q)+battleRounds(q)+
      '<p>'+(q.status==="invalid"?"Ulog vraćen.":won?"Napadač dobiva 100 m² i osvaja blok od 20 m².":"Napadač gubi početni ulog od 100 m².")+'</p>'+
      '<section id="kz-duel-review"><p>Učitavam završni pregled…</p></section>'+
      '<button class="primary" id="kz-duel-close">Povratak kraljevstvu</button>');
    $("dialog").classList.add("kz-quiz-dialog");
    $("kz-duel-close").onclick=closeModal;
    const review=$("kz-duel-review");
    void reloadState().then(reloadMap).catch(console.warn);
    try{
      const rows=await rpc("kz_territory_duel",args({p_action:"review",p_id:q.id}));
      if($("kz-duel-review")!==review)return;
      if(!Array.isArray(rows)||!rows.length){review.innerHTML='<p class="member-meta">Završni pregled pitanja više nije dostupan.</p>';return;}
      review.innerHTML='<button class="secondary" id="kz-duel-pdf">📄 Spremi PDF</button><h3>Pitanja i odgovori</h3>'+
        rows.map(r=>historyRow(r,q.id).replace('<div class="kz-history-status">','<div class="member-meta">⚔ Napadač: '+safe(r.attacker_choice||"—")+' '+roundMark(r.attacker_correct)+' · 🛡 Branitelj: '+safe(r.defender_choice||"—")+' '+roundMark(r.defender_correct)+'</div><div class="kz-history-status">')).join("");
      bindHistory(review,rows,q.id);
      $("kz-duel-pdf").onclick=()=>printDuelReview(q,rows);
    }catch(e){if($("kz-duel-review")===review)review.textContent=e.message;}
  }
  function printDuelReview(q,rows){
    const frame=document.createElement("iframe");frame.style.cssText="position:fixed;width:0;height:0;border:0;right:0;bottom:0";
    document.body.append(frame);
    const doc=frame.contentDocument;
    const body='<h1>Kraljevstvo znanja – okršaj</h1><p>'+safe(q.attacker_realm)+' protiv '+safe(q.defender_realm)+'</p><p>Napredak: '+q.hits+' / '+q.required_hits+' · '+(q.status==="won"?"Blok osvojen":"Teritorij obranjen")+'</p>'+
      rows.map(r=>'<section><h3>'+r.position+'. '+safe(r.prompt)+'</h3>'+["A","B","C"].map(k=>'<div style="'+(k===r.correct_key?"color:#176b36;font-weight:bold":"")+'">'+k+') '+safe(r.options?.[k])+(k===r.correct_key?" ✓":"")+'</div>').join("")+
      '<p>Napadač: '+safe(r.attacker_choice||"—")+' '+roundMark(r.attacker_correct)+' | Branitelj: '+safe(r.defender_choice||"—")+' '+roundMark(r.defender_correct)+'</p></section>').join("");
    doc.open();doc.write('<!doctype html><html lang="hr"><head><meta charset="utf-8"><title>Okršaj znanja</title><style>body{font:14px/1.45 Arial,sans-serif;margin:24px;color:#222}section{break-inside:avoid;border-top:1px solid #bbb;padding:8px 0}h3{margin:0 0 8px}h1{font-size:22px}</style></head><body>'+body+'</body></html>');doc.close();
    const win=frame.contentWindow;win.addEventListener("afterprint",()=>frame.remove(),{once:true});
    win.focus();win.print();
  }
  function renderTerritoryDuel(q){
    if(q.status!=="active"){void showDuelResult(q);return;}
    let session=territoryDuel;
    if(!session||session.q.id!==q.id){
      if(session){clearInterval(session.timer);clearInterval(session.poll);}
      session={q,busy:false,done:false,timer:null,poll:null,signature:"",deadline:0,defenderOnline:q.defender_online};
      territoryDuel=session;setDuelResume(true);
      const tick=()=>{
        if(territoryDuel!==session)return;
        const clock=$("kz-duel-clock");if(!clock)return;
        const seconds=Math.max(0,Math.ceil((session.deadline-Date.now())/1000));
        clock.textContent="⏱ "+seconds+" s";clock.classList.toggle("urgent",seconds<=3);
      };
      session.timer=setInterval(tick,150);
      session.poll=setInterval(()=>updateLiveBattle(session,"state"),1000);
    }
    if(q.side==="attacker"&&q.defender_online&&!session.defenderOnline)toast("🛡 Branitelj je online i brani teritorij!");
    session.defenderOnline=q.defender_online;
    session.q=q;session.done=!!q.submitted||!!q.intermission;
    session.deadline=Date.now()+Math.max(0,Number(q.remaining_ms)||0);
    const sig=JSON.stringify([q.position,q.submitted,q.opponent_submitted,q.intermission,q.defender_online,q.rounds,q.hits]);
    if(sig===session.signature)return;
    session.signature=sig;
    const defended=q.defender_online;
    const notice=defended?'<p class="kz-live-defense">🛡 Branitelj se uključio · '+safe(q.defender_name||"")+'</p>':'<p class="member-meta">Trenutno nema aktivnog branitelja.</p>';
    const question=q.intermission?'<p class="kz-live-defense">Runda završena · sljedeće pitanje…</p>':
      '<p id="kz-duel-clock" class="kz-question-clock" role="timer">⏱ '+Math.ceil((q.remaining_ms||0)/1000)+' s</p>'+
      '<p class="quiz-question">'+safe(q.prompt)+'</p>'+
      (q.image?'<img class="question-image" src="'+safe(q.image)+'" alt="Slika uz pitanje">':'')+
      '<div class="kz-answer-list">'+["A","B","C"].map(key=>'<button class="option" data-duel-answer="'+key+'" '+(q.submitted?"disabled":"")+'>'+key+') '+safe(q.options?.[key]||"")+'</button>').join("")+'</div>'+
      (q.submitted?'<p class="kz-live-defense">Odgovor je zaključan. Čekam završetak runde…</p>':q.opponent_submitted?'<p class="member-meta">Protivnik je odgovorio.</p>':'');
    modal(q.side==="defender"?"🛡 Obrana teritorija":"⚔ Okršaj znanja",'<div class="quiz-progress">PITANJE '+q.position+' / 8</div>'+notice+
      question+duelSummary(q)+battleRounds(q));
    $("dialog").classList.add("kz-quiz-dialog");
    document.querySelectorAll("[data-duel-answer]").forEach(b=>b.onclick=()=>updateLiveBattle(session,"answer",b.dataset.duelAnswer));
  }
  async function updateLiveBattle(session,action,key){
    if(territoryDuel!==session||session.busy)return;
    if(action==="answer"&&(session.done||session.q.submitted||session.q.intermission))return;
    session.busy=true;
    if(action==="answer")document.querySelectorAll("[data-duel-answer]").forEach(b=>b.disabled=true);
    try{
      const out=await rpc("kz_territory_duel",args({p_action:action,p_id:session.q.id,
        ...(action==="answer"?{p_number:session.q.position,p_choice:key}:{})}));
      if(territoryDuel===session&&out)renderTerritoryDuel(out);
    }catch(e){
      if(territoryDuel===session&&action==="answer"){toast(e.message);document.querySelectorAll("[data-duel-answer]").forEach(b=>b.disabled=false);}
    }finally{session.busy=false;}
  }
  async function showBattleHistory(){
    if(territoryDuel||mainQuizSession){toast("Prvo zatvori trenutni okršaj ili kviz.");return;}
    modal("Povijest događaja","<p>Učitavam okršaje…</p>");
    const loading=$("dialog-body").firstElementChild;
    try{
      const rows=await rpc("kz_battle_history",args());
      if($("dialog-body").firstElementChild!==loading)return;
      modal("Povijest događaja",rows.length?rows.map(q=>'<article class="member"><b>'+dateTime(q.at)+' · '+(q.status==="won"?"⚔ Blok osvojen":q.status==="lost"?"🛡 Blok obranjen":"Okršaj prekinut")+'</b>'+
        '<p>'+safe(q.attacker)+' → '+safe(q.defender)+'</p><div class="member-meta">Napadač: '+safe(q.attacker_name||"—")+' · ✓ '+q.attacker_correct+' · ✕ '+q.attacker_wrong+'</div>'+
        '<div class="member-meta">Branitelj: '+safe(q.defender_name||"Bez aktivnog branitelja")+' · ✓ '+q.defender_correct+' · ✕ '+q.defender_wrong+'</div>'+
        '<div class="member-meta">Napredak '+q.hits+' / '+q.required_hits+' · X '+q.x+' · Y '+q.y+'</div></article>').join(""):'<p>Još nema okršaja.</p>');
    }catch(e){if($("dialog-body").firstElementChild===loading)toast(e.message);}
  }

  // Isti obrasci povijesti, reakcija i primjedbi kao u glavnom Online kvizu.
  function answerLabel(q,key) {
    return key==="SKIP"?"Bez odgovora":key && q?.options ? (q.options[key] || key) : "—";
  }
  function completedPart(questions,game) {
    const correct=Number(game?.correct??questions.filter(q=>q.correct).length);
    const wrong=Number(game?.wrong??(questions.length-correct));
    const earned=Number(game?.earned??questions.reduce((sum,q)=>sum+Number(q.earned||0),0));
    const total=correct+wrong;
    modal("Rezultat kviza",'<div class="kz-final-score"><strong>'+correct+' / '+total+
      '</strong><span>točnih odgovora</span><b>+'+formatArea(earned)+'</b></div>'+
      '<p>Točni: '+correct+' · Netočni: '+wrong+'</p>'+
      '<p>Sljedećih 10 pitanja dostupno je četiri sata nakon završetka ove partije.</p>'+
      '<div class="kz-quiz-actions"><button class="secondary" id="kz-share-result">📤 Podijeli rezultat</button>'+
      '<button class="secondary" id="kz-download-history">📥 Preuzmi rezultat PNG</button></div>'+
      '<button id="quiz-finish" class="primary">Povratak kraljevstvu</button>');
    $("dialog").classList.add("kz-quiz-dialog");
    $("quiz-finish").onclick=closeModal;
    // Share only numeric scores, never old questions or answer keys.
    const summary=Array.from({length:total},()=>({}));
    $("kz-share-result").onclick=()=>sharePlayed(summary,correct);
    $("kz-download-history").onclick=()=>downloadPlayed(summary,correct);
  }
  function historyRow(q,gameId) {
    const correctKey=q.correct_key;
    const answered=q.choice!=null;
    const status=answered?(q.choice==="SKIP"?"⏱ Bez odgovora":q.correct?"✓ Točno":"✗ Netočno"):"Još nije odgovoreno";
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
  async function renderQuiz(){
    const game=current?.game;
    if(!game)return;
    stopMainTimer();const session={gameId:game.id,busy:false,done:false,timer:null};mainQuizSession=session;
    dialogQuiz=true;modal("ABC · Kraljevstvo Znanja","<p>Učitavam pitanje…</p>");
    let pending;
    try{pending=await rpc("kz_issue_question",args({p_game_id:game.id}));}catch(e){if(mainQuizSession===session){closeModal();toast(e.message);}return;}
    if(mainQuizSession!==session)return;
    if(pending.finished){const games=await rpc("kz_history",args());const finished=games.find(g=>g.id===game.id);await reloadState();if(mainQuizSession===session&&finished)completedPart([],finished);return;}
    if(pending.skipped){const row=game.questions.find(q=>q.position===pending.skipped.position);if(row)Object.assign(row,pending.skipped);}
    const row=game.questions.find(q=>q.position===pending.position);if(row)Object.assign(row,pending);
    session.position=pending.position;session.game=game;session.question=pending;session.deadline=Date.now()+Math.max(0,Number(pending.remaining_ms));
    const answered=game.questions.filter(q=>q.choice!=null).length;
    modal("ABC · Kraljevstvo Znanja",
      '<div class="kz-quiz-layout"><section class="kz-question-area">'+
      '<div class="quiz-progress">PITANJE '+pending.position+' / 10 · '+answered+' riješeno</div>'+
      '<p id="kz-main-clock" class="kz-question-clock" role="timer"></p>'+
      '<p class="quiz-question">'+safe(pending.prompt)+'</p>'+
      (pending.image?'<img class="question-image" src="'+safe(pending.image)+'" alt="Slika uz pitanje">':'')+
      '<div class="kz-answer-list">'+["A","B","C"].map(key=>
        '<button class="option" data-answer="'+key+'">'+key+') '+safe(pending.options?.[key]||"")+'</button>').join("")+'</div>'+
      '<p class="member-meta">Točan odgovor vrijedi +'+
      (current?.kingdom?.area>1000?(current.kingdom.role==="kralj"?60:current.kingdom.role==="vojvoda"?50:44):40)+
      ' m².</p><div id="answer-result" aria-live="polite"></div></section>'+
      '<aside class="kz-history"><h3>Rezultati & povijest</h3>'+
      '<div class="kz-current-score">✓ '+game.questions.filter(q=>q.correct).length+
      ' / '+answered+' točnih</div><div id="kz-history-list"></div></aside></div>');
    $("dialog").classList.add("kz-quiz-dialog");
    renderHistory(game.questions,game.id);
    document.querySelectorAll("[data-answer]").forEach(btn=>
      btn.onclick=()=>submitAnswer(game.id,pending.position,btn.dataset.answer));
    const draw=()=>{if(mainQuizSession!==session)return;const clock=$("kz-main-clock");if(!clock)return;const left=Math.max(0,Math.ceil((session.deadline-Date.now())/1000));clock.textContent="⏱ "+left+" s";clock.classList.toggle("urgent",left<=3);if(left===0&&!session.busy&&!session.done)void submitAnswer(game.id,pending.position,"SKIP");};session.draw=draw;session.timer=setInterval(draw,100);draw();
  }
  async function submitAnswer(gameId,number,key){
    const session=mainQuizSession;if(!session||session.gameId!==gameId||session.position!==number||session.busy||session.done)return;
    if(Date.now()>=session.deadline)key="SKIP";session.busy=true;stopMainTimer();
    const buttons=[...document.querySelectorAll("[data-answer]")];
    buttons.forEach(b=>b.disabled=true);
    try{
      const out=await rpc("kz_answer",args({p_game_id:gameId,p_number:number,p_choice:key}));
      session.done=true;if(mainQuizSession!==session)return;
      const q=session.game.questions.find(x=>x.position===number);
      if(q){Object.assign(q,session.question);q.choice=out.timed_out?"SKIP":key;q.correct=out.correct;q.correct_key=out.correct_key;q.earned=out.earned;}
      const message=out.timed_out?"⏱ Vrijeme je isteklo! Točno: "+out.correct_key+") "+answerLabel(q,out.correct_key):out.correct?"✓ Točno! +"+formatArea(out.earned):
        "✗ Netočno! Točno: "+out.correct_key+") "+answerLabel(q,out.correct_key);
      $("answer-result").innerHTML='<div class="outcome '+(out.correct?"kz-outcome-good":"kz-outcome-bad")+'">'+safe(message)+'</div>';
      buttons.forEach(b=>{
        if(b.dataset.answer===out.correct_key)b.classList.add("correct");
        else if(b.dataset.answer===key&&!out.correct&&!out.timed_out)b.classList.add("wrong");
      });
      renderHistory(session.game.questions,gameId);
      const next=document.createElement("button");
      next.className="primary";next.textContent=out.finished?"Pogledaj rezultat":"Sljedeće pitanje →";
      next.onclick=async()=>{
        if(out.finished){
          const snapshot=session.game.questions.map(q=>({...q}));
          await reloadState();
          completedPart(snapshot,{id:gameId});
        } else {
          await reloadState();await renderQuiz();
        }
      };
      $("answer-result").append(next);
    }catch(e){if(mainQuizSession===session){toast(e.message);if(Date.now()<session.deadline){buttons.forEach(b=>b.disabled=false);session.timer=setInterval(session.draw,100);}else{session.done=true;const next=document.createElement("button");next.className="primary";next.textContent="Nastavi";next.onclick=async()=>{await reloadState();await renderQuiz();};$("answer-result")?.append(next);}}}
    finally{session.busy=false;}
  }
  async function showFullHistory(){await renderMembers();}
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
    const canvas=document.createElement("canvas");canvas.width=900;canvas.height=340;
    const ctx=canvas.getContext("2d");ctx.fillStyle="#0b1527";ctx.fillRect(0,0,900,340);
    ctx.fillStyle="#68e8b1";ctx.font="bold 33px system-ui";ctx.fillText("KRALJEVSTVO ZNANJA",42,62);
    ctx.fillStyle="#e7f3ff";ctx.font="bold 60px system-ui";ctx.fillText(correct+" / "+questions.length,42,160);
    ctx.font="24px system-ui";ctx.fillText("Točni: "+correct+"  ·  Netočni: "+(questions.length-correct),42,225);
    ctx.fillText("Uspješnost: "+(questions.length?Math.round(correct/questions.length*100):0)+"%",42,275);
    return await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error("PNG nije moguće izraditi")),"image/png"));
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
      await renderQuiz();
    }catch(e){toast(e.message);}
    finally{tick();}
  }
  async function renderMembers() {
    const kingdomId=current?.kingdom?.id||null;
    modal("Doprinos članova","<p>Učitavam zajedničku statistiku…</p>");
    const body=$("dialog-body");
    const loading=body.firstElementChild;
    try{
      const members=await rpc("kz_member_statistics",args());
      if(body.firstElementChild!==loading||$("dialog-backdrop").classList.contains("hidden")||(current?.kingdom?.id||null)!==kingdomId)return;
      const king=current?.kingdom?.role==="kralj";
      const categories=[["quiz","Redovni kviz (svaka 4 h)"],["guardian","Čudovišta i čuvari"],["flag","Zastavice"],["territory","Okršaji za teritorij"]];
      const score=(c,w)=>{const n=c+w;return n?Math.round(c*100/n)+"%":"—";};
      const html=(members||[]).map(m=>{
        const c=Number(m.total_correct)||0,w=Number(m.total_wrong)||0,n=c+w;
        const breakdown=categories.map(([key,label])=>{
          const row=m.sources?.[key]||{},rc=Number(row.correct)||0,rw=Number(row.wrong)||0;
          return '<div class="member-meta"><b>'+label+'</b> · '+score(rc,rw)+' · '+(rc+rw)+' pitanja · ✓ '+rc+' · ✕ '+rw+'</div>';
        }).join("");
        return '<article class="member"><details><summary><b>'+safe(m.name)+'</b> · '+score(c,w)+' · '+n+' odigranih · ✓ '+c+' · ✕ '+w+'</summary>'+
          '<div class="member-meta">'+(m.role?roleName(m.role):"Igrač")+' · Točni '+score(c,w)+' · Netočni '+score(w,c)+'</div>'+
          '<div style="display:flex;height:8px;border-radius:8px;overflow:hidden;background:#334155;margin:8px 0" aria-hidden="true">'+
          (n?'<span style="width:'+(c/n*100)+'%;background:#60c78a"></span><span style="flex:1;background:#c85d5d"></span>':'')+'</div>'+
          '<div class="member-meta">Ukupno zarađeno: <b>'+formatArea(m.total_earned)+'</b> · Osvojeno od protivnika: <b>'+formatArea(m.captured_m2)+'</b></div>'+
          breakdown+'</details>'+
          (king&&m.id!==current.player.id?'<div><button class="secondary" data-manage="duke" data-member="'+safe(m.id)+'">Postavi vojvodu kvizaša</button>'+
          '<button class="secondary" data-manage="crown" data-member="'+safe(m.id)+'">Predaj krunu</button>'+
          '<button class="secondary" data-manage="kick" data-member="'+safe(m.id)+'">Isključi</button></div>':'')+'</article>';
      }).join("");
      modal(kingdomId?"Doprinos članova · "+current.kingdom.name:"Moja statistika",
        '<p class="member-meta">Sva odigrana pitanja u Kraljevstvu znanja, uključujući istek vremena. Dodirni ime za statistiku po vrsti izazova.</p>'+
        (html||'<p>Još nema statistike.</p>')+'<button class="secondary" id="kz-stats-close">Zatvori</button>');
      $("kz-stats-close").onclick=closeModal;
      document.querySelectorAll("[data-manage]").forEach(b=>b.addEventListener("click",async()=>{
        if(!confirm("Potvrđuješ radnju za ovog člana?"))return;
        try{
          await rpc("kz_membership",args({p_action:b.dataset.manage,p_target:b.dataset.member}));
          closeModal();await reloadState();toast("Promjena članstva je spremljena.");
        }catch(e){toast(e.message);}
      }));
    }catch(e){if(body.firstElementChild===loading){closeModal();toast(e.message);}}
  }
  function boostInfo() {
    const enabled=(current?.kingdom?.area||0)>1000;
    modal("Boost kraljevstva",'<p>'+ (enabled?'⚡ Boost je uključen.':'Boost se uključuje čim kraljevstvo prijeđe 1.000 m².')+'</p>'+
      '<p>Dok kraljevstvo ima više od 1.000 m², svaki točan odgovor donosi:</p>'+
      '<p><b>Kralj kvizaš: 60 m²</b><br><b>Vojvoda kvizaš: 50 m²</b><br><b>Vojnik kvizaš: 44 m²</b></p>'+
      '<p>Do uključivo 1.000 m² svaki točan odgovor donosi 40 m². Jedan blok ima 20 m². Slobodan blok košta 20 m². Okršaj za tuđi blok ima ulog 100 m² i najviše 8 pitanja. Ako je protivničko konto na početku napada prazno, dovoljan je jedan točan odgovor; inače su potrebna tri. Pobjeda osvaja blok i vraća 100 m²; svaki odgovor skida do 20 m² s konta odgovarajućeg kraljevstva.</p>');
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
  let realmFeedId=undefined,realmFeedRows=[],realmFeedMore=false,realmFeedBusy=false,realmFeedGeneration=0;
  const realmEventTypes={found:["👑","Osnivanje"],join:["👋","Novi član"],leave:["🚪","Odlazak"],kick:["🚪","Isključenje"],promotion:["⬆","Promaknuće"],demotion:["⬇","Degradiranje"],battle_start:["⚔","Napad"],battle_defense:["🛡","Obrana"],victory:["🏆","Pobjeda"],defeat:["⚔","Poraz"],battle_end:["🏳","Prekinuti okršaj"],guardian:["🏆","Pobijeđen čuvar"]};
  function paintRealmFeed({older=false,reset=false}={}){
    const list=$("realm-event-list"),more=$("realm-event-more");
    const atEnd=list.scrollHeight-list.clientHeight-list.scrollTop<60;
    const oldHeight=list.scrollHeight,oldTop=list.scrollTop;
    if(!realmFeedId){
      list.innerHTML='<p class="member-meta">Pridruži se kraljevstvu za zajedničke obavijesti.</p>';more.hidden=true;return;
    }
    let day="";
    list.innerHTML=realmFeedRows.length?realmFeedRows.map(e=>{
      const stamp=new Date(e.at),date=stamp.toLocaleDateString("hr-HR",{day:"numeric",month:"long",year:"numeric"});
      const [icon,label]=realmEventTypes[e.kind]||["✦","Događaj"];
      const divider=date!==day?'<div class="kz-event-date">'+safe(date)+'</div>':"";day=date;
      return divider+'<article class="kz-realm-event '+(e.kind==="victory"?"is-victory":e.kind==="defeat"?"is-defeat":"")+'"><span class="kz-event-icon" aria-hidden="true">'+icon+'</span>'+
        '<div class="kz-event-bubble"><div class="kz-event-heading"><b>'+label+'</b><time datetime="'+safe(e.at)+'">'+safe(stamp.toLocaleTimeString("hr-HR",{hour:"2-digit",minute:"2-digit"}))+'</time></div>'+
        '<p>'+safe(e.body)+'</p></div></article>';
    }).join(""):'<p class="member-meta">Još nema događaja u kraljevstvu.</p>';
    more.hidden=!realmFeedMore;more.disabled=false;
    if(older)list.scrollTop=oldTop+list.scrollHeight-oldHeight;
    else if(atEnd||reset)list.scrollTop=list.scrollHeight;
  }
  async function refreshRealmEvents(older=false){
    const realm=current?.kingdom?.id||null;
    if(realm!==realmFeedId){
      realmFeedGeneration++;realmFeedBusy=false;realmFeedId=realm;realmFeedRows=[];realmFeedMore=false;
      paintRealmFeed({reset:true});
    }
    if(!realm||realmFeedBusy||!identity||(older&&!realmFeedMore))return;
    const generation=realmFeedGeneration,first=realmFeedRows[0]?.id;
    realmFeedBusy=true;
    if(older)$("realm-event-more").disabled=true;
    try{
      const result=await rpc("kz_realm_notifications",args(older&&first?{p_before:first}:{}));
      if(generation!==realmFeedGeneration||current?.kingdom?.id!==realm||result?.kingdom_id!==realm)return;
      const next=Array.isArray(result.events)?result.events:[];
      const previousFirst=realmFeedRows[0]?.id;
      const oldMore=realmFeedMore;
      if(!older&&previousFirst&&next.every(e=>realmFeedRows.some(x=>String(x.id)===String(e.id))))return;
      const merged=new Map(realmFeedRows.map(e=>[String(e.id),e]));
      for(const e of next)merged.set(String(e.id),e);
      realmFeedRows=[...merged.values()].sort((a,b)=>new Date(a.at)-new Date(b.at)||Number(a.id)-Number(b.id));
      realmFeedMore=older||!previousFirst||realmFeedRows[0]?.id!==previousFirst?!!result.has_more:oldMore;
      paintRealmFeed({older,reset:!previousFirst});
    }catch(e){
      if(generation===realmFeedGeneration&&!realmFeedRows.length)$("realm-event-list").textContent="Obavijesti trenutačno nisu dostupne.";
      console.warn("KZ realm events:",e.message);
    }finally{if(generation===realmFeedGeneration){realmFeedBusy=false;$("realm-event-more").disabled=false;}}
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
  function initRealmColorPicker() {
    const color=$("realm-color"), hue=$("realm-hue"), saturation=$("realm-saturation"), brightness=$("realm-brightness"), hex=$("realm-hex"), preview=$("realm-color-preview");
    if(!color||!hue||!saturation||!brightness||!hex||!preview)return;
    const hsvToHex=(h,s,v)=>{
      s/=100;v/=100;
      const c=v*s,x=c*(1-Math.abs((h/60)%2-1)),m=v-c;
      const rgb=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];
      return "#"+rgb.map(n=>Math.round((n+m)*255).toString(16).padStart(2,"0")).join("");
    };
    const hexToHsv=value=>{
      const [r,g,b]=[1,3,5].map(i=>parseInt(value.slice(i,i+2),16)/255);
      const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;
      let h=0;
      if(d)h=60*(max===r?((g-b)/d+6)%6:max===g?(b-r)/d+2:(r-g)/d+4);
      return [h,max?d/max*100:0,max*100];
    };
    const paint=(value,writeHex=true)=>{
      color.value=value.toLowerCase();
      if(writeHex)hex.value=value.toUpperCase();
      preview.style.backgroundColor=value;
      preview.setAttribute("aria-label","Odabrana boja "+value.toUpperCase());
      const h=Number(hue.value),s=Number(saturation.value),v=Number(brightness.value);
      saturation.style.setProperty("--realm-track","linear-gradient(to right,"+hsvToHex(h,0,v)+","+hsvToHex(h,100,v)+")");
      brightness.style.setProperty("--realm-track","linear-gradient(to right,#000,"+hsvToHex(h,s,100)+")");
      hue.style.setProperty("--realm-thumb",hsvToHex(h,100,100));
      saturation.style.setProperty("--realm-thumb",value);
      brightness.style.setProperty("--realm-thumb",value);
    };
    const fromHex=value=>{
      const [h,s,v]=hexToHsv(value);
      hue.value=String(h);saturation.value=String(s);brightness.value=String(v);
      paint(value);
    };
    for(const input of [hue,saturation,brightness]){
      input.addEventListener("input",()=>paint(hsvToHex(Number(hue.value),Number(saturation.value),Number(brightness.value))));
    }
    hex.addEventListener("input",()=>{
      const value=hex.value.trim();
      if(/^#?[0-9a-f]{6}$/i.test(value)){
        fromHex(value.startsWith("#")?value:"#"+value);
        hex.removeAttribute("aria-invalid");
      }else hex.setAttribute("aria-invalid","true");
    });
    hex.addEventListener("blur",()=>{hex.value=color.value.toUpperCase();hex.removeAttribute("aria-invalid");});
    fromHex(color.value);
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
    $("refresh-btn").addEventListener("click",async()=>{await reloadState();await reloadMap();});
    $("map-life-toggle").addEventListener("click",toggleLivingWorld);
    // Kada je čuvar pobijeđen, osvježi i prikaz zajedničkog konta kraljevstva.
    window.addEventListener("kz:guardian-reward",()=>reloadState().catch(console.warn));
    $("play-btn").addEventListener("click",play);
    $("history-open").addEventListener("click",showFullHistory);
    $("battle-history-open").addEventListener("click",showBattleHistory);
    $("realm-event-more").addEventListener("click",()=>refreshRealmEvents(true));
    setInterval(()=>{if(document.visibilityState==="visible")void refreshRealmEvents();},10000);
    $("create-btn").addEventListener("click",createKingdom);
    initRealmColorPicker();
    $("realm-search").addEventListener("input",filterRealmCatalog);
    $("claim-block").addEventListener("click",saveBlock);
    duelResumeButton=document.createElement("button");duelResumeButton.type="button";
    duelResumeButton.className="minor";duelResumeButton.textContent="⚔ Nastavi okršaj";
    duelResumeButton.hidden=true;duelResumeButton.onclick=resumeTerritoryDuel;
    document.querySelector(".map-top .map-actions")?.append(duelResumeButton);
    $("gps-outpost-btn").addEventListener("click",()=>{
      if(current?.kingdom?.role!=="kralj"||needsFirstGps()||Number(current?.kingdom?.bank||0)<20||firstGpsBusy||previewBusy)return;
      chooseFirstGps();
    });
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
    btn.textContent=lifeEnabled?"🌲 Živi svijet: UKLJ.":"🌲 Živi svijet: ISKLJ.";
    btn.setAttribute("aria-pressed",String(lifeEnabled));
    bind();
    if (!client) throw Error("Supabase nije učitan. Provjeri vezu.");
    await prepareIdentity();
    initMap();
    initBattleMarkers();
    const catalogPromise=reloadCatalog().then(()=>null,error=>error);
    await reloadState();
    if (current?.kingdom?.anchor_x != null) {
      const p=ll(Number(current.kingdom.anchor_x),Number(current.kingdom.anchor_y));
      map.setView([p.lat,p.lng],20);
    }
    initialMapReady=true;
    await reloadMap();
    if(current?.kingdom)void resumeTerritoryDuel();
    const catalogError=await catalogPromise;
    if(catalogError)console.warn("Katalog kraljevstava:",catalogError.message);
    setInterval(tick,1000);
    refreshTimer=setInterval(async()=>{
      if(document.visibilityState==="visible"){try{await reloadState();await reloadMap();}catch(_){}}
    },45000);
  }
  init().catch(e=>{toast(e.message);$("map-count").textContent="Učitavanje nije uspjelo.";console.error("Kraljevstvo Znanja:",e);});
})();
