/* Kraljevstvo znanja — Čarobne šume (300 m² = 15 blokova po 5 x 4 m).
 * 200 Balkan, 20 Njemačka, 20 ostatak Europe, 20 na svakom od ostalih
 * pet naseljenih kontinenata te jedna Antarktika = 341 trajna lokacija.
 *
 * Jedan WebM resurs koristi svaka od 341 šume. Tek kada je igrač na bliskom
 * zumu i šuma je u kadru, stvara se najviše nekoliko video-dekodera.
 * Ne mijenja vlasništvo nad teritorijem, GPS provjeru ni borbe.
 */
(function(){
  "use strict";
  const world=window.KZWorldRegistry;
  if(!world)return;
  const PLOT=Object.freeze({columns:3,rows:5,widthM:15,heightM:20,areaM2:300});
  const VIDEO_URL="./media/carobna-suma-300m2.webm?v=2";
  const REGIONS=Object.freeze([
    {name:"Balkan",count:200,index:0,box:[13.3,29.0,35.0,46.9],spacingKm:24},
    {name:"Njemačka",count:20,index:1,box:[5.8,15.1,47.0,55.1],spacingKm:18},
    {name:"Ostatak Europe",count:20,index:1,box:[-12,49,35,72],spacingKm:85},
    {name:"Azija",count:20,index:5,box:[26,147,-13,77],spacingKm:170},
    {name:"Afrika",count:20,index:4,box:[-18,52,-36,38],spacingKm:160},
    {name:"Sjeverna Amerika",count:20,index:2,box:[-169,-52,8,83],spacingKm:170},
    {name:"Južna Amerika",count:20,index:3,box:[-82,-34,-56,14],spacingKm:140},
    {name:"Australija i Oceanija",count:20,index:6,box:[110,180,-48,-10],spacingKm:110},
    {name:"Antarktika",count:1,index:7,box:[-180,180,-82,-76],spacingKm:0}
  ]);
  // Dovoljno precizan kopneni obris Njemačke za nasumični raspored.
  // Služi isključivo za zemljopisni odabir; ne tvrdi da je službena granica.
  const GERMANY=[
    [6.0,47.6],[7.8,47.5],[9.5,47.3],[10.6,47.2],[12.9,47.5],
    [13.5,48.3],[13.8,49.0],[12.1,49.4],[12.0,50.1],[14.6,50.7],
    [14.5,51.7],[15.0,51.9],[14.4,52.8],[13.3,53.6],[14.2,54.3],
    [12.7,54.5],[11.5,54.1],[10.7,54.5],[9.7,54.9],[8.4,54.8],
    [8.6,53.7],[7.7,53.5],[6.9,53.0],[6.5,52.1],[5.9,51.9],
    [6.2,50.9],[6.3,50.2],[6.6,49.5],[7.2,49.2],[7.5,48.7],
    [6.5,48.3]
  ];
  function inPolygon(lon,lat,poly){
    let inside=false;
    for(let i=0,j=poly.length-1;i<poly.length;j=i++){
      const a=poly[i],b=poly[j];
      if(((a[1]>lat)!==(b[1]>lat)) &&
        lon < (b[0]-a[0])*(lat-a[1])/(b[1]-a[1])+a[0]) inside=!inside;
    }
    return inside;
  }
  function inRegion(region,lon,lat){
    if(region===1)return inPolygon(lon,lat,GERMANY) && world.belongs(1,lon,lat);
    if(region===2)return world.belongs(1,lon,lat) && !inPolygon(lon,lat,GERMANY);
    return world.belongs(REGIONS[region].index,lon,lat);
  }
  function randomSequence(seed){
    let value=seed|0;
    return function(){
      value^=value<<13;value^=value>>>17;value^=value<<5;
      return (value>>>0)/4294967296;
    };
  }
  function distanceKm(a,b){
    const lat=(a.lat+b.lat)*Math.PI/360;
    const north=(a.lat-b.lat)*111.195;
    const east=Math.min(Math.abs(a.lng-b.lng),360-Math.abs(a.lng-b.lng))*
      111.195*Math.cos(lat);
    return Math.hypot(north,east);
  }
  function plotFromPoint(lat,lng){
    // Always snap the southwest corner to the SAME global KZ 5x4 m grid.
    const cell=world.blockFor(lat,lng);
    const x=Math.floor(cell.x/PLOT.columns)*PLOT.columns;
    const y=Math.floor(cell.y/PLOT.rows)*PLOT.rows;
    const southwest=world.worldGridCorner(x,y);
    const northeast=world.worldGridCorner(x+PLOT.columns,y+PLOT.rows);
    const center=world.pointFromBlock({
      x:x+Math.floor(PLOT.columns/2),
      y:y+Math.floor(PLOT.rows/2)
    });
    return {x:x,y:y,point:center,bounds:[[southwest.lat,southwest.lng],
      [northeast.lat,northeast.lng]]};
  }
  let forests=null;
  function all(){
    if(forests)return forests;
    const created=[];
    let nextId=1;
    REGIONS.forEach((region,regionIndex)=>{
      const [west,east,south,north]=region.box;
      const sinLo=Math.sin(south*Math.PI/180),sinHi=Math.sin(north*Math.PI/180);
      const random=randomSequence(0x5b1b8a27^(regionIndex*0x5bd1e995));
      const existing=[];
      const used=new Set();
      let attempts=0;
      while(existing.length<region.count && attempts<100000){
        attempts++;
        const lon=west+(east-west)*random();
        const lat=Math.asin(sinLo+(sinHi-sinLo)*random())*180/Math.PI;
        if(!inRegion(regionIndex,lon,lat))continue;
        // Keep most forest icons away from simplified coastline/country edges.
        if(regionIndex!==8 && !(
          inRegion(regionIndex,lon+.026,lat)&&
          inRegion(regionIndex,lon-.026,lat)&&
          inRegion(regionIndex,lon,lat+.026)&&
          inRegion(regionIndex,lon,lat-.026)
        ))continue;
        const plot=plotFromPoint(lat,lon),key=plot.x+":"+plot.y;
        if(used.has(key))continue;
        if(existing.some(v=>distanceKm(v,plot.point)<region.spacingKm))continue;
        const forest=Object.freeze({
          id:nextId++,region:region.name,areaM2:PLOT.areaM2,
          blockX:plot.x,blockY:plot.y,
          blocks:PLOT.columns*PLOT.rows,
          lat:plot.point.lat,lng:plot.point.lng,
          bounds:plot.bounds
        });
        used.add(key);existing.push(forest);
      }
      if(existing.length!==region.count){
        throw Error("KZ Čarobne šume: premalo lokacija za "+
          region.name+" ("+existing.length+"/"+region.count+")");
      }
      created.push(...existing);
    });
    forests=Object.freeze(created);
    return forests;
  }

  // Svi primjerci koriste JEDAN pravi video sa šumom, druidom i potokom.
  // Mali prikaz uzima sličicu iz tog istog videa — bez emoji stabala.
  const POSTER_URL="./media/carobna-suma-300m2-poster.webp?v=2";
  const MAX_PREVIEW_ZOOM=19;
  const NAV_ZOOM=6,VIDEO_ZOOM=19,ANIMATED_THUMB_ZOOM=11;
  const markers=new Map(),videos=new Map();
  let map=null,layer=null,pane=null,enabled=true,showTimer=0,mediaOk=true;
  let supportCached=null;

  function canPlay(){
    if(supportCached!==null)return supportCached;
    const v=document.createElement("video");
    supportCached=Boolean(v.canPlayType?.('video/webm; codecs="vp9"'));
    return supportCached;
  }
  function sizeFor(zoom,phone){
    if(zoom<9)return phone?42:48;
    if(zoom<13)return phone?56:66;
    if(zoom<17)return phone?67:79;
    return phone?78:96;
  }
  function miniIcon(size,animated){
    const media=animated
      ? '<video class="kz-forest-mini-video" src="'+VIDEO_URL+
        '" poster="'+POSTER_URL+'" muted loop autoplay playsinline preload="metadata" aria-hidden="true"></video>'
      : '';
    return L.divIcon({
      className:"kz-forest-map-marker",
      html:'<span class="kz-forest-mini-frame"><img class="kz-forest-mini-image" src="'+
        POSTER_URL+'" alt="" loading="lazy" decoding="async">'+media+'</span>'+
        '<span class="kz-forest-map-name">Čarobna šuma · 300 m²</span>',
      iconSize:[size,size+16],iconAnchor:[size/2,size*.80]
    });
  }
  function flyTo(forest){
    if(!map)return;
    map.flyTo([forest.lat,forest.lng],Math.max(VIDEO_ZOOM,map.getZoom()),{duration:1.15});
  }
  function focusNearest(){
    if(!map)return;
    const toggle=document.getElementById("map-life-toggle");
    if(toggle?.getAttribute("aria-pressed")==="false")toggle.click();
    const center=map.getCenter();
    let nearest=null,best=Infinity;
    for(const forest of all()){
      const d=distanceKm(forest,center);
      if(d<best){best=d;nearest=forest;}
    }
    if(nearest)flyTo(nearest);
  }
  function stopMarker(item){
    const el=item.marker.getElement()?.querySelector("video");
    if(el)try{el.pause();el.removeAttribute("src");el.load();}catch(_){}
    layer.removeLayer(item.marker);
  }
  function removeMarkers(){
    if(!layer)return;
    for(const item of markers.values())stopMarker(item);
    markers.clear();
  }
  function removeVideos(){
    if(!layer)return;
    for(const overlay of videos.values()){
      const el=overlay.getElement();
      if(el)try{el.pause();el.removeAttribute("src");el.load();}catch(_){}
      layer.removeLayer(overlay);
    }
    videos.clear();
  }
  function enableMarkerVideo(item){
    if(!item.animated)return;
    const el=item.marker.getElement()?.querySelector("video");
    if(!el)return;
    el.muted=true;el.loop=true;el.playsInline=true;
    el.play()?.catch(()=>{ /* poster remains underneath if autoplay is blocked */ });
  }
  function addActual(forest){
    // Geografska površina je uvijek točno 3x5 kvadrata = 300 m².
    // CSS contain čuva sav detalj izometrijske šume bez rezanja ili rastezanja.
    const opts={pane:"kzForestPane",interactive:false,opacity:1};
    let overlay;
    if(mediaOk&&canPlay()){
      overlay=L.videoOverlay(VIDEO_URL,forest.bounds,{
        ...opts,autoplay:true,loop:true,muted:true,playsInline:true,
        keepAspectRatio:true
      }).addTo(layer);
      const el=overlay.getElement();
      if(el){
        el.muted=true;el.loop=true;el.playsInline=true;el.preload="auto";
        el.style.objectFit="contain";el.style.pointerEvents="none";
        el.setAttribute("playsinline","");
        el.setAttribute("webkit-playsinline","");
        el.addEventListener("error",()=>{
          mediaOk=false;refresh();
        },{once:true});
        el.play()?.catch(()=>{});
      }
    }else{
      overlay=L.imageOverlay(POSTER_URL,forest.bounds,opts).addTo(layer);
    }
    videos.set(forest.id,overlay);
  }
  function refresh(m,on){
    if(m&&!map)mount(m);
    if(!map||!layer)return;
    if(typeof on==="boolean")enabled=on;
    const zoom=map.getZoom();
    if(!enabled||zoom<NAV_ZOOM){
      removeMarkers();removeVideos();return;
    }
    const viewport=map.getBounds().pad(.15),center=map.getCenter();
    const hits=all().filter(f=>viewport.contains([f.lat,f.lng]));
    hits.sort((a,b)=>distanceKm(a,center)-distanceKm(b,center));
    const mobile=map.getSize().x<560;
    if(zoom<VIDEO_ZOOM){
      removeVideos();
      const maximum=mobile?32:64,animatedLimit=mobile?2:4;
      const animate=canPlay()&&mediaOk&&zoom>=ANIMATED_THUMB_ZOOM;
      const size=sizeFor(zoom,mobile),keep=new Set();
      hits.slice(0,maximum).forEach((forest,index)=>{
        const wantVideo=animate&&index<animatedLimit;
        keep.add(forest.id);
        let item=markers.get(forest.id);
        if(item && (item.animated!==wantVideo||item.size!==size)){
          stopMarker(item);markers.delete(forest.id);item=null;
        }
        if(!item){
          const marker=L.marker([forest.lat,forest.lng],{
            icon:miniIcon(size,wantVideo),pane:"kzForestPane",
            keyboard:false,interactive:true,bubblingMouseEvents:false,
            title:"Čarobna šuma — 300 m²"
          }).on("click",event=>{
            L.DomEvent.stopPropagation(event);
            flyTo(forest);
          }).addTo(layer);
          item={marker,size,animated:wantVideo};
          markers.set(forest.id,item);
        }
        enableMarkerVideo(item);
      });
      for(const [id,item] of markers){
        if(!keep.has(id)){stopMarker(item);markers.delete(id);}
      }
      return;
    }
    removeMarkers();
    const maximum=mobile?2:4,keep=new Set();
    for(const forest of hits.slice(0,maximum)){
      keep.add(forest.id);
      if(!videos.has(forest.id))addActual(forest);
      else{
        const el=videos.get(forest.id).getElement();
        el?.play?.()?.catch?.(()=>{});
      }
    }
    for(const [id,overlay] of videos){
      if(keep.has(id))continue;
      const el=overlay.getElement();
      if(el?.pause)try{el.pause();}catch(_){}
      layer.removeLayer(overlay);videos.delete(id);
    }
  }
  function mount(m){
    if(map||!m||!window.L)return;
    map=m;
    pane=map.getPane("kzForestPane")||map.createPane("kzForestPane");
    pane.classList.add("kz-forest-pane");
    pane.style.zIndex="1260";
    pane.style.pointerEvents="none";
    pane.parentNode?.appendChild(pane);
    layer=L.layerGroup().addTo(map);
    const toggle=document.getElementById("map-life-toggle");
    enabled=toggle?.getAttribute("aria-pressed")!=="false";
    toggle?.addEventListener("click",()=>{
      // Main game handler toggles aria-pressed synchronously before this listener.
      enabled=toggle.getAttribute("aria-pressed")!=="false";
      refresh();
    });
    const button=document.getElementById("kz-forest-button");
    if(button){
      button.textContent="🌲 Šume ("+all().length+")";
      button.title="Pronađi najbližu animiranu čarobnu šumu od 300 m²";
      button.addEventListener("click",focusNearest);
    }
    map.on("moveend zoomend",()=>{
      clearTimeout(showTimer);
      showTimer=setTimeout(()=>refresh(),110);
    });
    refresh();
  }
  const API=Object.freeze({
    count:()=>all().length,
    counts:()=>Object.fromEntries(REGIONS.map(r=>[r.name,r.count])),
    positions:()=>all(),
    areaM2:PLOT.areaM2,
    blocks:PLOT.columns*PLOT.rows,
    plot:PLOT,
    refresh:refresh,
    visibleCount:()=>markers.size+videos.size,
    videosPlaying:()=>videos.size,
    videoUrl:VIDEO_URL,
    posterUrl:POSTER_URL
  });
  window.KZMagicForests=API;
  window.addEventListener("kz:map-ready",e=>mount(e.detail?.map));
})();
