/* Kraljevstvo znanja — Čarobne šume (500 m² = 25 blokova po 5 x 4 m).
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
  const PLOT=Object.freeze({columns:5,rows:5,widthM:25,heightM:20,areaM2:500});
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
      // Frakcijski indeks znači geometrijsko središte i kod parnog broja stupaca.
      x:x+(PLOT.columns-1)/2,
      y:y+(PLOT.rows-1)/2
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

  // SVI ZUMOVI: isti originalni WebM i isti poster iz tog WebM-a.
  // Nikada ne zamjenjuj šumu simboličnim stablima, drugom ilustracijom ili
  // posebnim video-slojem koji bi skakao pri promjeni zuma.
  const POSTER_URL="./media/carobna-suma-300m2-poster.webp?v=2";
  const NAV_ZOOM=19,REAL_SIZE_ZOOM=20;
  const markers=new Map();
  let map=null,layer=null,pane=null,enabled=true,showTimer=0,supportCached=null;
  let mediaOk=true;
  function canPlay(){
    if(supportCached!==null)return supportCached;
    const v=document.createElement("video");
    supportCached=Boolean(v.canPlayType?.('video/webm; codecs="vp9"'));
    return supportCached;
  }
  function sizeFor(forest){
    const zoom=map.getZoom(),mobile=map.getSize().x<560;
    if(zoom<REAL_SIZE_ZOOM){
      const side=zoom<9?(mobile?42:48):
        zoom<13?(mobile?56:66):
        zoom<17?(mobile?67:79):(mobile?78:96);
      return {width:side,height:Math.round(side*346/400)};
    }
    // Pri stvarnoj veličini uvijek baš 5 x 5 službenih blokova 5 x 4 m.
    const sw=map.latLngToLayerPoint(L.latLng(forest.bounds[0]));
    const ne=map.latLngToLayerPoint(L.latLng(forest.bounds[1]));
    return {
      width:Math.max(1,Math.round(Math.abs(ne.x-sw.x))),
      height:Math.max(1,Math.round(Math.abs(ne.y-sw.y)))
    };
  }
  function originalForestIcon(size){
    return L.divIcon({
      className:"kz-forest-map-marker",
      html:'<span class="kz-forest-mini-frame">'+
        '<img class="kz-forest-mini-image" src="'+POSTER_URL+
        '" alt="" loading="lazy" decoding="async"></span>'+
        '<span class="kz-forest-map-name">Čarobna šuma · 500 m²</span>',
      iconSize:[size.width,size.height],
      iconAnchor:[size.width/2,size.height/2]
    });
  }
  function applySize(item,size){
    // Mijenjaj SAMO veličinu jednog postojećeg markera. setIcon() bi pri
    // svakom zumiranju iznova stvarao video i mijenjao vizualni prikaz.
    if(item.width===size.width&&item.height===size.height)return;
    const el=item.marker.getElement();
    if(el){
      el.style.width=size.width+"px";
      el.style.height=size.height+"px";
      el.style.marginLeft=-Math.round(size.width/2)+"px";
      el.style.marginTop=-Math.round(size.height/2)+"px";
    }
    item.width=size.width;
    item.height=size.height;
  }
  function setAnimated(item,animate){
    if(item.animated===animate)return;
    const frame=item.marker.getElement()?.querySelector(".kz-forest-mini-frame");
    if(!frame)return;
    const video=frame.querySelector("video");
    if(!animate){
      if(video){
        try{video.pause();video.removeAttribute("src");video.load();}catch(_){}
        video.remove();
      }
      item.animated=false;
      return;
    }
    const el=document.createElement("video");
    el.className="kz-forest-mini-video";
    el.muted=true;
    el.defaultMuted=true;
    el.loop=true;
    el.autoplay=true;
    el.playsInline=true;
    el.preload="metadata";
    el.setAttribute("muted","");
    el.setAttribute("playsinline","");
    el.setAttribute("webkit-playsinline","");
    el.setAttribute("aria-hidden","true");
    el.poster=POSTER_URL;
    el.src=VIDEO_URL;
    el.addEventListener("error",()=>{
      // Na grešci ostaje ISTI kadar istog materijala, ne emoji ili druga slika.
      try{el.remove();}catch(_){}
      item.animated=false;
      mediaOk=false;
      refresh();
    },{once:true});
    frame.appendChild(el);
    item.animated=true;
    el.play().catch(()=>{ /* originalni poster ostaje ako autoplay nije dopušten */ });
  }
  function removeItem(item){
    setAnimated(item,false);
    layer.removeLayer(item.marker);
  }
  function removeAll(){
    for(const item of markers.values())removeItem(item);
    markers.clear();
  }
  function flyTo(forest){
    if(!map)return;
    map.flyTo([forest.lat,forest.lng],Math.max(REAL_SIZE_ZOOM,map.getZoom()),
      {duration:1.15});
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
  function refresh(m,on){
    if(m&&!map)mount(m);
    if(!map||!layer)return;
    if(typeof on==="boolean")enabled=on;
    if(!enabled||map.getZoom()<NAV_ZOOM){removeAll();return;}
    const viewport=map.getBounds().pad(.16);
    const center=map.getCenter(),mobile=map.getSize().x<560;
    const hits=all().filter(f=>viewport.contains([f.lat,f.lng]));
    hits.sort((a,b)=>distanceKm(a,center)-distanceKm(b,center));
    const maximum=map.getZoom()>=REAL_SIZE_ZOOM?(mobile?3:6):(mobile?32:64);
    const active=hits.slice(0,maximum),keep=new Set(active.map(f=>f.id));
    // Isti video preko SVIH ZUMOVA, ali ograničen broj dekodera kako
    // 341 šuma ne bi potrošilo memoriju mobitela. Ostali prikazuju poster
    // iz prvog kadra TOG ISTOG VIDEA.
    const animatedLimit=mediaOk&&canPlay()?(mobile?3:6):0;
    active.forEach((forest,index)=>{
      const size=sizeFor(forest);
      let item=markers.get(forest.id);
      if(!item){
        const marker=L.marker([forest.lat,forest.lng],{
          icon:originalForestIcon(size),
          pane:"kzForestPane",keyboard:false,interactive:true,
          bubblingMouseEvents:false,title:"Čarobna šuma · 500 m²"
        }).on("click",event=>{
          L.DomEvent.stopPropagation(event);
          flyTo(forest);
        }).addTo(layer);
        item={marker,width:size.width,height:size.height,animated:false};
        markers.set(forest.id,item);
      }
      applySize(item,size);
      setAnimated(item,index<animatedLimit);
      if(item.animated){
        const video=item.marker.getElement()?.querySelector("video");
        if(video?.paused)video.play().catch(()=>{});
      }
    });
    for(const [id,item] of markers){
      if(!keep.has(id)){removeItem(item);markers.delete(id);}
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
      enabled=toggle.getAttribute("aria-pressed")!=="false";
      refresh();
    });
    const button=document.getElementById("kz-forest-button");
    if(button){
      button.textContent="🌲 Šume";
      button.title="Pronađi čarobnu šumu s originalnim videom, 300 m²";
      button.addEventListener("click",focusNearest);
    }
    map.on("moveend zoomend",()=>{
      clearTimeout(showTimer);
      if(map.getZoom()<NAV_ZOOM){refresh();return;}
      showTimer=setTimeout(refresh,100);
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
    visibleCount:()=>markers.size,
    videosPlaying:()=>[...markers.values()].filter(i=>i.animated).length,
    videoUrl:VIDEO_URL,
    posterUrl:POSTER_URL
  });
  window.KZMagicForests=API;
  window.addEventListener("kz:map-ready",e=>mount(e.detail?.map));
})();
