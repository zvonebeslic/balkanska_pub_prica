/* Kraljevstvo znanja: pet originalnih malih ilustracija, svaka koristi
 * jedan zajednički 80-kadrovni WebP atlas. Samo vidljivi marker-i se crtaju.
 * Nema utjecaja na borbe, 5x4 m teritorije, GPS ili Supabase podatke.
 */
(function(){
  "use strict";
  const registry=window.KZWorldRegistry;
  if(!registry)return;
  const KINDS=["dragon","knight","owl","wizard","banner"];
  const LAT_STEP=0.10,LON_STEP=0.14,MIN_ZOOM=10,MAX_ZOOM=18;
  const loaded=new Map(),visible=new Map(),requested=new Set();
  let map=null,layer=null,pane=null,enabled=true,raf=0,refreshTimer=0,prevPaint=0;

  function hash(a,b){
    let x=(Math.imul(a+0x9e3779b9,1664525)^Math.imul(b+19,1013904223))|0;
    x=Math.imul(x^(x>>>16),0x7feb352d);
    x=Math.imul(x^(x>>>15),0x846ca68b);
    return ((x^(x>>>16))>>>0)/4294967296;
  }
  function width(){
    if(!map)return 40;
    const phone=map.getSize().x<560;
    return phone?38:52;
  }
  function makeIcon(size){
    return L.divIcon({
      className:"kz-small-80-marker",
      html:'<canvas class="kz-small-80-canvas" width="160" height="160" aria-hidden="true"></canvas>',
      iconSize:[size,size],iconAnchor:[size/2,Math.round(size*.83)]
    });
  }
  function draw(entry,now){
    const img=loaded.get(entry.kind);
    const canvas=entry.marker.getElement()?.querySelector("canvas");
    if(!img||!canvas)return;
    const frame=registry.frameAt(entry.kind,img,now,entry.id);
    if(entry.frame===frame)return;
    if(registry.paint(entry.kind,img,canvas,frame,false))entry.frame=frame;
  }
  function positions(){
    if(!map)return [];
    const bounds=map.getBounds().pad(.14),c=map.getCenter();
    const west=Math.max(-180,bounds.getWest()),east=Math.min(180,bounds.getEast());
    const south=Math.max(-82,bounds.getSouth()),north=Math.min(82,bounds.getNorth());
    const results=[];
    const minY=Math.floor(south/LAT_STEP),maxY=Math.ceil(north/LAT_STEP);
    const minX=Math.floor(west/LON_STEP),maxX=Math.ceil(east/LON_STEP);
    if((maxY-minY)*(maxX-minX)>6000)return results;
    for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
      const chance=hash(x,y);
      if(chance<.28)continue;
      const lat=(y+.19+.62*hash(x+11,y-3))*LAT_STEP;
      const lng=(x+.19+.62*hash(x-9,y+29))*LON_STEP;
      if(!registry.isLand(lng,lat))continue;
      const point=registry.pointFromBlock(registry.blockFor(lat,lng));
      if(!bounds.contains([point.lat,point.lng]))continue;
      const kind=KINDS[Math.floor(hash(x+31,y+79)*KINDS.length)];
      const centerDist=Math.abs(point.lat-c.lat)+Math.abs(point.lng-c.lng);
      results.push({key:x+":"+y,id:Math.abs((x*1597334677)^(y*381201580))%100000,
        point:point,kind:kind,rank:hash(x+7,y-17),dist:centerDist});
    }
    // Uniform pseudorandom order; no forced clusters around the center.
    results.sort((a,b)=>a.rank-b.rank);
    return results;
  }
  function ensureSprites(){
    // Do not decode 40 MB of decoration frames while viewing the whole planet.
    if(!map||!enabled||map.getZoom()<MIN_ZOOM||map.getZoom()>MAX_ZOOM)return;
    for(const kind of KINDS){
      if(requested.has(kind))continue;
      const source=registry.source(kind);
      if(!source)continue;
      requested.add(kind);
      const img=new Image();
      img.onload=()=>{
        if(!registry.layout(kind,img))return;
        loaded.set(kind,img);
        refresh(map,enabled);
      };
      img.onerror=()=>console.warn("KZ: 80-kadrovna dekoracija nije dostupna: "+kind);
      img.src=source;
    }
  }
  function refresh(m,on){
    if(m&&!map)mount(m);
    if(!map||!layer)return;
    enabled=on!==false;
    const zoom=map.getZoom();
    ensureSprites();
    if(!enabled||zoom<MIN_ZOOM||zoom>MAX_ZOOM){
      for(const entry of visible.values())layer.removeLayer(entry.marker);
      visible.clear();
      return;
    }
    const max=map.getSize().x<560?9:16,items=positions().slice(0,max),keep=new Set();
    const size=width();
    for(const item of items){
      if(!loaded.has(item.kind))continue;
      keep.add(item.key);
      let entry=visible.get(item.key);
      if(entry&&entry.kind!==item.kind){
        layer.removeLayer(entry.marker);visible.delete(item.key);entry=null;
      }
      if(!entry){
        const marker=L.marker([item.point.lat,item.point.lng],{
          icon:makeIcon(size),pane:"kzDecorPane",
          keyboard:false,interactive:false,bubblingMouseEvents:false
        }).addTo(layer);
        entry={marker:marker,id:item.id,kind:item.kind,frame:-1,size:size};
        visible.set(item.key,entry);
      }else{
        entry.marker.setLatLng([item.point.lat,item.point.lng]);
        if(entry.size!==size){entry.marker.setIcon(makeIcon(size));entry.size=size;entry.frame=-1;}
      }
      draw(entry,Date.now());
    }
    for(const [key,entry] of visible){
      if(!keep.has(key)){layer.removeLayer(entry.marker);visible.delete(key);}
    }
  }
  function tick(timestamp){
    raf=requestAnimationFrame(tick);
    if(!map||!enabled||document.hidden||!visible.size)return;
    if(timestamp-prevPaint<1000/60)return;
    prevPaint=timestamp;
    const now=Date.now();
    for(const entry of visible.values())draw(entry,now);
  }
  function mount(m){
    if(map||!m||!window.L)return;
    map=m;
    pane=map.getPane("kzDecorPane")||map.createPane("kzDecorPane");
    pane.style.zIndex="1200";
    pane.style.pointerEvents="none";
    layer=L.layerGroup().addTo(map);
    map.on("moveend zoomend",()=>{
      clearTimeout(refreshTimer);
      refreshTimer=setTimeout(()=>refresh(map,enabled),100);
    });
    raf=requestAnimationFrame(tick);
    refresh(map,true);
  }
  window.KZWorldSprites={
    refresh:refresh,
    count:KINDS.length,
    visibleCount:()=>visible.size,
    atlasesLoaded:()=>loaded.size
  };
  window.addEventListener("kz:map-ready",e=>mount(e.detail?.map));
})();
