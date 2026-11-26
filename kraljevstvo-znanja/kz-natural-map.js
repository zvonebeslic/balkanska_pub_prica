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
  function addNature(map){
    if(!L.vectorGrid||!L.VectorGrid||!L.VectorGrid.Protobuf){console.warn("KZ: vector library unavailable; only relief is displayed.");return;}
    // Explicit allowlist: other vector layers are removed before rendering. No names,
    // streets, buildings, borders, POIs or artificial land-use features are drawn.
    const Natural=L.VectorGrid.Protobuf.extend({
      _getVectorTilePromise(coords){
        return L.VectorGrid.Protobuf.prototype._getVectorTilePromise.call(this,coords).then(tile=>{
          if(!tile||!tile.layers)return {layers:{}};
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
