/* Kraljevstvo znanja — globalno raspoređeni čuvari iz zajedničkog kataloga.
 * Samo vidljivi čuvari se iscrtavaju; 40/80 stvarnih WebP kadrova.
 */
(function(){
  "use strict";
  const ICON=window.KZWorldRegistry.info("iron"),MIN_ZOOM=ICON.minZoom;
  const OVERVIEW_ZOOM=6; // Udaljene minijature poput hodajućih dvoraca.
  const FW=ICON.frameWidth,FH=ICON.frameHeight,D2R=Math.PI/180;
  const MAX_MOBILE=ICON.mobileLimit,MAX_DESKTOP=ICON.desktopLimit;
  // Raspored slijedi globalne 5 × 4 m kvadrate i regionalne kvote.
  const RENDER_TOTAL=11200;
  // Za sve čuvare vrijedi ista globalna raspršena mreža iz kataloga.
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
    const guard={id:id,group:window.KZWorldRegistry.regionName(id),hub:"",point:p};
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
  const COUNT_BY_REGION=window.KZWorldRegistry.regionQuotas();
  const info=id=>{
    const g=byId.get(id);
    return g?{id:id,name:"Sir Željeznik",region:g.group,lat:posFor(id,generation(id)).lat,lng:posFor(id,generation(id)).lng}:null;
  };
  function iconSize(p){
    const z=map.getZoom(),mobile=map.getSize().x<550;
    if(z<MIN_ZOOM)return mobile?30:36;
    if(z<18)return mobile?64:80;
    const mpp=156543.033928*Math.cos(p.lat*D2R)/Math.pow(2,z);
    return Math.max(mobile?64:72,Math.min(210,Math.round(Math.sqrt(80)/Math.max(.001,mpp))));
  }
  function icon(w,overview=false){
    return L.divIcon({className:"kz-iron-marker"+(overview?" kz-iron-overview":""),
      html:'<canvas class="kz-iron-canvas" width="'+FW+'" height="'+FH+'" aria-hidden="true"></canvas>',
      iconSize:[w,w],iconAnchor:[w/2,w*.90]});
  }
  function generation(id){return Number(states.get(id)?.generation)||0;}
  function visibleCandidates(){
    if(!map||map.getZoom()<OVERVIEW_ZOOM)return [];
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
    const canvas=entry.marker.getElement()?.querySelector("canvas");
    if(!canvas||!sprite)return;
    const frame=window.KZWorldRegistry.frameAt("iron",sprite,time,entry.id);
    if(frame===entry.frame)return;
    if(window.KZWorldRegistry.paint("iron",sprite,canvas,frame,false)){
      entry.frame=frame;
    }
  }
  function refresh(){
    if(!map||!ready)return;
    const toggle=document.getElementById("map-life-toggle");
    enabled=!toggle||toggle.getAttribute("aria-pressed")!=="false";
    if(!enabled||map.getZoom()<OVERVIEW_ZOOM){
      visible.forEach(entry=>map.removeLayer(entry.marker));
      visible.clear();return;
    }
    const overview=map.getZoom()<MIN_ZOOM;
    const mobile=map.getSize().x<550;
    const cap=overview?(mobile?14:24):(mobile?MAX_MOBILE:MAX_DESKTOP);
    const matches=visibleCandidates().slice(0,cap),keep=new Set();
    const now=Date.now();
    matches.forEach(match=>{
      keep.add(match.id);
      const width=iconSize(match.point),gen=generation(match.id);
      let entry=visible.get(match.id);
      if(!entry){
        const marker=L.marker([match.point.lat,match.point.lng],{
          pane:"kzIronPane",icon:icon(width,overview),interactive:true,
          keyboard:true,bubblingMouseEvents:false,
          alt:"Sir Željeznik"
        }).on("click",e=>{
          L.DomEvent.stopPropagation(e);
          // Na udaljenom zumu samo približi, bez GPS borbe.
          if(map.getZoom()<MIN_ZOOM){
            const point=posFor(match.id,generation(match.id));
            if(point)map.flyTo([point.lat,point.lng],MIN_ZOOM+1,{duration:1.1});
            return;
          }
          window.KZCastleFleet?.openFight(match.id);
        }).addTo(map);
        entry={id:match.id,marker:marker,frame:-1,width:width,generation:gen,overview:overview};
        visible.set(match.id,entry);
      }else if(entry.generation!==gen){
        entry.marker.setLatLng([match.point.lat,match.point.lng]);
        entry.generation=gen;
      }
      if(entry.width!==width||entry.overview!==overview){
        entry.marker.setIcon(icon(width,overview));
        entry.width=width;entry.overview=overview;entry.frame=-1;
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
  function focusNearest(){
    if(!map)return;
    const toggle=document.getElementById("map-life-toggle");
    if(toggle?.getAttribute("aria-pressed")==="false")toggle.click();
    const center=map.getCenter();
    let nearest=null,best=Infinity;
    for(const guard of guards){
      const point=posFor(guard.id,generation(guard.id));
      if(!point)continue;
      const lat=(point.lat-center.lat)*111.195;
      const delta=Math.abs(point.lng-center.lng);
      const lon=Math.min(delta,360-delta)*111.195*
        Math.cos((point.lat+center.lat)*D2R/2);
      const distance=lat*lat+lon*lon;
      if(distance<best){best=distance;nearest=point;}
    }
    if(nearest)map.flyTo([nearest.lat,nearest.lng],
      Math.max(MIN_ZOOM+1,map.getZoom()),{duration:1.15});
  }
  function setupButton(){
    const button=document.getElementById("kz-iron-button");
    if(!button)return;
    button.textContent="⚙️ Sir Željeznik ("+guards.length.toLocaleString("hr-HR")+")";
    button.title="Pronađi najbližeg Sir Željeznog; na udaljenom zumu vidljive su minijature";
    button.addEventListener("click",focusNearest);
  }
  function mount(m){
    if(map||!m||!window.L||!window.KZWorldRegistry.source('iron'))return;
    map=m;
    setupButton();
    pane=map.getPane("kzIronPane")||map.createPane("kzIronPane");
    pane.classList.add("kz-iron-pane");
    pane.style.zIndex="1600";
    pane.style.pointerEvents="none";
    pane.parentNode?.appendChild(pane);
    const img=new Image();
    img.onload=()=>{
      if(!window.KZWorldRegistry.layout("iron",img)){
        console.warn("KZ: Sir Željeznik očekuje atlas od 40 ili 80 pravih kadrova");return;
      }
      sprite=img;
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
    img.src=window.KZWorldRegistry.source('iron');
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