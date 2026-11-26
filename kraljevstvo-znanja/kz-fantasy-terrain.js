/* KZ fantasy terrain: deterministic, offline Canvas tiles, no real-world map data.
 * Visual layer only. Never changes CRS, GPS, gameplay, territory or database.
 */
(() => {
  "use strict";
  const WORLD=40075016.68557849, SEED=0x4b5a2026;
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const smooth=t=>t*t*(3-2*t);
  function hash(x,y,s){
    let h=Math.imul(x|0,0x1f123bb5)^Math.imul(y|0,0x5f356495)^s^SEED;
    h=Math.imul(h^(h>>>16),0x45d9f3b);h=Math.imul(h^(h>>>16),0x45d9f3b);
    return ((h^(h>>>16))>>>0)/4294967295;
  }
  function noise(x,y,scale,s){
    x/=scale;y/=scale;
    const a=Math.floor(x),b=Math.floor(y),u=smooth(x-a),v=smooth(y-b);
    return lerp(lerp(hash(a,b,s),hash(a+1,b,s),u),lerp(hash(a,b+1,s),hash(a+1,b+1,s),u),v);
  }
  function field(x,y,pixel){
    // Fixed spatial frequencies; fine detail fades out before it aliases at low zoom.
    const n=(scale,s)=>lerp(.5,noise(x,y,scale,s),clamp((scale/pixel-1)/3));
    const region=n(2300000,11), hills=n(410000,29), fold=n(85000,43), rock=n(13000,63);
    const height=.47*region+.28*hills+.17*fold+.08*rock;
    const moisture=.62*n(950000,71)+.38*n(120000,83);
    const vegetation=n(19000,101);
    const local=.54*n(1400,113)+.28*n(140,127)+.12*n(20,139)+.06*n(3,151);
    // Imaginary water systems; no connection to geographic features.
    const stream=Math.abs(n(72000,173)-.5);
    const river=stream<.009 && moisture>.53 && height>.31 && height<.58 && pixel<1800;
    return {height,moisture,vegetation,local,river};
  }
  const colors={
    deep:[26,68,88], shallow:[44,104,111], sand:[185,161,102],
    grass:[102,145,74], meadow:[145,173,91], forest:[45,92,59],
    dry:[161,139,82], hills:[111,123,78], rock:[126,128,122], snow:[218,226,218]
  };
  function mix(a,b,t){return [lerp(a[0],b[0],t),lerp(a[1],b[1],t),lerp(a[2],b[2],t)];}
  function paint(f,shade){
    const {height:h,moisture:m,vegetation:v,local:l,river}=f;
    let c;
    if(h<.30){c=mix(colors.deep,colors.shallow,clamp((h-.18)/.12));shade=0;}
    else if(h<.315)c=mix(colors.shallow,colors.sand,clamp((h-.30)/.015));
    else if(river){c=colors.shallow.slice();shade=0;}
    else{
      c=mix(colors.grass,colors.meadow,clamp((.62-m)*1.6));
      c=mix(c,colors.dry,clamp((.34-m)*4));
      c=mix(c,colors.forest,clamp((m-.47)*3+(v-.52)*1.9));
      if(h>.57)c=mix(c,colors.hills,clamp((h-.57)/.12));
      if(h>.66)c=mix(c,colors.rock,clamp((h-.66)/.12));
      if(h>.76)c=mix(c,colors.snow,clamp((h-.76)/.09));
    }
    const detail=(l-.5)*(h<.315||river?11:40);
    return c.map(k=>clamp(Math.round(k+shade+detail),0,255));
  }
  function makeTile(coords){
    const tile=document.createElement("canvas");
    const side=64, stride=side+2;
    tile.width=tile.height=side;
    tile.setAttribute("aria-hidden","true");
    const ctx=tile.getContext("2d",{alpha:false});
    if(!ctx)return tile;
    const span=WORLD/Math.pow(2,coords.z), step=span/side;
    const x0=coords.x*span-WORLD/2,y0=coords.y*span-WORLD/2;
    const fields=new Array(stride*stride);
    for(let iy=0;iy<stride;iy++)for(let ix=0;ix<stride;ix++)
      fields[iy*stride+ix]=field(x0+(ix-.5)*step,y0+(iy-.5)*step,step);
    const img=ctx.createImageData(side,side);
    for(let y=0;y<side;y++)for(let x=0;x<side;x++){
      const i=(y+1)*stride+x+1,f=fields[i];
      // Soft north-west lighting, including neighbor samples across tile edges.
      const slope=(fields[i-1].height-fields[i+1].height)+(fields[i-stride].height-fields[i+stride].height);
      const shade=clamp(slope*240,-25,25);
      const c=paint(f,shade),o=(y*side+x)*4;
      img.data[o]=c[0];img.data[o+1]=c[1];img.data[o+2]=c[2];img.data[o+3]=255;
    }
    ctx.putImageData(img,0,0);
    return tile;
  }
  window.KZFantasyTerrain={
    create(){
      if(!window.L)throw Error("Leaflet nije učitan.");
      const Layer=L.GridLayer.extend({createTile(coords){return makeTile(coords);}});
      return new Layer({tileSize:256,minZoom:2,maxZoom:21,maxNativeZoom:21,noWrap:true,
        keepBuffer:2,updateWhenIdle:true,updateWhenZooming:false,
        attribution:"Izmišljeni svijet · KvizToGo",className:"kz-fantasy-terrain"});
    }
  };
})();
