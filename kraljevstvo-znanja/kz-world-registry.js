/* Kraljevstvo znanja — jedinstveni katalog animacija i rasporeda.
 * Originalni WebP atlasi ostaju zasebni binarni resursi (učitaju se samo jednom).
 * Svi primjerci jednog lika koriste isti atlas i pravila animacije.
 * Raspored je deterministički, zemljopisno raspršen, bez gradskih klastera.
 */
(function(){
  "use strict";
  const TYPES=Object.freeze({
    castle:Object.freeze({
      id:"castle",label:"Hodajući dvorac",atlasPath:"./media/hodajuci-dvorac-80.webp?v=1",
      frameWidth:192,frameHeight:192,targetFrames:80,
      sourceFormat:"webp",periodMs:2667,
      mobileLimit:26,desktopLimit:44,minZoom:19,moves:true
    }),
    iron:Object.freeze({
      id:"iron",label:"Sir Željeznik",atlasPath:"./media/sir-zeljezni-80.webp?v=1",
      frameWidth:224,frameHeight:224,targetFrames:80,
      sourceFormat:"webp",periodMs:2667,
      mobileLimit:18,desktopLimit:36,minZoom:19,moves:false
    })

  });
  // Pojednostavljene kopnene siluete. Ovdje je jedino mjesto
  // na kojem se podešava globalni početni raspored.
  // Namjerno bez točaka vezanih uz gradove.
  // JEDNA službena mreža svijeta za teritorije i ilustrirane likove:
  // ekvivalentna sferna projekcija, x/y indeks ćelije veličine 5 × 4 m.
  const R=6371007.181,K=Math.sqrt(3)/2;
  const WORLD=Object.freeze({width:5,height:4});
  const REGION_NAMES=Object.freeze([
    "Balkan","Ostatak Europe","Sjeverna Amerika","Južna Amerika",
    "Afrika","Azija","Australija i Oceanija","Antarktika"
  ]);
  const QUOTAS=Object.freeze([5000,2000,700,700,700,700,700,700]);
  // Jedan početni dvorac za svaki od prvih 201 ID-ova: 100 + 41 + 6 × 10.
  const STARTER_CASTLES=Object.freeze([100,41,10,10,10,10,10,10]);
  // Regionalne granice služe za nasumičan odabir NA KOPNU, ne kao
  // detaljne obalne linije; kartografska mreža blokova ostaje precizna.
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
  const BALKAN=[
    [13.4,45.7],[15.0,46.9],[18.7,46.8],[21.5,46.0],
    [23.5,44.7],[28.7,43.9],[29.0,41.4],[26.0,40.1],
    [25.5,38.4],[23.0,36.2],[20.0,35.1],[18.8,39.0],
    [16.0,40.0],[13.4,42.5]
  ];
  const BOUNDS=[
    [12,30,35,48],[ -13,49,35,72],[-169,-52,8,83],
    [-82,-34,-56,14],[-18,52,-36,38],[26,147,-13,77],
    [110,180,-48,-10],[-180,180,-82,-75]
  ];
  const GAP_KM=[6,22,65,60,60,75,55,65];

  function inside(lon,lat,poly){
    let hit=false;
    for(let i=0,j=poly.length-1;i<poly.length;j=i++){
      const a=poly[i],b=poly[j];
      if((a[1]>lat)!==(b[1]>lat) &&
         lon < (b[0]-a[0])*(lat-a[1])/(b[1]-a[1])+a[0])hit=!hit;
    }
    return hit;
  }
  function isLand(lon,lat){
    if(lat<=-75&&lat>=-82)return true; // južni antarktički kontinentalni sektor
    for(const poly of LAND)if(inside(lon,lat,poly))return true;
    return false;
  }
  function belongs(region,lon,lat){
    if(region===7)return lat>=-82&&lat<=-75;
    if(!isLand(lon,lat))return false;
    if(region===0)return inside(lon,lat,BALKAN)&&inside(lon,lat,LAND[2]);
    if(region===1)return !inside(lon,lat,BALKAN) &&
      (inside(lon,lat,LAND[2])||inside(lon,lat,LAND[11])||inside(lon,lat,LAND[12]));
    if(region===2)return inside(lon,lat,LAND[0])||inside(lon,lat,LAND[7]);
    if(region===3)return inside(lon,lat,LAND[1]);
    if(region===4)return inside(lon,lat,LAND[3])||inside(lon,lat,LAND[8]);
    if(region===5)return inside(lon,lat,LAND[4])||inside(lon,lat,LAND[5])||inside(lon,lat,LAND[10]);
    if(region===6)return inside(lon,lat,LAND[6])||inside(lon,lat,LAND[9]);
    return false;
  }
  function hash(a,b){
    let x=(Math.imul((a|0)+0x9e3779b9,1664525)^Math.imul((b|0)+17,1013904223))|0;
    x=Math.imul(x^(x>>>16),0x7feb352d);
    x=Math.imul(x^(x>>>15),0x846ca68b);
    return ((x^(x>>>16))>>>0)/4294967296;
  }
  function randomStream(seed){
    let state=seed|0;
    return ()=>{
      state^=state<<13;state^=state>>>17;state^=state<<5;
      return (state>>>0)/4294967296;
    };
  }
  // Continuous virtual latitude outside the Mercator tile edge.
  // Existing real-world coordinates retain their original equal-area formula.
  const EDGE_LAT=85.0511287798066, EDGE_RAD=EDGE_LAT*Math.PI/180;
  const EDGE_Y=R/K*Math.sin(EDGE_RAD), Y_PER_DEG=R/K*Math.cos(EDGE_RAD)*Math.PI/180;
  function gridYFromLatitude(lat){
    return Math.abs(lat)<=EDGE_LAT?R/K*Math.sin(lat*Math.PI/180):
      Math.sign(lat)*(EDGE_Y+(Math.abs(lat)-EDGE_LAT)*Y_PER_DEG);
  }
  function latitudeFromGridY(y){
    return Math.abs(y)<=EDGE_Y?Math.asin(y*K/R)*180/Math.PI:
      Math.sign(y)*(EDGE_LAT+(Math.abs(y)-EDGE_Y)/Y_PER_DEG);
  }
  function blockFor(lat,lng){
    const xx=Math.floor(R*K*lng*Math.PI/180);
    const yy=Math.floor(gridYFromLatitude(lat));
    return {x:Math.floor(xx/WORLD.width),y:Math.floor(yy/WORLD.height)};
  }
  function worldGridCorner(x,y){
    const xx=x*WORLD.width,yy=y*WORLD.height;
    return {lat:latitudeFromGridY(yy),lng:xx/(R*K)*180/Math.PI};
  }
  function pointFromBlock(block){
    const xx=block.x*WORLD.width+WORLD.width/2;
    const yy=block.y*WORLD.height+WORLD.height/2;
    return {lat:latitudeFromGridY(yy),lng:xx/(R*K)*180/Math.PI};
  }
  function snap(lat,lng){
    return pointFromBlock(blockFor(lat,lng));
  }
  const ironOffsets=(()=>{const arr=[];let start=2000;
    for(let region=0;region<QUOTAS.length;region++){
      arr.push(start);start+=QUOTAS[region];
    }
    return arr;
  })();
  const castleSlots=[];
  const castleCounts=REGION_NAMES.map(()=>0);
  // Castle IDs 0–200 preserve the original Balkan-heavy footprint.
  for(let id=0;id<=1200;id++){
    let region=0;
    if(id<201){
      let slot=id;
      for(let r=0;r<STARTER_CASTLES.length;r++){
        if(slot<STARTER_CASTLES[r]){region=r;break;}
        slot-=STARTER_CASTLES[r];
      }
    }else{
      const dice=hash(id,63031)*11200;
      let threshold=0;
      for(let r=0;r<QUOTAS.length;r++){
        threshold+=QUOTAS[r];
        if(dice<threshold){region=r;break;}
      }
    }
    castleSlots[id]={region:region,slot:QUOTAS[region]+castleCounts[region]};
    castleCounts[region]++;
  }
  let pools=null;
  function regionPool(region){
    const target=QUOTAS[region]+castleCounts[region];
    const bounds=BOUNDS[region],minKm=GAP_KM[region];
    const rand=randomStream(0x53a5c7e1^(region*0x9e3779b9));
    const west=bounds[0],east=bounds[1],south=bounds[2],north=bounds[3];
    const sinLo=Math.sin(south*Math.PI/180),sinHi=Math.sin(north*Math.PI/180);
    const midLat=(north+south)/2*Math.PI/180;
    const degLat=Math.max(.02,minKm/111.2);
    const degLon=Math.max(.02,minKm/(111.2*Math.max(.12,Math.cos(midLat))));
    const buckets=new Map(),occupied=new Set(),result=[];
    const key=(x,y)=>x+":"+y;
    let trials=0,accepted=0;
    // Poisson-like sampled blocks with a minimum distance and
    // geographically uniform randomized distribution inside each region.
    while(result.length<target&&trials<target*320){
      trials++;
      const lon=west+(east-west)*rand();
      const lat=Math.asin(sinLo+(sinHi-sinLo)*rand())*180/Math.PI;
      if(!belongs(region,lon,lat))continue;
      const block=blockFor(lat,lon),id=key(block.x,block.y);
      if(occupied.has(id))continue;
      const at=pointFromBlock(block);
      const ix=Math.floor((at.lng-west)/degLon),iy=Math.floor((at.lat-south)/degLat);
      let good=true;
      for(let dx=-2;dx<=2&&good;dx++)for(let dy=-2;dy<=2&&good;dy++){
        const neighbors=buckets.get(key(ix+dx,iy+dy))||[];
        for(const prev of neighbors){
          const kmLat=(at.lat-prev.lat)*111.2;
          let delta=Math.abs(at.lng-prev.lng);
          delta=Math.min(delta,360-delta);
          const kmLon=delta*111.2*Math.cos((at.lat+prev.lat)*Math.PI/360);
          if(kmLat*kmLat+kmLon*kmLon<minKm*minKm){good=false;break;}
        }
      }
      if(!good)continue;
      result.push(at);occupied.add(id);accepted++;
      const bucketKey=key(ix,iy);
      if(!buckets.has(bucketKey))buckets.set(bucketKey,[]);
      buckets.get(bucketKey).push(at);
    }
    if(result.length!==target){
      throw Error("KZ: nema dovoljno kvadrata za "+REGION_NAMES[region]+
        ": "+result.length+"/"+target+" pokušaja "+trials);
    }
    return result;
  }
  function extendPool(region,old,second=false){
    const [west,east,south,north]=BOUNDS[region],gap=GAP_KM[region]*(second?.25:.48);
    const rand=randomStream((second?0x3e782a19:0x1d4928c3)^(region*0x9e3779b9));
    const sinLo=Math.sin(south*Math.PI/180),sinHi=Math.sin(north*Math.PI/180);
    const dy=gap/111.2,dx=gap/(111.2*Math.max(.12,Math.cos((north+south)*Math.PI/360)));
    const buckets=new Map(),out=old.slice();
    const bucket=p=>[Math.floor((p.lng-west)/dx),Math.floor((p.lat-south)/dy)];
    const add=p=>{const key=bucket(p).join(":");if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(p);};
    old.forEach(add);
    let tries=0;
    while(out.length<old.length*2&&tries++<old.length*400){
      const lon=west+(east-west)*rand(),lat=Math.asin(sinLo+(sinHi-sinLo)*rand())*180/Math.PI;
      if(!belongs(region,lon,lat))continue;
      const at=snap(lat,lon),[x,y]=bucket(at);
      let ok=true;
      for(let i=-2;i<=2&&ok;i++)for(let j=-2;j<=2&&ok;j++){
        for(const prev of buckets.get((x+i)+":"+(y+j))||[]){
          const a=(at.lat-prev.lat)*111.2,b=Math.min(Math.abs(at.lng-prev.lng),360-Math.abs(at.lng-prev.lng))*111.2*Math.cos((at.lat+prev.lat)*Math.PI/360);
          if(a*a+b*b<gap*gap){ok=false;break;}
        }
      }
      if(ok){out.push(at);add(at);}
    }
    if(out.length!==old.length*2)throw Error("KZ: proširenje regije "+region);
    return out;
  }
  function prepare(){
    if(!pools)pools=REGION_NAMES.map((_,index)=>extendPool(index,extendPool(index,regionPool(index)),true));
    return pools;
  }
  function originalId(id){
    if(id>=49202&&id<=50402)return id-49202;
    if(id>=48001&&id<=49201)return id-48001;
    if(id>=36801&&id<=48000)return id-36801+2000;
    if(id>=25601&&id<=36800)return id-25601+2000;
    if(id>=24400&&id<=25600)return id-24400;
    if(id>=13200&&id<24400)return id-11200;
    return id;
  }
  function cohort(id){
    return id>=49202||(id>=36801&&id<=48000)?3:id>=25601?2:id>=13200?1:0;
  }
  function isIron(id){return (id>=2000&&id<24400)||(id>=25601&&id<=48000);}
  function indexForIron(id){
    for(let r=QUOTAS.length-1;r>=0;r--){
      if(id>=ironOffsets[r])return {region:r,slot:id-ironOffsets[r]};
    }
    return null;
  }
  function regionFor(id){
    id=originalId(id);
    if(id>=2000&&id<13200)return indexForIron(id)?.region??0;
    if(id>=0&&id<=1200)return castleSlots[id].region;
    return null;
  }
  function pointFor(id,generation){
    const prepared=prepare(),g=Math.max(0,Number(generation)||0);
    const original=originalId(id),details=original>=2000?indexForIron(original):castleSlots[original];
    if(!details)throw Error("KZ: nepoznati čuvar "+id);
    const points=prepared[details.region];
    const slot=details.slot+cohort(id)*points.length/4;
    if(g===0)return points[slot];
    // Rezervni zajednički položaj ako stanje s poslužitelja još nije stiglo.
    const extra=1+Math.floor(hash(id,g*7919+101)*(points.length-1));
    return points[(slot+extra)%points.length];
  }
  function quotas(){
    return Object.fromEntries(REGION_NAMES.map((name,i)=>[name,QUOTAS[i]*4]));
  }
  function regionName(id){
    const region=regionFor(id);
    return region===null?"Nepoznato":REGION_NAMES[region];
  }
  function info(id){return TYPES[id]||null;}
  function source(id){
    const type=info(id);
    if(!type)return null;
    return type.atlasPath||null;
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
       (total!==80 && !(id==="castle"&&total===40) &&
        !(id==="iron"&&(total===40||total===9))))return null;
    const result={columns:columns,rows:rows,total:total,
      width:type.frameWidth,height:type.frameHeight};
    layouts.set(img,result);
    return result;
  }
  const reducedMotion=window.matchMedia?.("(prefers-reduced-motion: reduce)");
  function frameAt(id,img,time,instanceId){
    const type=info(id),sheet=layout(id,img);
    if(!type||!sheet)return 0;
    if(reducedMotion?.matches)return 0;
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
    types:TYPES,info:info,source:source,pointFor:pointFor,
    blockFor:blockFor,pointFromBlock:pointFromBlock,worldGridCorner:worldGridCorner,gridYFromLatitude,latitudeFromGridY,
    belongs:belongs,regionFor:regionFor,isIron:isIron,
    regionName:regionName,regionQuotas:quotas,regionNames:REGION_NAMES,
    isLand:isLand,prepare:prepare,layout:layout,frameAt:frameAt,paint:paint,
    actualFrames:(id,img)=>layout(id,img)?.total||0
  });
})();
