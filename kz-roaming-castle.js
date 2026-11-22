/* Kraljevstvo znanja: 9-kadrovni dvorac koji stvarno putuje po koordinatama.
   Udaljenosti su geografske; dvorac ne mijenja teritorije ni pravila borbe. */
(() => {
  "use strict";
  const START = {lat:44.7722,lng:17.1910}; // Banja Luka
  const STORE = "kz_roaming_castle_journey_v1";
  const DEG=Math.PI/180, EARTH=6371.0088, SPEED=.42;
  const FW=224,FH=240,FRAMES=9,FRAME_MS=380;
  const WAYPOINTS=[[0,0],[200,0],[400,0],[500,0],
    [525,22],[550,-22],[575,22],[600,0],[800,0],[1000,0]];
  let map=null,marker=null,canvas=null,ctx=null,sprite=null;
  let lastFrame=-1,lastDraw=0,active=false,enabled=true,position=START;
  const angle=n=>(n%360+360)%360;
  function destination(p,bearing,km){
    const d=km/EARTH,a=p.lat*DEG,l=p.lng*DEG,b=angle(bearing)*DEG;
    const y=Math.asin(Math.sin(a)*Math.cos(d)+Math.cos(a)*Math.sin(d)*Math.cos(b));
    const x=l+Math.atan2(Math.sin(b)*Math.sin(d)*Math.cos(a),
      Math.cos(d)-Math.sin(a)*Math.sin(y));
    return {lat:y/DEG,lng:((x/DEG+540)%360)-180};
  }
  function length(a,b){
    const x=(b.lat-a.lat)*DEG,y=(b.lng-a.lng)*DEG;
    const h=Math.sin(x/2)**2+Math.cos(a.lat*DEG)*Math.cos(b.lat*DEG)*Math.sin(y/2)**2;
    return EARTH*2*Math.asin(Math.min(1,Math.sqrt(h)));
  }
  function bearing(a,b){
    const la=a.lat*DEG,lb=b.lat*DEG,dl=(b.lng-a.lng)*DEG;
    return angle(Math.atan2(Math.sin(dl)*Math.cos(lb),
      Math.cos(la)*Math.sin(lb)-Math.sin(la)*Math.cos(lb)*Math.cos(dl))/DEG);
  }
  function routeFor(b){
    const out=WAYPOINTS.map(([km,side])=>{
      const p=destination(START,b,km);
      return side?destination(p,b+90,side):p;
    });
    const path=out.concat(out.slice(0,-1).reverse());
    let total=0;
    const sections=[];
    for(let i=0;i<path.length-1;i++){
      const km=length(path[i],path[i+1]);
      sections.push({point:path[i],heading:bearing(path[i],path[i+1]),start:total,km});
      total+=km;
    }
    return {sections,total};
  }
  function save(){
    try{localStorage.setItem(STORE,JSON.stringify(journey));}catch(_){}
  }
  function load(){
    try{
      const d=JSON.parse(localStorage.getItem(STORE)||"null");
      if(d&&Number.isFinite(d.startedAt)&&d.startedAt>1600000000000&&
        d.startedAt<Date.now()+300000&&Number.isFinite(d.bearing)&&
        Number.isInteger(d.cycle)&&d.cycle>=0)return d;
    }catch(_){}
    return {startedAt:Date.now(),bearing:Math.random()*360,cycle:0};
  }
  let journey=load(),route=routeFor(journey.bearing);
  save();
  function locate(now){
    let traveled=Math.max(0,(now-journey.startedAt)/1000*SPEED),changes=0;
    while(traveled>=route.total&&changes++<256){
      journey.startedAt+=route.total/SPEED*1000;
      journey.cycle++;
      const step=(3+Math.random()*8)*(Math.random()<.5?-1:1);
      journey.bearing=angle(journey.bearing+step);
      route=routeFor(journey.bearing);
      traveled=Math.max(0,(now-journey.startedAt)/1000*SPEED);
      save();
    }
    if(traveled>=route.total){
      journey.startedAt=now;
      traveled=0;
      save();
    }
    for(const sec of route.sections){
      if(traveled<=sec.start+sec.km)
        return destination(sec.point,sec.heading,Math.max(0,Math.min(sec.km,traveled-sec.start)));
    }
    return START;
  }
  function widthForZoom(){
    const zoom=map.getZoom();
    const metresPerPixel=156543.033928*Math.cos(position.lat*DEG)/Math.pow(2,zoom);
    // 4 osvajiva polja = 2 × 2 polja od po 20 m². Pri regionalnom zumu
    // zadrži dovoljno piksela da se detaljna ilustracija vidi.
    const realPx=Math.sqrt(80)/metresPerPixel;
    return zoom<18?86:Math.max(72,Math.min(340,Math.round(realPx)));
  }
  function icon(){
    const w=widthForZoom(),h=Math.round(w*FH/FW);
    return L.divIcon({
      className:"kz-roaming-castle-marker",
      html:'<canvas class="kz-roaming-castle-canvas" width="224" height="240" aria-hidden="true"></canvas>',
      iconSize:[w,h],iconAnchor:[Math.round(w/2),Math.round(h*.92)]
    });
  }
  function frame(n){
    if(!ctx||!sprite||lastFrame===n)return;
    ctx.clearRect(0,0,FW,FH);
    ctx.drawImage(sprite,n*FW,0,FW,FH,0,0,FW,FH);
    lastFrame=n;
  }
  function canvasFromMarker(){
    canvas=marker?.getElement()?.querySelector("canvas")||null;
    ctx=canvas?.getContext("2d",{alpha:true})||null;
    lastFrame=-1;
    frame(Math.floor(Date.now()/FRAME_MS)%FRAMES);
  }
  function visibility(){
    const toggle=document.getElementById("map-life-toggle");
    enabled=!toggle||toggle.getAttribute("aria-pressed")!=="false";
    if(marker)marker.setOpacity(enabled?1:0);
  }
  function sizeChange(){
    if(!marker)return;
    marker.setIcon(icon());
    canvasFromMarker();
  }
  function tick(time){
    if(!active)return;
    if(time-lastDraw>=115&&!document.hidden){
      lastDraw=time;
      position=locate(Date.now());
      if(enabled){
        marker.setLatLng([position.lat,position.lng]);
        const reduce=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        frame(reduce?0:Math.floor(Date.now()/FRAME_MS)%FRAMES);
      }
    }
    requestAnimationFrame(tick);
  }
  function locateButton(){
    const actions=document.querySelector(".map-top .map-actions");
    if(!actions||document.getElementById("kz-locate-castle"))return;
    const button=document.createElement("button");
    button.type="button";
    button.id="kz-locate-castle";
    button.className="minor kz-locate-castle";
    button.textContent="🏰 Pronađi dvorac";
    button.title="Pronađi putujući dvorac na karti";
    button.addEventListener("click",()=>{
      position=locate(Date.now());
      map.flyTo([position.lat,position.lng],Math.min(map.getZoom(),9),{duration:1.2});
    });
    actions.appendChild(button);
  }
  function mount(m){
    if(active||!m||!window.L||!window.KZ_ROAMING_CASTLE_WEBP)return;
    map=m;
    const pane=map.getPane("kzRoamingCastleTop")||map.createPane("kzRoamingCastleTop");
    pane.style.zIndex="1500";
    pane.style.pointerEvents="none";
    pane.classList.add("kz-roaming-castle-pane");
    pane.parentNode?.appendChild(pane);
    sprite=new Image();
    sprite.onload=()=>{
      if(sprite.naturalWidth!==FW*FRAMES||sprite.naturalHeight!==FH){
        console.error("Kraljevstvo: atlas hodajućeg dvorca nema očekivanu veličinu.");
        return;
      }
      position=locate(Date.now());
      marker=L.marker([position.lat,position.lng],{
        pane:"kzRoamingCastleTop",interactive:false,keyboard:false,
        bubblingMouseEvents:false,alt:"Hodajući dvorac",icon:icon()
      }).addTo(map);
      canvasFromMarker();
      visibility();
      locateButton();
      map.on("zoomend",sizeChange);
      document.getElementById("map-life-toggle")?.addEventListener("click",visibility);
      active=true;
      requestAnimationFrame(tick);
    };
    sprite.onerror=()=>console.warn("Kraljevstvo: atlas hodajućeg dvorca nije dostupan.");
    sprite.src=window.KZ_ROAMING_CASTLE_WEBP;
  }
  window.addEventListener("kz:map-ready",e=>mount(e.detail?.map));
  window.KZRoamingCastle={
    getPosition:()=>({...position}),
    getJourney:()=>({...journey,radiusKm:1000}),
    getRouteLength:()=>route.total
  };
})();