/* Natural Earth basemap for Kraljevstvo Znanja. Visual only; existing CRS and game layers unchanged. */
(() => {
  "use strict";
  const credits='<a href="https://registry.opendata.aws/terrain-tiles/" target="_blank" rel="noopener">Mapzen terrain</a> · <a href="./kz-terrain-credits.html" target="_blank" rel="noopener">Izvori reljefa</a>';
  const vectorCredits='<a href="https://openfreemap.org/" target="_blank" rel="noopener">OpenFreeMap</a> © <a href="https://openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> · © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';
  const water="#528fae";
  const ramp=[[-1,[126,159,94]],[100,[139,169,102]],[400,[118,151,87]],[850,[113,136,83]],[1500,[147,145,107]],[2300,[171,165,147]],[3300,[222,224,212]],[5000,[245,245,239]]];
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function landColor(h){
    for(let k=1;k<ramp.length;k++){
      if(h<=ramp[k][0]){
        const [a,ca]=ramp[k-1],[b,cb]=ramp[k],t=clamp((h-a)/(b-a),0,1);
        return ca.map((v,i)=>v+(cb[i]-v)*t);
      }
    }
    return ramp[ramp.length-1][1];
  }
  function drawRelief(tile,img,coords){
    const ctx=tile.getContext("2d",{willReadFrequently:true});
    ctx.drawImage(img,0,0,256,256);
    const pixels=ctx.getImageData(0,0,256,256),d=pixels.data,n=65536;
    const heights=new Float32Array(n);
    for(let i=0;i<n;i++){const k=i*4;heights[i]=d[k]*256+d[k+1]+d[k+2]/256-32768;}
    const lat=Math.atan(Math.sinh(Math.PI*(1-2*(coords.y+.5)/Math.pow(2,coords.z))));
    const meters=40075016.68557849*Math.cos(lat)/(256*Math.pow(2,coords.z));
    const strength=coords.z<7?2.2:1.4;
    for(let y=0;y<256;y++)for(let x=0;x<256;x++){
      const i=y*256+x,h=heights[i],k=i*4;
      if(h< -2){d[k]=82;d[k+1]=143;d[k+2]=174;d[k+3]=255;continue;}
      const dx=(heights[y*256+Math.min(255,x+1)]-heights[y*256+Math.max(0,x-1)])/(2*meters);
      const dy=(heights[Math.min(255,y+1)*256+x]-heights[Math.max(0,y-1)*256+x])/(2*meters);
      const gx=dx*strength,gy=dy*strength;
      const light=(.72+.49*gx+.49*gy)/Math.sqrt(1+gx*gx+gy*gy);
      const shade=clamp((light-.72)*.7,-.36,.28);
      const color=landColor(h);
      d[k]=clamp(color[0]*(1+shade),0,255);
      d[k+1]=clamp(color[1]*(1+shade),0,255);
      d[k+2]=clamp(color[2]*(1+shade),0,255);d[k+3]=255;
    }
    ctx.putImageData(pixels,0,0);
  }
  function addRelief(map){
    const Relief=L.GridLayer.extend({
      createTile(coords,done){
        const tile=document.createElement("canvas");tile.width=tile.height=256;
        const ctx=tile.getContext("2d");ctx.fillStyle="#8ba966";ctx.fillRect(0,0,256,256);
        const img=new Image();img.crossOrigin="anonymous";
        img.onload=()=>{try{drawRelief(tile,img,coords);}catch(e){console.warn("KZ relief tile",e);}done(null,tile);};
        img.onerror=()=>done(null,tile);
        img.src="https://s3.amazonaws.com/elevation-tiles-prod/terrarium/"+coords.z+"/"+coords.x+"/"+coords.y+".png";
        return tile;
      }
    });
    return new Relief({minZoom:2,maxZoom:21,maxNativeZoom:13,noWrap:true,keepBuffer:1,updateWhenIdle:true,updateWhenZooming:false,attribution:credits}).addTo(map);
  }
  const fill=(color,opacity=1)=>({fill:true,fillColor:color,fillOpacity:opacity,stroke:false,weight:0,interactive:false});
  const landcover=(p)=>{
    switch(p.class){
      case "wood": return fill("#466e43",.64);
      case "grass": return fill("#a5bc78",.35);
      case "scrub": return fill("#7f9158",.35);
      case "sand": return fill("#d9c18c",.75);
      case "ice": return fill("#e9eff0",.88);
      case "rock": return fill("#a8a69a",.45);
      case "wetland": return fill("#789c87",.55);
      default:return [];
    }
  };
  // Geographic text only, drawn separately from all game objects.
  function geographicLabels(map){
    const pane=map.createPane("kz-geographic-labels");
    pane.style.zIndex="300";pane.style.pointerEvents="none";
    const style=document.createElement("style");
    style.textContent=".kz-geo-label{background:none!important;border:0!important;pointer-events:none!important;text-align:center;white-space:nowrap;overflow:visible}.kz-geo-label span{display:inline-block;transform:translate(-50%,-50%);position:absolute;left:50%;top:50%;white-space:nowrap;line-height:1.12;font-family:system-ui,sans-serif;text-shadow:-1px -1px 0 #e8e6d0,1px -1px 0 #e8e6d0,-1px 1px 0 #e8e6d0,1px 1px 0 #e8e6d0,0 0 3px #f0ecd8}";
    document.head.appendChild(style);
    const layer=L.layerGroup().addTo(map),cache=new Map();
    let frame=0,zooming=false;
    const placeStyles={
      continent:[2,19,0],country:[3,15,1],state:[6,12,4],province:[7,12,4],
      city:[5,14,2],town:[9,12,5],village:[11,11,7],hamlet:[13,10,9],
      island:[7,12,5],archipelago:[5,13,3],islet:[13,10,9]
    };
    const waterStyles={ocean:[2,17,0],sea:[4,15,1],bay:[8,12,5],strait:[8,12,5],lake:[7,12,5],river:[9,11,6],stream:[13,10,9]};
    function describe(name,p,z){
      const cls=String(p.class||"");let info,kind="land";
      if(name==="place"){
        info=placeStyles[cls];if(!info)return null;
        if(cls==="country"&&z>11||cls==="continent"&&z>6||["state","province"].includes(cls)&&z>13)return null;
        if(cls==="city"&&z<8&&Number(p.rank||0)>6)return null;
      }else if(name==="water_name"||name==="waterway"){
        info=waterStyles[cls];kind="water";if(!info)return null;
      }else if(name==="mountain_peak"){
        if(!["peak","volcano","ridge","saddle"].includes(cls))return null;
        info=[10,11,6];kind="peak";
        if(z<13&&Number(p.rank||0)>5)return null;
      }else return null;
      if(z<info[0])return null;
      const rank=Number(p.rank);return {size:info[1],priority:info[2]+(Number.isFinite(rank)?Math.min(50,rank)/100:0),kind,cls};
    }
    function collect(tile,coords){
      const out=[];
      for(const name of ["place","water_name","waterway","mountain_peak"]){
        const source=tile.layers?.[name];if(!source)continue;
        for(const f of source.features||[]){
          const p=f.properties||{},label=String(p["name:hr"]||p.name||p["name:latin"]||p.name_en||"").trim();
          if(!label||label.length>100)continue;
          if(!describe(name,p,21)&&!describe(name,p,coords.z))continue;
          // Only point and line labels; never derive names from POIs or polygons.
          if(f.type!==1&&f.type!==2)continue;
          const geom=f.geometry||[],line=geom.reduce((a,b)=>b.length>a.length?b:a,[]);
          if(!line.length)continue;
          const pt=line[Math.floor(line.length/2)],extent=f.extent||source.extent||4096;
          if(!pt||pt.x<0||pt.y<0||pt.x>=extent||pt.y>=extent)continue;
          const size=256;
          const ll=map.unproject(L.point((coords.x+pt.x/extent)*size,(coords.y+pt.y/extent)*size),coords.z);
          if(Math.abs(ll.lat)>85.06||Math.abs(ll.lng)>180)continue;
          out.push({name,p,label,ll});
        }
      }
      const key=coords.z+":"+coords.x+":"+coords.y;
      cache.delete(key);cache.set(key,out);
      while(cache.size>120)cache.delete(cache.keys().next().value);
      schedule();
    }
    function schedule(){if(!frame)frame=requestAnimationFrame(()=>{frame=0;draw();});}
    function draw(){
      if(zooming)return;
      const z=map.getZoom(),sourceZoom=Math.min(14,Math.round(z)),bounds=map.getSize();
      const candidates=[];
      for(const [key,features] of cache){
        if(!key.startsWith(sourceZoom+":"))continue;
        for(const item of features){
          const meta=describe(item.name,item.p,z);if(!meta)continue;
          const px=map.latLngToContainerPoint(item.ll);
          if(px.x<15||px.y<12||px.x>bounds.x-15||px.y>bounds.y-12)continue;
          candidates.push({...item,...meta,px});
        }
      }
      candidates.sort((a,b)=>a.priority-b.priority||a.label.localeCompare(b.label));
      layer.clearLayers();
      const placed=[],seen=new Set();
      for(const c of candidates){
        if(placed.length>=100)break;
        const key=c.kind+":"+c.label,px=c.px;
        if(seen.has(key))continue;
        const w=Math.max(28,Array.from(c.label).length*c.size*.62)+12,h=c.size+9;
        const r=[px.x-w/2,px.y-h/2,px.x+w/2,px.y+h/2];
        if(placed.some(b=>r[0]<b[2]&&r[2]>b[0]&&r[1]<b[3]&&r[3]>b[1]))continue;
        const span=document.createElement("span");span.textContent=c.label;
        span.style.fontSize=c.size+"px";
        span.style.fontWeight=c.priority<3?"700":"600";
        span.style.color=c.kind==="water"?"#173e59":c.kind==="peak"?"#413b31":"#293b25";
        if(c.kind==="water")span.style.fontStyle="italic";
        if(c.cls==="country"||c.cls==="continent")span.style.letterSpacing=".6px";
        L.marker(c.ll,{pane:"kz-geographic-labels",interactive:false,keyboard:false,
          icon:L.divIcon({className:"kz-geo-label",html:span,iconSize:[1,1],iconAnchor:[0,0]})}).addTo(layer);
        placed.push(r);seen.add(key);
      }
    }
    map.on("zoomstart",()=>{zooming=true;layer.clearLayers();});
    map.on("zoomend",()=>{zooming=false;schedule();});
    map.on("moveend resize",schedule);
    map.on("unload",()=>{if(frame)cancelAnimationFrame(frame);cache.clear();style.remove();});
    return {collect};
  }
  function addNature(map){
    if(!L.vectorGrid||!L.VectorGrid||!L.VectorGrid.Protobuf){console.warn("KZ: vector library unavailable; only relief is displayed.");return;}
    const labels=geographicLabels(map);
    // Only geographic names and natural geometry. No streets, buildings, borders or POIs.
    const Natural=L.VectorGrid.Protobuf.extend({
      _getVectorTilePromise(coords){
        return L.VectorGrid.Protobuf.prototype._getVectorTilePromise.call(this,coords).then(tile=>{
          if(!tile||!tile.layers)return {layers:{}};
          try{labels.collect(tile,coords);}catch(e){console.warn("KZ geographic labels",e);}
          const filtered={};
          for(const name of ["landcover","water","waterway"]){
            if(tile.layers[name])filtered[name]=tile.layers[name];
          }
          return {layers:filtered};
        }).catch(()=>({layers:{}}));
      }
    });
    const layer=new Natural("https://tiles.openfreemap.org/planet/latest/{z}/{x}/{y}.pbf",{
      rendererFactory:L.svg.tile,interactive:false,minZoom:2,maxZoom:21,maxNativeZoom:14,
      noWrap:true,keepBuffer:1,updateWhenIdle:true,updateWhenZooming:false,
      attribution:vectorCredits,
      vectorTileLayerStyles:{
        landcover,
        water:p=>p.class==="dock"||p.class==="swimming_pool"?[]:fill(water,1),
        waterway:(p,z)=>p.class==="river"||p.class==="stream"?{color:water,weight:p.class==="river"?Math.max(1,Math.min(3,z/5)):.8,opacity:.95,fill:false,interactive:false}:[]
      }
    });
    layer.addTo(map);
  }
  window.KZNaturalMap={addTo(map){addRelief(map);addNature(map);}};
})();
