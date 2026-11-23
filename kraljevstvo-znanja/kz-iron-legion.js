/* KvizToGo — Sir Željeznik: stalni (neputujući) animirani čuvari.
 * Balkan 5000, ostatak Europe 2000, 6 drugih kontinenata po 700.
 * UKUPNO 11200, lokalno deterministički raspoređeno uz gradove i postaje.
 * Na karti se stvaraju samo vidljivi čuvari nakon zuma 12.
 * Svi dijele 1 rasterizirani WebP atlas (40 kadrova; 8 x 5), bez SVG-a/GLB-a.
 */
(function(){
  "use strict";
  const MIN_ZOOM=12, FRAMES=40,FRAME_MS=105;
  let FW=224,FH=224,ACTIVE_FRAMES=40,SPRITE_COLS=8;
  const EARTH=6371.0088, D2R=Math.PI/180, MAX_MOBILE=18, MAX_DESKTOP=36;
  // Raspored je namjerno vezan uz kopnene gradove i istraživačke postaje.
  // Četvrti podatak je približni polumjer disperzije u kilometrima.
  const RENDER_TOTAL=11200;
  // Za sve čuvare vrijedi ista globalna raspršena mreža iz kataloga.
  function hash(a,b){
    let x=(Math.imul(a+0x9e3779b9,1664525)^Math.imul(b+19,1013904223))|0;
    x=Math.imul(x^(x>>>16),0x7feb352d);
    x=Math.imul(x^(x>>>15),0x846ca68b);
    return ((x^(x>>>16))>>>0)/4294967296;
  }
  function dest(p,deg,km){
    const d=km/EARTH,a=p.lat*D2R,l=p.lng*D2R,b=deg*D2R;
    const y=Math.asin(Math.max(-1,Math.min(1,Math.sin(a)*Math.cos(d)+Math.cos(a)*Math.sin(d)*Math.cos(b))));
    const x=l+Math.atan2(Math.sin(b)*Math.sin(d)*Math.cos(a),Math.cos(d)-Math.sin(a)*Math.sin(y));
    return {lat:y/D2R,lng:((x/D2R+540)%360)-180};
  }
  // Stable ids 2000..13199. All clients calculate the same 11200 positions.
  const guards=[],byId=new Map(),cells=new Map(),states=new Map();
  function cellKey(p){
    return Math.floor((p.lat+90)*2)+":"+Math.floor((p.lng+180)*2);
  }
  function addToIndex(g){
    const key=cellKey(g.point);
    if(!cells.has(key))cells.set(key,[]);
    cells.get(key).push(g.id);
  }
  for(let id=2000;id<13200;id++){
    const p=window.KZWorldRegistry.pointFor(id,0);
    const guard={id:id,group:"Svijet",hub:"",point:p};
    guards.push(guard);byId.set(id,guard);addToIndex(guard);
  }
  if(guards.length!==RENDER_TOTAL)throw Error("Sir Željeznik: pogrešan broj čuvara");
  function posFor(id,gen){
    const base=byId.get(id)?.point;
    if(!base)return null;
    // Poslužitelj određuje novu točku nakon poraza: svi igrači
    // vide istog čuvara na istim koordinatama.
    const server=states.get(id);
    if(server?.start_lat!=null && server?.start_lng!=null &&
       Number.isFinite(Number(server.start_lat)) &&
       Number.isFinite(Number(server.start_lng)))
      return {lat:Number(server.start_lat),lng:Number(server.start_lng)};
    if(!gen)return base;
    return window.KZWorldRegistry.pointFor(id,gen);
  }
  let map=null,pane=null,sprite=null,ready=false,visible=new Map(),enabled=true;
  let pendingRefresh=0,clock=0;
  const COUNT_BY_REGION={Svijet:RENDER_TOTAL};
  const info=id=>{
    const g=byId.get(id);
    return g?{id:id,name:"Sir Željeznik",region:"Svijet",lat:posFor(id,generation(id)).lat,lng:posFor(id,generation(id)).lng}:null;
  };
  function iconSize(p){
    const z=map.getZoom(),mobile=map.getSize().x<550;
    if(z<18)return mobile?64:80;
    const mpp=156543.033928*Math.cos(p.lat*D2R)/Math.pow(2,z);
    return Math.max(mobile?64:72,Math.min(210,Math.round(Math.sqrt(80)/Math.max(.001,mpp))));
  }
  function icon(w){
    return L.divIcon({className:"kz-iron-marker",
      html:'<canvas class="kz-iron-canvas" width="'+FW+'" height="'+FH+'" aria-hidden="true"></canvas>',
      iconSize:[w,w],iconAnchor:[w/2,w*.90]});
  }
  function generation(id){return Number(states.get(id)?.generation)||0;}
  function visibleCandidates(){
    if(!map||map.getZoom()<MIN_ZOOM)return [];
    const b=map.getBounds().pad(.18);
    const sw=b.getSouthWest(),ne=b.getNorthEast();
    const south=Math.floor((sw.lat+90)*2),north=Math.floor((ne.lat+90)*2);
    const west=Math.floor((sw.lng+180)*2),east=Math.floor((ne.lng+180)*2);
    const result=[],center=map.getCenter();
    const scan=function(ids){
      for(const id of ids){
        const p=posFor(id,generation(id));
        if(!p||!b.contains([p.lat,p.lng]))continue;
        const dx=(p.lng-center.lng)*Math.cos(center.lat*D2R),dy=p.lat-center.lat;
        result.push({id:id,point:p,d2:dx*dx+dy*dy});
      }
    };
    // A small spatial index avoids scanning every guard on every pan/zoom.
    const seen=new Set();
    for(let a=Math.max(0,south-1);a<=Math.min(359,north+1);a++){
      for(let b=west-1;b<=east+1;b++){
        const norm=(b%720+720)%720;
        const key=a+":"+norm;
        if(seen.has(key))continue;seen.add(key);
        scan(cells.get(key)||[]);
      }
    }
    result.sort((a,b)=>a.d2-b.d2);
    return result;
  }
  function frameDraw(entry,time){
    const node=entry.marker.getElement()?.querySelector("canvas");
    if(!node||!sprite)return;
    const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const n=reduced?0:Math.floor((time+entry.id*173)% (ACTIVE_FRAMES*FRAME_MS)/FRAME_MS);
    if(n===entry.frame)return;
    const context=node.getContext("2d",{alpha:true});
    if(!context)return;
    context.clearRect(0,0,FW,FH);
    context.drawImage(sprite,(n%SPRITE_COLS)*FW,Math.floor(n/SPRITE_COLS)*FH,FW,FH,0,0,FW,FH);
    entry.frame=n;
  }
  function refresh(){
    if(!map||!ready)return;
    const toggle=document.getElementById("map-life-toggle");
    enabled=!toggle||toggle.getAttribute("aria-pressed")!=="false";
    if(!enabled||map.getZoom()<MIN_ZOOM){
      visible.forEach(entry=>map.removeLayer(entry.marker));
      visible.clear();return;
    }
    const cap=map.getSize().x<550?MAX_MOBILE:MAX_DESKTOP;
    const matches=visibleCandidates().slice(0,cap),keep=new Set();
    const now=Date.now();
    matches.forEach(match=>{
      keep.add(match.id);
      const width=iconSize(match.point),gen=generation(match.id);
      let entry=visible.get(match.id);
      if(!entry){
        const marker=L.marker([match.point.lat,match.point.lng],{
          pane:"kzIronPane",icon:icon(width),interactive:true,
          keyboard:true,bubblingMouseEvents:false,
          alt:"Sir Željeznik"
        }).on("click",e=>{
          L.DomEvent.stopPropagation(e);
          window.KZCastleFleet?.openFight(match.id);
        }).addTo(map);
        entry={id:match.id,marker:marker,frame:-1,width:width,generation:gen};
        visible.set(match.id,entry);
      }else if(entry.generation!==gen){
        entry.marker.setLatLng([match.point.lat,match.point.lng]);
        entry.generation=gen;
      }
      if(entry.width!==width){
        entry.marker.setIcon(icon(width));entry.width=width;entry.frame=-1;
      }
      frameDraw(entry,now);
    });
    for(const [id,entry] of visible){
      if(!keep.has(id)){
        map.removeLayer(entry.marker);visible.delete(id);
      }
    }
  }
  function rebuildSpatialIndex(){
    // Nakon globalnog respawna indeks mora koristiti NOVE koordinate,
    // inače bi premješteni čuvar ostao nevidljiv u novoj regiji.
    cells.clear();
    for(const guard of guards){
      const point=posFor(guard.id,generation(guard.id));
      addToIndex({id:guard.id,point:point});
    }
  }
  function onStatus(list){
    if(!Array.isArray(list))return;
    const next=new Map();
    for(const row of list){
      if(!Number.isInteger(row?.id)||!byId.has(row.id))continue;
      next.set(row.id,row);
    }
    states.clear();
    next.forEach((value,key)=>states.set(key,value));
    rebuildSpatialIndex();
    refresh();
  }
  function onChange(record){
    if(!record||!byId.has(Number(record.id)))return;
    states.set(Number(record.id),record);
    rebuildSpatialIndex();
    refresh();
  }
  function mount(m){
    if(map||!m||!window.L||!window.KZ_IRON_ROBOT_ATLAS)return;
    map=m;
    pane=map.getPane("kzIronPane")||map.createPane("kzIronPane");
    pane.classList.add("kz-iron-pane");
    pane.style.zIndex="1600";
    pane.style.pointerEvents="none";
    pane.parentNode?.appendChild(pane);
    const img=new Image();
    img.onload=()=>{
      // Novi 40-kadrovni atlas: 8 stupaca × 5 redova, 224 px po kadru.
      // Ne miješamo dva prozirna kadra: alpha blending je prethodno
      // stvarao bljeskanje i dvostruke rubove na silueti.
      if(img.naturalWidth===224*8&&img.naturalHeight===224*5){
        FW=224;FH=224;ACTIVE_FRAMES=40;SPRITE_COLS=8;sprite=img;
      }else if(img.naturalWidth===224*9&&img.naturalHeight===224){
        // Sigurna rezervna varijanta prikazuje 9 izvornih poza bez
        // lažnih, poluprozirnih međukadrova.
        FW=224;FH=224;ACTIVE_FRAMES=9;SPRITE_COLS=9;sprite=img;
      }else{
        console.warn("KZ: atlas Sir Željeznika mora biti 8×5 (40) ili 9×1 (9)");return;
      }
      ready=true;
      map.on("moveend zoomend",()=>{
        clearTimeout(pendingRefresh);
        pendingRefresh=setTimeout(refresh,90);
      });
      document.getElementById("map-life-toggle")?.addEventListener("click",refresh);
      refresh();
      // Jedan render ciklus vezan uz zaslon, bez setInterval driftanja.
      let lastFrame=0;
      const animate=(time)=>{
        clock=requestAnimationFrame(animate);
        if(time-lastFrame<1000/60)return;
        lastFrame=time;
        if(document.hidden||!enabled)return;
        const now=Date.now();
        visible.forEach(entry=>frameDraw(entry,now));
      };
      clock=requestAnimationFrame(animate);
    };
    img.onerror=()=>console.warn("KZ: Sir Željeznik sprite atlas not available");
    img.src=window.KZ_IRON_ROBOT_ATLAS;
  }
  window.addEventListener("kz:map-ready",e=>mount(e.detail?.map));
  window.addEventListener("kz:guardian-status",e=>onStatus(e.detail?.states));
  window.addEventListener("kz:guardian-state",e=>onChange(e.detail?.state));
  window.KZIronLegion={
    count:()=>guards.length,
    regions:()=>({...COUNT_BY_REGION}),
    visibleCount:()=>visible.size,
    info:info,
    location:(id)=>posFor(id,generation(id)),
    refresh:refresh
  };
})();