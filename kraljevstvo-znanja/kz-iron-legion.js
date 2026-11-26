/* Kraljevstvo znanja — globalno raspoređeni čuvari iz zajedničkog kataloga.
 * Samo vidljivi čuvari se iscrtavaju; 40/80 stvarnih WebP kadrova.
 */
(function(){
  "use strict";
  const ICON=window.KZWorldRegistry.info("iron"),MIN_ZOOM=19;
  const OVERVIEW_ZOOM=19; // Čuvari su vidljivi samo na detaljnom zumu.
  const FW=ICON.frameWidth,FH=ICON.frameHeight,D2R=Math.PI/180;
  const MAX_MOBILE=ICON.mobileLimit,MAX_DESKTOP=ICON.desktopLimit;
  // Raspored slijedi globalne 5 × 4 m kvadrate i regionalne kvote.
  const RENDER_TOTAL=268800;
  // Za sve čuvare vrijedi ista globalna raspršena mreža iz kataloga.
  // Stable ids 2000..13199. All clients calculate the same 11200 positions.
  // Server spatial lookup: only guardians in the current viewport are loaded.
  const byId=new Map(),states=new Map();
  let requestSerial=0;
  function posFor(id,gen){
    const state=states.get(id);
    if(state?.start_lat!=null&&state?.start_lng!=null)return {lat:Number(state.start_lat),lng:Number(state.start_lng)};
    return byId.get(id)?.point||null;
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
  function generation(id){return Number(states.get(id)?.generation??byId.get(id)?.generation)||0;}
  function mapParams(nearest=false){
    const b=map.getBounds().pad(.18),c=map.getCenter();
    return {p_south:b.getSouth(),p_north:b.getNorth(),p_west:b.getWest(),p_east:b.getEast(),p_lat:c.lat,p_lng:c.lng,p_nearest:nearest};
  }
  function register(row){
    const id=Number(row.id),point={lat:Number(row.lat),lng:Number(row.lng)};
    if(byId.size>=1500){for(const k of byId.keys()){if(!visible.has(k)){byId.delete(k);break;}}}
    byId.set(id,{id,group:window.KZWorldRegistry.regionNames[row.region]||"Svijet",point,generation:Number(row.generation)||0});
    return {id,point};
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
  async function refresh(){
    if(!map||!ready)return;
    const serial=++requestSerial;
    const toggle=document.getElementById("map-life-toggle");
    enabled=!toggle||toggle.getAttribute("aria-pressed")!=="false";
    if(!enabled||map.getZoom()<OVERVIEW_ZOOM){
      visible.forEach(entry=>map.removeLayer(entry.marker));
      visible.clear();return;
    }
    const overview=map.getZoom()<MIN_ZOOM;
    const mobile=map.getSize().x<550;
    const cap=overview?(mobile?14:24):(mobile?MAX_MOBILE:MAX_DESKTOP);
    let rows;
    try{rows=await window.KZCastleRPC.ironMap(mapParams());}catch(error){console.warn("KZ Željeznici:",error);return;}
    if(serial!==requestSerial||!enabled||map.getZoom()<OVERVIEW_ZOOM)return;
    const matches=(Array.isArray(rows)?rows:[]).slice(0,cap).map(register),keep=new Set();
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
      }else{
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
  function onStatus(list){
    if(!Array.isArray(list))return;
    states.clear();
    for(const row of list)if(window.KZWorldRegistry.isIron(Number(row?.id)))states.set(Number(row.id),row);
    if(map?.getZoom()>=OVERVIEW_ZOOM)refresh();
  }
  function onChange(record){
    if(!record||!window.KZWorldRegistry.isIron(Number(record.id)))return;
    states.set(Number(record.id),record);
    refresh();
  }
  async function focusNearest(){
    if(!map)return;
    const toggle=document.getElementById("map-life-toggle");
    if(toggle?.getAttribute("aria-pressed")==="false")toggle.click();
    try{
      const rows=await window.KZCastleRPC.ironMap(mapParams(true));
      if(rows?.length){const {point}=register(rows[0]);map.flyTo([point.lat,point.lng],Math.max(MIN_ZOOM+1,map.getZoom()),{duration:1.15});}
    }catch(error){console.warn("KZ Željeznici:",error);}
  }
  function setupButton(){
    const button=document.getElementById("kz-iron-button");
    if(!button)return;
    button.textContent="⚙️ Sir Željeznik";
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
        if(map.getZoom()<OVERVIEW_ZOOM){refresh();return;}
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
    count:()=>RENDER_TOTAL,
    regions:()=>({...COUNT_BY_REGION}),
    visibleCount:()=>visible.size,
    info:info,
    location:(id)=>posFor(id,generation(id)),
    refresh:refresh
  };
})();