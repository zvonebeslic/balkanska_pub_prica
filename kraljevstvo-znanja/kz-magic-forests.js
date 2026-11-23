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
  const VIDEO_URL="./media/carobna-suma-300m2.webm?v=1";
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
        if(existing.some(v=>distanceKm(v.point,plot.point)<region.spacingKm))continue;
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

  let map=null,layer=null,pane=null,enabled=true,showTimer=0,mediaOk=true;
  const markers=new Map(),videos=new Map();
  const NAV_ZOOM=6,VIDEO_ZOOM=20;
  function canvasIcon(){
    return L.divIcon({
      className:"kz-forest-map-marker",
      html:'<span class="kz-forest-map-emoji" aria-hidden="true">🌲</span>'+
        '<span class="kz-forest-map-name">Čarobna šuma</span>',
      iconSize:[60,48],iconAnchor:[30,37]
    });
  }
  function flyTo(forest){
    if(!map)return;
    map.flyTo([forest.lat,forest.lng],Math.max(VIDEO_ZOOM,map.getZoom()),{duration:1.15});
  }
  function removeMarkers(){
    if(!layer)return;
    markers.forEach(marker=>layer.removeLayer(marker));markers.clear();
  }
  function removeVideos(){
    if(!layer)return;
    videos.forEach(item=>{
      const el=item.getElement();
      if(el){try{el.pause();el.removeAttribute("src");el.load();}catch(_){}}
      layer.removeLayer(item);
    });
    videos.clear();
  }
  function hasVideoSupport(){
    const video=document.createElement("video");
    return Boolean(video.canPlayType?.('video/webm; codecs="vp9"'));
  }
  function addVideo(forest){
    const overlay=L.videoOverlay(VIDEO_URL,forest.bounds,{
      pane:"kzForestPane",autoplay:true,loop:true,muted:true,
      playsInline:true,interactive:false,opacity:1,
      keepAspectRatio:true,zIndex:0
    }).addTo(layer);
    const video=overlay.getElement();
    if(video){
      video.muted=true;
      video.loop=true;
      video.autoplay=true;
      video.playsInline=true;
      video.preload="auto";
      video.style.objectFit="contain";
      video.style.pointerEvents="none";
      video.setAttribute("playsinline","");
      video.setAttribute("webkit-playsinline","");
      video.addEventListener("error",()=>{mediaOk=false;refresh();},{once:true});
      video.play().catch(()=>{ /* browser may defer playback until gesture */ });
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
    const bounds=map.getBounds().pad(.12);
    const center=map.getCenter();
    const candidates=all().filter(f=>bounds.contains([f.lat,f.lng]));
    candidates.sort((a,b)=>distanceKm(a,center)-distanceKm(b,center));
    if(zoom<VIDEO_ZOOM||!mediaOk||!hasVideoSupport()){
      removeVideos();
      const maximum=map.getSize().x<560?18:32;
      const keep=new Set();
      for(const forest of candidates.slice(0,maximum)){
        keep.add(forest.id);
        if(markers.has(forest.id))continue;
        const marker=L.marker([forest.lat,forest.lng],{
          icon:canvasIcon(),pane:"kzForestPane",keyboard:false,interactive:true,
          bubblingMouseEvents:false,title:"Čarobna šuma · 300 m²"
        }).on("click",(ev)=>{
          L.DomEvent.stopPropagation(ev);
          flyTo(forest);
        }).addTo(layer);
        markers.set(forest.id,marker);
      }
      for(const [id,marker] of markers){
        if(!keep.has(id)){layer.removeLayer(marker);markers.delete(id);}
      }
      return;
    }
    removeMarkers();
    // Video layers only at very high zoom; decode at most 2 on a phone.
    const maximum=map.getSize().x<560?2:4,keep=new Set();
    for(const forest of candidates.slice(0,maximum)){
      keep.add(forest.id);
      if(!videos.has(forest.id))addVideo(forest);
      else videos.get(forest.id).getElement()?.play().catch(()=>{});
    }
    for(const [id,overlay] of videos){
      if(keep.has(id))continue;
      const element=overlay.getElement();
      if(element){try{element.pause();}catch(_){}}
      layer.removeLayer(overlay);videos.delete(id);
    }
  }
  function mount(m){
    if(map||!m||!window.L)return;
    map=m;
    pane=map.getPane("kzForestPane")||map.createPane("kzForestPane");
    pane.style.zIndex="1260";
    layer=L.layerGroup().addTo(map);
    enabled=document.getElementById("map-life-toggle")?.getAttribute("aria-pressed")!=="false";
    map.on("moveend zoomend",()=>{
      clearTimeout(showTimer);
      showTimer=setTimeout(()=>refresh(),90);
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
    videoUrl:VIDEO_URL
  });
  window.KZMagicForests=API;
  window.addEventListener("kz:map-ready",e=>mount(e.detail?.map));
})();
