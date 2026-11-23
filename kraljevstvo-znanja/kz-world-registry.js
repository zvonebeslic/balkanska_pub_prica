/* Kraljevstvo znanja — jedinstveni katalog animacija i rasporeda.
 * Originalni WebP atlasi ostaju zasebni binarni resursi (učitaju se samo jednom).
 * Svi primjerci jednog lika koriste isti atlas i pravila animacije.
 * Raspored je deterministički, zemljopisno raspršen, bez gradskih klastera.
 */
(function(){
  "use strict";
  const TYPES=Object.freeze({
    castle:Object.freeze({
      id:"castle",label:"Hodajući dvorac",atlasKey:"KZ_ROAMING_CASTLE_WEBP",
      frameWidth:192,frameHeight:192,columns:40,sourceFrames:40,
      targetFrames:80,sourceFormat:"webp",periodMs:2800,
      mobileLimit:26,desktopLimit:44,minZoom:12,moves:true
    }),
    iron:Object.freeze({
      id:"iron",label:"Sir Željeznik",atlasKey:"KZ_IRON_ROBOT_ATLAS",
      frameWidth:224,frameHeight:224,columns:8,sourceFrames:40,
      targetFrames:80,sourceFormat:"webp",periodMs:4200,
      mobileLimit:18,desktopLimit:36,minZoom:12,moves:false
    })
  });
  // Pojednostavljene kopnene siluete. Ovdje je jedino mjesto
  // na kojem se podešava globalni početni raspored.
  // Namjerno bez točaka vezanih uz gradove.
  const LAND=[
    [[-168,69],[-155,60],[-137,59],[-130,49],[-124,40],[-117,32],[-110,31],
     [-105,24],[-97,16],[-88,16],[-86,11],[-82,9],[-78,9],[-77,20],
     [-81,27],[-79,34],[-67,44],[-53,52],[-56,61],[-80,70],
     [-105,73],[-128,72],[-151,73]],
    [[-82,11],[-77,8],[-74,3],[-80,-3],[-79,-10],[-75,-16],
     [-72,-28],[-73,-37],[-70,-47],[-68,-56],[-63,-54],
     [-64,-42],[-59,-35],[-52,-33],[-48,-28],[-35,-7],
     [-35,-3],[-44,1],[-50,4],[-58,9],[-68,12]],
    [[-11,36],[-10,43],[-7,45],[-5,49],[-11,51],[-8,59],
     [-2,59],[4,55],[10,56],[12,60],[21,71],[31,71],
     [31,62],[43,59],[49,56],[40,47],[35,44],[29,41],
     [28,36],[20,35],[18,40],[12,38],[9,43],[4,43]],
    [[-17,36],[5,37],[12,33],[24,33],[35,31],[41,12],
     [51,12],[49,2],[42,-12],[34,-23],[30,-34],[19,-35],
     [12,-29],[10,-19],[8,-6],[-1,5],[-9,5],[-17,14]],
    [[26,41],[36,45],[39,57],[48,61],[65,71],[88,76],
     [114,73],[133,70],[142,58],[135,50],[130,42],
     [140,37],[141,31],[131,30],[123,23],[116,19],
     [110,11],[105,2],[101,-1],[96,6],[98,17],
     [90,21],[83,8],[76,7],[72,19],[66,24],
     [61,25],[58,30],[50,31],[46,39],[41,42],[35,35]],
    [[95,22],[107,23],[120,19],[125,9],[126,-6],
     [122,-10],[115,-9],[108,-7],[104,3],[100,9]],
    [[113,-11],[123,-12],[134,-11],[139,-15],[151,-21],
     [153,-29],[146,-39],[136,-36],[128,-34],[115,-33]],
    [[-53,60],[-43,60],[-38,65],[-42,73],[-50,80],[-59,82],[-60,71]],
    [[47,-13],[50,-16],[49,-24],[44,-26],[43,-18]],
    [[166,-34],[179,-39],[175,-46],[168,-47],[166,-41]],
    [[130,30],[136,34],[141,40],[146,44],[144,35],[138,33]],
    [[-10,50],[-5,50],[-1,55],[-4,60],[-9,59]],
    [[-9,51],[-6,51],[-6,55],[-10,55]]
  ];
  function inside(lon,lat,poly){
    let hit=false;
    for(let i=0,j=poly.length-1;i<poly.length;j=i++){
      const a=poly[i],b=poly[j];
      if((a[1]>lat)!==(b[1]>lat) &&
         lon < (b[0]-a[0])*(lat-a[1])/(b[1]-a[1])+a[0])hit=!hit;
    }
    return hit;
  }
  function hash(a,b){
    let x=(Math.imul((a|0)+0x9e3779b9,1664525)^Math.imul((b|0)+17,1013904223))|0;
    x=Math.imul(x^(x>>>16),0x7feb352d);
    x=Math.imul(x^(x>>>15),0x846ca68b);
    return ((x^(x>>>16))>>>0)/4294967296;
  }
  function isLand(lon,lat){
    for(const poly of LAND)if(inside(lon,lat,poly))return true;
    return false;
  }
  // Jednako velika područja površine: latitude se uzorkuje po sin(lat).
  // Fisher–Yates miješanje: nasumičan izbor ćelija bez ponavljanja.
  // Ograničeni jitter čuva razmak, a početna distribucija ostaje stabilna.
  let sites=null;
  function prepare(){
    if(sites)return sites;
    const rows=200,cols=540,edge=Math.sin(78*Math.PI/180),items=[];
    for(let r=0;r<rows;r++){
      const s=-edge+(r+.5)*2*edge/rows;
      const lat=Math.asin(s)*180/Math.PI;
      for(let c=0;c<cols;c++){
        const lon=-180+(c+.5)*360/cols;
        if(isLand(lon,lat))items.push([r,c]);
      }
    }
    // Dovoljno ćelija da svi čuvari dobiju jedinstven početni sektor.
    if(items.length<13200)throw Error("KZ: premalo kopnenih sektora ("+items.length+")");
    let seed=0x385a77b1;
    const next=()=>{
      seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
      return (seed>>>0)/4294967296;
    };
    for(let i=items.length-1;i>0;i--){
      const j=Math.floor(next()*(i+1)),tmp=items[i];
      items[i]=items[j];items[j]=tmp;
    }
    sites=items;return items;
  }
  function pointFor(id,generation){
    const a=prepare();
    const g=Math.max(0,Number(generation)||0);
    // Rezervirano 0..1200 za dvorce, 1201..12400 za Željeznike.
    const index=id>=2000?1201+id-2000:id;
    const slot=g===0?index%a.length:Math.floor(hash(id,g*7919+101)*a.length);
    const cell=a[slot], rows=200,cols=540,edge=Math.sin(78*Math.PI/180);
    const jitterLon=(hash(id,g+311)-.5)*.65;
    const jitterLat=(hash(id,g+717)-.5)*.65;
    const sinLat=-edge+(cell[0]+.5+jitterLat)*2*edge/rows;
    const point={lat:Math.asin(sinLat)*180/Math.PI,
      lng:-180+(cell[1]+.5+jitterLon)*360/cols};
    // Jitter ne smije gurnuti kopnenu ikonu preko ruba konture.
    if(!isLand(point.lng,point.lat)){
      return {lat:Math.asin(-edge+(cell[0]+.5)*2*edge/rows)*180/Math.PI,
        lng:-180+(cell[1]+.5)*360/cols};
    }
    return point;
  }
  function info(id){return TYPES[id]||null;}
  function source(id){
    const type=info(id);
    return type?window[type.atlasKey]||null:null;
  }
  window.KZWorldRegistry=Object.freeze({
    types:TYPES,info:info,source:source,pointFor:pointFor,
    isLand:isLand,prepare:prepare,
    // Priprema za buduće stvarne atlase s 80 jedinstvenih kadrova.
    // Nikad ne predstavljamo dupliciranih 40 kadrova kao 80 novih.
    actualFrames:(id)=>info(id)?.sourceFrames||0
  });
})();