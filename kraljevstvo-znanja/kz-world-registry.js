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
  const lifeSprites = {
    dragon: '<svg viewBox="0 0 110 104" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'+
      '<ellipse cx="54" cy="95" rx="32" ry="6" fill="#061723" opacity=".35"/>'+
      '<g class="life-wing life-wing-left"><path d="M53 43Q19 3 5 30L2 52Q19 39 23 62L44 60Z" fill="#24a99b" stroke="#0b4e50" stroke-width="3"/><path d="M50 44L8 32M43 59L22 50" stroke="#a5f9ba" stroke-width="2" fill="none"/></g>'+
      '<g class="life-wing life-wing-right"><path d="M62 40Q92 2 108 26L107 55Q93 39 90 61L66 59Z" fill="#249b92" stroke="#0a4a4b" stroke-width="3"/><path d="M65 44L100 29M67 58L93 47" stroke="#91e6b1" stroke-width="2" fill="none"/></g>'+
      '<path d="M40 68Q13 84 26 94Q8 95 12 82Q14 60 43 56Z" fill="#0e9e75" stroke="#07564b" stroke-width="3"/>'+
      '<ellipse cx="56" cy="64" rx="29" ry="30" fill="#1cbb81" stroke="#065e53" stroke-width="3"/>'+
      '<ellipse cx="60" cy="73" rx="15" ry="18" fill="#b8f0ab"/>'+
      '<path d="M33 43L26 23L45 35L53 20L65 38L83 24L82 46" fill="#e7b75a" stroke="#9e7532" stroke-width="2"/>'+
      '<ellipse cx="57" cy="43" rx="26" ry="22" fill="#2ed79a" stroke="#07534a" stroke-width="3"/>'+
      '<ellipse cx="69" cy="47" rx="18" ry="12" fill="#28c58d"/>'+
      '<circle cx="49" cy="41" r="6" fill="#f2fff1"/><circle cx="51" cy="41" r="3" fill="#102a33"/>'+
      '<circle cx="76" cy="49" r="2.5" fill="#0b6358"/><path d="M80 55q-7 7-15 0" stroke="#084f48" stroke-width="2.5" fill="none"/>'+
      '<path d="M39 86l-10 9 14-2M70 87l5 8 12-3" stroke="#064e49" stroke-width="5" stroke-linecap="round" fill="none"/>'+
      '<g class="life-flame"><path d="M91 52Q111 43 103 61Q111 57 107 71Q89 70 85 62Z" fill="#f7b84c" stroke="#e77e29" stroke-width="2"/><path d="M97 56q12 5 5 13" fill="#ffed9a"/></g>'+
      '</svg>',
    knight: '<svg viewBox="0 0 100 112" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'+
      '<ellipse cx="53" cy="103" rx="30" ry="6" fill="#071323" opacity=".4"/>'+
      '<path class="life-cape" d="M31 47Q7 56 23 97L55 90L72 55Z" fill="#195f94" stroke="#0c335f" stroke-width="3"/>'+
      '<g class="life-leg life-leg-left"><path d="M39 82L35 98L26 102" stroke="#abbccd" stroke-width="11" stroke-linecap="round" fill="none"/><path d="M23 101h18" stroke="#19263e" stroke-width="9" stroke-linecap="round"/></g>'+
      '<g class="life-leg life-leg-right"><path d="M61 83L66 98L79 100" stroke="#aab9c9" stroke-width="11" stroke-linecap="round" fill="none"/><path d="M62 102h21" stroke="#19263e" stroke-width="9" stroke-linecap="round"/></g>'+
      '<rect x="31" y="47" width="40" height="43" rx="13" fill="#b4cbd6" stroke="#345671" stroke-width="3"/>'+
      '<path d="M41 53L61 53L64 86L40 86Z" fill="#5d87a0"/><path d="M51 56v23M43 69h16" stroke="#e9d18d" stroke-width="5"/>'+
      '<g class="life-sword"><path d="M75 46L92 12" stroke="#d7eaff" stroke-width="5"/><path d="M85 33l-15-7" stroke="#e9bd64" stroke-width="5" stroke-linecap="round"/><path d="M75 43l-10 22" stroke="#d8dde4" stroke-width="9" stroke-linecap="round"/></g>'+
      '<path d="M31 51l-12 15" stroke="#c4d4dc" stroke-width="11" stroke-linecap="round"/>'+
      '<path d="M16 55q-14 12 6 29q18-12 10-25Z" fill="#e4c675" stroke="#6b5b3b" stroke-width="3"/>'+
      '<path d="M27 32q-2-24 23-25q26 0 24 25l-3 19H32Z" fill="#c0d1dc" stroke="#3f5e70" stroke-width="3"/>'+
      '<path d="M43 15L48 2L55 16" fill="#e9bd61" stroke="#9f753d" stroke-width="2"/>'+
      '<path d="M31 28L71 28L67 44L35 44Z" fill="#466b7e"/><path d="M40 34h23" stroke="#102e3b" stroke-width="7" stroke-linecap="round"/>'+
      '<circle cx="45" cy="34" r="2" fill="#e3f9ff"/><circle cx="57" cy="34" r="2" fill="#e3f9ff"/>'+
      '</svg>',
    owl: '<svg viewBox="0 0 105 111" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'+
      '<ellipse cx="54" cy="101" rx="27" ry="6" fill="#091c1d" opacity=".36"/>'+
      '<path d="M18 95h71" stroke="#6e4e36" stroke-width="8" stroke-linecap="round"/>'+
      '<path d="M30 39L27 15L46 26L55 15L70 26L86 14L83 44" fill="#a65e36" stroke="#65391e" stroke-width="3"/>'+
      '<ellipse cx="56" cy="61" rx="35" ry="39" fill="#ab6a3f" stroke="#6a4429" stroke-width="3"/>'+
      '<ellipse cx="55" cy="69" rx="25" ry="26" fill="#e5b779"/>'+
      '<g class="life-owl-wing-left"><path d="M27 53Q2 44 16 84Q29 94 34 70Z" fill="#825033" stroke="#663b29" stroke-width="2"/></g>'+
      '<g class="life-owl-wing-right"><path d="M79 53Q102 45 93 83Q81 95 76 70Z" fill="#825033" stroke="#663b29" stroke-width="2"/></g>'+
      '<ellipse cx="43" cy="46" rx="17" ry="19" fill="#fff0cf"/><ellipse cx="68" cy="46" rx="17" ry="19" fill="#fff0cf"/>'+
      '<g class="life-blink"><circle cx="44" cy="48" r="7" fill="#2f483f"/><circle cx="68" cy="48" r="7" fill="#2f483f"/><circle cx="46" cy="45" r="2.5" fill="#fff"/><circle cx="70" cy="45" r="2.5" fill="#fff"/></g>'+
      '<path d="M50 57l6 10l7-10Z" fill="#edba57" stroke="#8b673b" stroke-width="2"/>'+
      '<path d="M43 92v9M68 92v9" stroke="#d1a54d" stroke-width="5"/>'+
      '</svg>',
    wizard: '<svg viewBox="0 0 102 113" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'+
      '<ellipse cx="49" cy="105" rx="30" ry="6" fill="#071420" opacity=".3"/>'+
      '<path d="M27 55Q19 74 14 100L86 100Q71 65 70 55" fill="#745cb7" stroke="#453576" stroke-width="3"/>'+
      '<path d="M48 55v43" stroke="#ead2a0" stroke-width="4"/><path d="M21 94h58" stroke="#b292d7" stroke-width="3"/>'+
      '<path class="life-wizard-arm" d="M67 63L82 50" stroke="#a77acc" stroke-width="13" stroke-linecap="round"/>'+
      '<path d="M84 48L88 6" stroke="#7b5537" stroke-width="5" stroke-linecap="round"/>'+
      '<path class="life-star" d="M88 3l4 9l10 4l-10 4l-4 9l-4-9l-10-4l10-4Z" fill="#fcdf88" stroke="#d6a541" stroke-width="1.5"/>'+
      '<circle cx="49" cy="41" r="24" fill="#f3cfaa" stroke="#9c6851" stroke-width="3"/>'+
      '<path d="M32 47Q27 83 49 85Q69 79 68 46Q61 61 51 55Q39 63 32 47Z" fill="#f3f3f5" stroke="#a8c6df" stroke-width="2"/>'+
      '<circle cx="40" cy="43" r="3" fill="#27313d"/><circle cx="57" cy="43" r="3" fill="#27313d"/>'+
      '<path d="M40 53q9 5 16 0" stroke="#9c6650" stroke-width="2" fill="none"/>'+
      '<path d="M17 36Q38 6 51 -1Q68 3 81 35Z" fill="#553a9c" stroke="#d3b4f5" stroke-width="3"/>'+
      '<ellipse cx="49" cy="34" rx="38" ry="8" fill="#7d5ac9" stroke="#d3b4f5" stroke-width="3"/>'+
      '<circle cx="54" cy="21" r="5" fill="#f5d37b"/>'+
      '</svg>',
    banner: '<svg viewBox="0 0 76 101" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'+
      '<ellipse cx="37" cy="94" rx="24" ry="5" fill="#05111b" opacity=".3"/>'+
      '<path d="M17 91V7" stroke="#d9bc79" stroke-width="6" stroke-linecap="round"/>'+
      '<path class="life-flag" d="M21 12Q43 2 62 15L72 38Q43 33 21 45Z" fill="var(--life-color,#49d99e)" stroke="#f7dea8" stroke-width="3"/>'+
      '<path d="M25 23L34 20L42 23L42 33L34 40L26 34Z" fill="#f6e7b9" stroke="#846638" stroke-width="1.2"/>'+
      '<path d="M34 22v13M28 28h12" stroke="#bb8e40" stroke-width="2"/>'+
      '<path d="M7 93h25" stroke="#d9bc79" stroke-width="6" stroke-linecap="round"/>'+
      '<circle cx="17" cy="5" r="5" fill="#efd78b"/>'+
      '</svg>'
  };


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
  // Jedan renderer za sve vrste: kompatibilan i sa 40 i s 80
  // STVARNIH WebP kadrova, bez dupliciranja i miješanja alfa kanala.
  const layouts=new WeakMap();
  function layout(id,img){
    if(!img)return null;
    const cached=layouts.get(img);
    if(cached)return cached;
    const type=info(id);
    if(!type)return null;
    const columns=img.naturalWidth/type.frameWidth;
    const rows=img.naturalHeight/type.frameHeight;
    const total=columns*rows;
    if(!Number.isInteger(columns)||!Number.isInteger(rows)||
       ![40,80].includes(total) && !(id==="iron"&&total===9))return null;
    const result={columns:columns,rows:rows,total:total,
      width:type.frameWidth,height:type.frameHeight};
    layouts.set(img,result);
    return result;
  }
  function frameAt(id,img,time,instanceId){
    const type=info(id),sheet=layout(id,img);
    if(!type||!sheet)return 0;
    if(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches)return 0;
    const timeOffset=(instanceId||0)*173;
    const phase=((time+timeOffset)%type.periodMs+type.periodMs)%type.periodMs;
    return Math.floor(phase/type.periodMs*sheet.total)%sheet.total;
  }
  function paint(id,img,canvas,frame,flip){
    const sheet=layout(id,img);
    if(!sheet||!canvas)return false;
    const ctx=canvas.getContext("2d",{alpha:true});
    if(!ctx)return false;
    const n=Math.max(0,frame%sheet.total);
    ctx.clearRect(0,0,sheet.width,sheet.height);
    ctx.save();
    if(flip){ctx.translate(sheet.width,0);ctx.scale(-1,1);}
    ctx.drawImage(img,(n%sheet.columns)*sheet.width,
      Math.floor(n/sheet.columns)*sheet.height,
      sheet.width,sheet.height,0,0,sheet.width,sheet.height);
    ctx.restore();
    return true;
  }
  window.KZWorldRegistry=Object.freeze({
    types:TYPES,svgSprites:lifeSprites,info:info,source:source,pointFor:pointFor,
    isLand:isLand,prepare:prepare,layout:layout,frameAt:frameAt,paint:paint,
    actualFrames:(id,img)=>layout(id,img)?.total||info(id)?.sourceFrames||0
  });
})();
