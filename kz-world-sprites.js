/* Kraljevstvo Znanja: 10 rasteriziranih WebP likova iz 3D-renderiranog atlasa.
   Pre-rendered sprites, tri kadra po liku. Ne koristi SVG ni WebGL.
   Dekorativni sloj ne dira stvarne teritorije, krugove kviza ni borbe. */
(function(){
  "use strict";
  const cast=[
    {name:"Hodajući dvorac",x:.15,y:.20,index:0},
    {name:"Parni robot",x:.37,y:.12,index:1},
    {name:"Čarobnjak",x:.62,y:.22,index:2},
    {name:"Crveni zmaj",x:.83,y:.13,index:3},
    {name:"Šumski div",x:.17,y:.43,index:4},
    {name:"Leteći brod",x:.47,y:.45,index:5},
    {name:"Kraljevski vitez",x:.78,y:.43,index:6},
    {name:"Gusarski kapetan",x:.19,y:.73,index:7},
    {name:"Živa škrinja",x:.51,y:.79,index:8},
    {name:"Kristalni pauk",x:.83,y:.73,index:9}
  ];
  const hasNine = Boolean(window.KZ_SPRITE_ATLAS_9);
  const atlas = window.KZ_SPRITE_ATLAS_9 || window.KZ_SPRITE_ATLAS;
  const frameCount = hasNine ? 9 : 3;
  let map=null,layer=null,nodes=[],enabled=true,frame=1,clock=null;
  function position(index,k){
    if(hasNine) return (index/9*100).toFixed(5)+"% "+(k/8*100).toFixed(5)+"%";
    const col=index%5,row=Math.floor(index/5);
    return ((col*3+k)/14*100).toFixed(5)+"% "+(row*100)+"%";
  }
  function init(m){
    if(map||!atlas)return;
    map=m;
    const pane=map.createPane("kzRasterSpritePane");
    // Last visual layer above kingdom blocks and territory borders; decorative only.
    pane.style.zIndex="1350";
    pane.style.pointerEvents="none";
    const style=document.createElement("style");
    style.textContent=".kz-raster-marker{background:transparent!important;border:0!important;pointer-events:none!important;}" +
      ".kz-raster-figure{display:block;width:100%;height:100%;background-image:url('data:image/webp;base64,"+
      atlas+
      "');background-repeat:no-repeat;background-size:" + (hasNine ? "1000% 900%" : "1500% 200%") + ";filter:drop-shadow(0 3px 3px #0009);pointer-events:none;}" +
      "@media(prefers-reduced-motion:reduce){.kz-raster-figure{transition:none!important}}";
    document.head.appendChild(style);
    layer=L.layerGroup().addTo(map);
    // Animiranje samo vidljivih malih raster-spriteova, bez 3D geometrije.
    if(!window.matchMedia("(prefers-reduced-motion: reduce)").matches){
      clock=window.setInterval(()=>{
        if(document.hidden||!enabled||!nodes.length)return;
        frame=(frame+1)%frameCount;
        nodes.forEach(entry=>{
          if(entry.node&&entry.node.isConnected)
            entry.node.style.backgroundPosition=position(entry.index,frame);
        });
      },hasNine ? 180 : 260);
    }
  }
  function refresh(m,on){
    if(!m||!window.L||!atlas)return;
    init(m);
    if(!layer)return;
    enabled=Boolean(on);
    nodes=[];
    layer.clearLayers();
    if(!enabled||map.getZoom()>=18)return;
    const viewport=map.getSize();
    const small=viewport.x<480;
    const width=small?47:70,height=Math.round(width*1.125);
    cast.forEach(c=>{
      const pixel=L.point(viewport.x*c.x,viewport.y*c.y);
      const location=map.containerPointToLatLng(pixel);
      const icon=L.divIcon({
        className:"kz-raster-marker",
        html:'<span class="kz-raster-figure" aria-hidden="true" style="background-position:'+
          position(c.index,frame)+'"></span>',
        iconSize:[width,height],iconAnchor:[width/2,height/2]
      });
      const marker=L.marker(location,{
        icon,pane:"kzRasterSpritePane",interactive:false,
        keyboard:false,bubblingMouseEvents:false
      }).addTo(layer);
      nodes.push({node:marker.getElement()?.querySelector(".kz-raster-figure"),index:c.index});
    });
  }
  window.KZWorldSprites={refresh,count:cast.length};
})();