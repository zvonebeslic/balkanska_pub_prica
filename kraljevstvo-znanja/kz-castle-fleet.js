/* KvizToGo Kraljevstvo znanja — zajednicka flota fantasy dvoraca.
 * 201 pocetni dvorac (ukljucujuci Banju Luku) + po jedan za svako kraljevstvo.
 * Jedan devetkadrovni WebP atlas, koordinatni put od 2 km/h, vidljiv od zooma 12.
 * Zajednicki HP i trenutni respawn ovjereni su u Supabase RPC funkcijama.
 */
(function(){
  "use strict";
  const SPEED_KM_SEC=1/1800, EARTH_KM=6371.0088, RAD=Math.PI/180;
  const FRAME_W=192, FRAME_H=192, FRAMES=40, MIN_ZOOM=12, GAIT_MS=70;
  const MAX_RENDER_MOBILE=26, MAX_RENDER_DESKTOP=44;
  const START_EPOCH=Date.UTC(2026,10,22,17,0,0); // ista pocetna vremenska referenca za sve igrace
  const WAYPOINTS=[[0,0],[200,0],[400,0],[500,0],[525,22],[550,-22],
    [575,22],[600,0],[800,0],[1000,0]];
  const BALKAN=[
    ["Sarajevo",43.8563,18.4131],["Banja Luka",44.7722,17.1910],
    ["Mostar",43.3438,17.8078],["Trebinje",42.7119,18.3436],
    ["Tuzla",44.5384,18.6762],["Zagreb",45.8150,15.9819],
    ["Split",43.5081,16.4402],["Rijeka",45.3271,14.4422],
    ["Osijek",45.5550,18.6955],["Dubrovnik",42.6507,18.0944],
    ["Ljubljana",46.0569,14.5058],["Maribor",46.5547,15.6459],
    ["Beograd",44.7866,20.4489],["Novi Sad",45.2671,19.8335],
    ["Niš",43.3209,21.8958],["Podgorica",42.4304,19.2594],
    ["Kotor",42.4247,18.7712],["Skopje",41.9981,21.4254],
    ["Ohrid",41.1231,20.8016],["Tirana",41.3275,19.8187],
    ["Priština",42.6629,21.1655],["Sofija",42.6977,23.3219],
    ["Plovdiv",42.1354,24.7453],["Solun",40.6401,22.9444],
    ["Atena",37.9838,23.7275]
  ];
  const GROUPS=[
    ["Njemačka",[
      ["Berlin",52.5200,13.4050],["München",48.1372,11.5755],
      ["Hamburg",53.5511,9.9937],["Köln",50.9375,6.9603],
      ["Frankfurt",50.1109,8.6821],["Stuttgart",48.7758,9.1829],
      ["Düsseldorf",51.2277,6.7735],["Leipzig",51.3397,12.3731],
      ["Dresden",51.0504,13.7373],["Nürnberg",49.4521,11.0767]
    ]],
    ["Austrija",[
      ["Beč",48.2082,16.3738],["Salzburg",47.8095,13.0550],
      ["Graz",47.0707,15.4395],["Linz",48.3069,14.2858],
      ["Innsbruck",47.2692,11.4041],["Klagenfurt",46.6247,14.3053],
      ["Bregenz",47.5031,9.7471],["St. Pölten",48.2047,15.6256],
      ["Eisenstadt",47.8457,16.5233],["Villach",46.6111,13.8558]
    ]],
    ["Sjeverna Amerika",[
      ["New York",40.7128,-74.0060],["Los Angeles",34.0522,-118.2437],
      ["Chicago",41.8781,-87.6298],["Miami",25.7617,-80.1918],
      ["Toronto",43.6532,-79.3832],["Vancouver",49.2827,-123.1207],
      ["Ciudad de México",19.4326,-99.1332],["Monterrey",25.6866,-100.3161],
      ["Havana",23.1136,-82.3666],["Anchorage",61.2181,-149.9003]
    ]],
    ["Južna Amerika",[
      ["Buenos Aires",-34.6037,-58.3816],["Santiago",-33.4489,-70.6693],
      ["Lima",-12.0464,-77.0428],["Bogotá",4.7110,-74.0721],
      ["Rio de Janeiro",-22.9068,-43.1729],["São Paulo",-23.5505,-46.6333],
      ["Quito",-0.1807,-78.4678],["Montevideo",-34.9011,-56.1645],
      ["La Paz",-16.4897,-68.1193],["Caracas",10.4806,-66.9036]
    ]],
    ["Azija",[
      ["Tokio",35.6762,139.6503],["Seul",37.5665,126.9780],
      ["Peking",39.9042,116.4074],["Delhi",28.6139,77.2090],
      ["Mumbai",19.0760,72.8777],["Bangkok",13.7563,100.5018],
      ["Jakarta",-6.2088,106.8456],["Singapur",1.3521,103.8198],
      ["Hanoi",21.0285,105.8542],["Manila",14.5995,120.9842]
    ]],
    ["Europa",[
      ["Pariz",48.8566,2.3522],["London",51.5074,-0.1278],
      ["Madrid",40.4168,-3.7038],["Rim",41.9028,12.4964],
      ["Varšava",52.2297,21.0122],["Prag",50.0755,14.4378],
      ["Amsterdam",52.3676,4.9041],["Stockholm",59.3293,18.0686],
      ["Oslo",59.9139,10.7522],["Helsinki",60.1699,24.9384]
    ]],
    ["Afrika",[
      ["Kairo",30.0444,31.2357],["Lagos",6.5244,3.3792],
      ["Nairobi",-1.2921,36.8219],["Cape Town",-33.9249,18.4241],
      ["Johannesburg",-26.2041,28.0473],["Adis Abeba",8.9806,38.7578],
      ["Casablanca",33.5731,-7.5898],["Dakar",14.7167,-17.4677],
      ["Tunis",36.8065,10.1815],["Accra",5.6037,-0.1870]
    ]],
    ["Antarktika",[
      ["McMurdo",-77.8419,166.6863],["Palmer",-64.774,-64.053],
      ["Rothera",-67.568,-68.125],["Casey",-66.283,110.527],
      ["Davis",-68.576,77.968],["Mawson",-67.602,62.875],
      ["Neumayer III",-70.678,-8.274],["Concordia",-75.100,123.350],
      ["Vostok",-78.4667,106.8333],["Halley VI",-75.581,-26.568]
    ]],
    ["Australija",[
      ["Sydney",-33.8688,151.2093],["Melbourne",-37.8136,144.9631],
      ["Brisbane",-27.4698,153.0251],["Perth",-31.9505,115.8605],
      ["Adelaide",-34.9285,138.6007],["Darwin",-12.4634,130.8456],
      ["Hobart",-42.8821,147.3272],["Canberra",-35.2809,149.1300],
      ["Cairns",-16.9186,145.7781],["Alice Springs",-23.6980,133.8807]
    ]],
    ["Arktik",[
      ["Longyearbyen",78.2232,15.6469],["Ny-Ålesund",78.924,11.931],
      ["Tromsø",69.6492,18.9553],["Murmansk",68.9585,33.0827],
      ["Kiruna",67.8558,20.2253],["Resolute",74.6973,-94.8297],
      ["Utqiaġvik",71.2906,-156.7886],["Arctic Bay",73.037,-85.152],
      ["Norilsk",69.3535,88.2027],["Tiksi",71.644,128.879]
    ]]
  ];
  const SEEDS=[{id:0,name:"Banja Luka",region:"Balkan",lat:44.7722,lng:17.1910}];
  let nextId=1;
  function hash(a,b){
    let x=(Math.imul(a+0x9e3779b9,1664525) ^ Math.imul(b+17,1013904223))|0;
    x=Math.imul(x^(x>>>16),0x7feb352d);
    x=Math.imul(x^(x>>>15),0x846ca68b);
    return ((x^(x>>>16))>>>0)/4294967296;
  }
  const norm=n=>(n%360+360)%360;
  function go(p,angle,km){
    const d=km/EARTH_KM,a=p.lat*RAD,l=p.lng*RAD,b=norm(angle)*RAD;
    const y=Math.asin(Math.min(1,Math.max(-1,Math.sin(a)*Math.cos(d)+Math.cos(a)*Math.sin(d)*Math.cos(b))));
    const x=l+Math.atan2(Math.sin(b)*Math.sin(d)*Math.cos(a),Math.cos(d)-Math.sin(a)*Math.sin(y));
    return {lat:y/RAD,lng:((x/RAD+540)%360)-180};
  }
  function dist(a,b){
    const x=(b.lat-a.lat)*RAD,y=(b.lng-a.lng)*RAD;
    const h=Math.sin(x/2)**2+Math.cos(a.lat*RAD)*Math.cos(b.lat*RAD)*Math.sin(y/2)**2;
    return EARTH_KM*2*Math.asin(Math.min(1,Math.sqrt(h)));
  }
  function az(a,b){
    const x=a.lat*RAD,y=b.lat*RAD,z=(b.lng-a.lng)*RAD;
    return norm(Math.atan2(Math.sin(z)*Math.cos(y),
      Math.cos(x)*Math.sin(y)-Math.sin(x)*Math.cos(y)*Math.cos(z))/RAD);
  }
  BALKAN.forEach(function(item,cityIndex){
    for(let k=0;k<4;k++){
      const id=nextId++;
      const p=go({lat:item[1],lng:item[2]},hash(id,21)*360,2+hash(id,31)*14);
      SEEDS.push({id:id,name:item[0],region:"Balkan",lat:p.lat,lng:p.lng});
    }
  });
  GROUPS.forEach(function(group){
    group[1].forEach(function(item){
      SEEDS.push({id:nextId++,name:item[0],region:group[0],lat:item[1],lng:item[2]});
    });
  });
  if(nextId!==201)throw Error("KZ: očekivano je 201 početni dvorac, dobiveno "+nextId);
  const MAX_EXTRA=1000;
  function castle(id){
    if(id>=2000&&id<13200){
      return window.KZIronLegion?.info(id)||{id:id,name:"Sir Željeznik",region:"svijet"};
    }
    if(id<SEEDS.length)return SEEDS[id];
    const seed=SEEDS[id%SEEDS.length];
    const p=go(seed,hash(id,303)*360,3+hash(id,309)*18);
    return {id:id,name:seed.name,region:seed.region,lat:p.lat,lng:p.lng};
  }
  let map=null,sprite=null,pane=null,enabled=true,ready=false,selected=null;
  let gps=null,gpsWatch=null,activeChallenge=null,gpsStatus="GPS nije uključen.";
  let state=new Map(),kingdomCount=0,timeOffset=0,visible=new Map();
  let refreshTimer=0,statusTimer=0,frameTimer=0,fetching=false,button=null,dialog=null;
  let statusError=false,cache=new Map(),baseRouteCache=new Map();
  const total=()=>201+Math.min(MAX_EXTRA,kingdomCount);
  function spawn(c,gen){
    if(!gen)return {lat:c.lat,lng:c.lng};
    return go(c,hash(c.id,gen*33)*360,6+hash(c.id,gen*77)*22);
  }
  function makeRoute(c,gen,cycle){
    const key=c.id+":"+gen+":"+cycle;
    if(cache.has(key))return cache.get(key);
    const server=state.get(c.id);
    const start=Number.isFinite(Number(server?.start_lat)) && server?.start_lat!==null &&
      Number.isFinite(Number(server?.start_lng)) && server?.start_lng!==null
      ? {lat:Number(server.start_lat),lng:Number(server.start_lng)} : spawn(c,gen);
    const initial=server?.route_bearing!==null && Number.isFinite(Number(server?.route_bearing))
      ? Number(server.route_bearing) : hash(c.id+1,gen*479+1)*360;
    // Na polovima uglavnom idi prema ekvatoru kako Web Mercator
    // ne bi sakrio dvorce iza granice prikaza karte (oko ±85°).
    const baseBearing=server?.route_bearing!=null ? initial :
      Math.abs(start.lat)>70
        ? (start.lat>0?180:0)+(hash(c.id,gen+429)-.5)*92
        : initial;
    const b=norm(baseBearing+cycle*7*(c.id%2===0?1:-1));
    const stops=WAYPOINTS.map(function(t){
      const p=go(start,b,t[0]);return t[1]?go(p,b+90,t[1]):p;
    });
    const all=stops.concat(stops.slice(0,-1).reverse());
    const segments=[],kmTotal=all.reduce(function(acc,p,i){
      if(!i)return acc;
      const len=dist(all[i-1],p);
      segments.push({point:all[i-1],heading:az(all[i-1],p),from:acc,km:len});
      return acc+len;
    },0);
    const res={segments:segments,total:kmTotal,bearing:b,start:start};
    if(cache.size>3500)cache.clear();
    cache.set(key,res);return res;
  }
  function calculate(id,now){
    const c=castle(id),s=state.get(id),gen=Number(s?.generation)||0;
    const born=Number(s?.born_at)||START_EPOCH;
    const age=Math.max(0,(now-born)/1000);
    let km=age*SPEED_KM_SEC,cycle=0,route=makeRoute(c,gen,cycle);
    while(km>=route.total && cycle<1000){
      km-=route.total;cycle++;route=makeRoute(c,gen,cycle);
    }
    const sec=route.segments.find(v=>km<=v.from+v.km)||route.segments[route.segments.length-1];
    const used=Math.min(sec.km,Math.max(0,km-sec.from));
    const p=go(sec.point,sec.heading,used);
    return {id:id,point:p,bearing:sec.heading,walk:age*SPEED_KM_SEC*1000,
      generation:gen,hp:Number(s?.hp)||100,region:c.region,name:c.name};
  }
  function realClock(){return Date.now()+timeOffset;}
  function widthFor(pos){
    if(!map)return 65;
    const z=map.getZoom(),phone=map.getSize().x<560;
    if(z<18)return phone?57:76;
    const mpp=156543.033928*Math.cos(pos.lat*RAD)/Math.pow(2,z);
    return Math.max(20,Math.min(260,Math.round(Math.sqrt(80)/Math.max(.01,mpp))));
  }
  function makeIcon(w){
    const h=Math.round(w*FRAME_H/FRAME_W);
    return L.divIcon({className:"kz-fleet-marker",
      html:'<canvas class="kz-fleet-figure" width="192" height="192" aria-hidden="true"></canvas>',
      iconSize:[w,h],iconAnchor:[Math.round(w/2),Math.round(h*.88)]});
  }
  function drawFrame(entry,trip){
    const cv=entry.marker.getElement()?.querySelector("canvas");
    if(!cv)return;
    // Hod je samostalna animacija: 9 kadrova u 2,8 s bez obzira
    // putuje li dvorac 1 km za 30 min ili trenutno stoji.
    const frame=window.matchMedia("(prefers-reduced-motion: reduce)").matches?
      0:Math.floor((Date.now()+trip.id*137)/GAIT_MS)%FRAMES;
    const mirror=Math.sin(trip.bearing*RAD)<-.1;
    if(entry.frame===frame&&entry.mirror===mirror)return;
    const ctx=cv.getContext("2d",{alpha:true});
    if(!ctx)return;
    ctx.clearRect(0,0,FRAME_W,FRAME_H);
    if(mirror){ctx.save();ctx.translate(FRAME_W,0);ctx.scale(-1,1);}
    ctx.drawImage(sprite,frame*FRAME_W,0,FRAME_W,FRAME_H,0,0,FRAME_W,FRAME_H);
    if(mirror)ctx.restore();
    entry.frame=frame;entry.mirror=mirror;
  }
  function setVisible(){
    if(!map||!ready)return;
    const z=map.getZoom();
    if(!enabled||z<MIN_ZOOM){visible.forEach(v=>map.removeLayer(v.marker));visible.clear();return;}
    const now=realClock();
    const bounds=map.getBounds().pad(.22);
    const center=map.getCenter(),matches=[];
    for(let id=0;id<total();id++){
      const v=calculate(id,now);
      if(bounds.contains([v.point.lat,v.point.lng])){
        const dx=dist(center,v.point);
        matches.push({id:id,trip:v,fromCenter:dx});
      }
    }
    matches.sort((a,b)=>a.fromCenter-b.fromCenter);
    const limit=map.getSize().x<560?MAX_RENDER_MOBILE:MAX_RENDER_DESKTOP;
    const keep=new Set();
    matches.slice(0,limit).forEach(function(a){
      keep.add(a.id);
      let item=visible.get(a.id);
      if(!item){
        const w=widthFor(a.trip.point);
        const m=L.marker([a.trip.point.lat,a.trip.point.lng],{
          icon:makeIcon(w),pane:"kzFleetPane",interactive:true,
          keyboard:true,bubblingMouseEvents:false,zIndexOffset:1000,
          alt:"Hodajući dvorac "+(a.id+1)
        }).on("click",function(e){L.DomEvent.stopPropagation(e);openFight(a.id);}).addTo(map);
        item={marker:m,frame:-1,mirror:null,width:w};
        visible.set(a.id,item);
      }
      item.marker.setLatLng([a.trip.point.lat,a.trip.point.lng]);
      const w=widthFor(a.trip.point);
      if(w!==item.width){
        item.marker.setIcon(makeIcon(w));item.width=w;item.frame=-1;item.mirror=null;
      }
      drawFrame(item,a.trip);
    });
    for(const [id,v] of visible){
      if(!keep.has(id)){map.removeLayer(v.marker);visible.delete(id);}
    }
    updateButton();
  }
  function tick(){
    if(!ready||document.hidden||!enabled||map.getZoom()<MIN_ZOOM)return;
    const now=realClock();
    visible.forEach(function(item,id){
      const trip=calculate(id,now);
      // Zemljopisna putanja: osvježi položaj svakih 0,4 s.
      // Animacija: samostalnih 40 kadrova, bez obzira na brzinu putovanja.
      if(!item.lastMoved || now-item.lastMoved>=400){
        item.marker.setLatLng([trip.point.lat,trip.point.lng]);
        item.lastMoved=now;
      }
      drawFrame(item,trip);
    });
  }
  function updateButton(){
    if(!button)return;
    button.textContent="🏰 Dvorci ("+total()+")";
    button.title="Povećaj kartu za susret s hodajućim dvorcima; "+visible.size+" trenutačno prikazano";
  }
  function nearestToCenter(){
    const c=map.getCenter(),now=realClock();
    let pick=null,best=Infinity;
    for(let id=0;id<total();id++){
      const trip=calculate(id,now),distance=dist(c,trip.point);
      if(distance<best){best=distance;pick=trip;}
    }
    return pick;
  }
  function setupButton(){
    const actions=document.querySelector(".map-top .map-actions");
    if(!actions||document.getElementById("kz-fleet-button"))return;
    button=document.createElement("button");
    button.type="button";button.id="kz-fleet-button";
    button.className="minor kz-fleet-button";
    button.addEventListener("click",function(){
      if(!enabled){
        const life=document.getElementById("map-life-toggle");
        life?.click();
      }
      const trip=nearestToCenter();
      if(trip)map.flyTo([trip.point.lat,trip.point.lng],Math.max(MIN_ZOOM,map.getZoom()),{duration:1.2});
    });
    actions.appendChild(button);updateButton();
  }
  async function loadStatus(){
    if(fetching||!window.KZCastleRPC?.status)return;
    fetching=true;
    try{
      const data=await window.KZCastleRPC.status();
      if(!data||!Array.isArray(data.states))throw Error("Neispravan odgovor poslužitelja");
      statusError=false;
      const next=new Map();
      data.states.forEach(function(x){
        if(Number.isInteger(x.id)&&x.id>=0&&x.id<13200)next.set(x.id,x);
      });
      state=next;
      kingdomCount=Math.max(0,Math.floor(Number(data.kingdoms)||0));
      if(Number.isFinite(Number(data.now)))timeOffset=Number(data.now)-Date.now();
      window.dispatchEvent(new CustomEvent("kz:guardian-status",
        {detail:{states:data.states}}));
      setVisible();
      // Ponoć Europe/Sarajevo automatski obnavlja 50 pokušaja
      // čak i ako je igrač ostavio borbu otvorenom.
      if(dialog&&!dialog.hidden&&quotaResetAt>0&&realClock()>=quotaResetAt){
        quotaResetAt=0;quotaLeft=null;activeChallenge=null;
        dialog.querySelector(".kz-fleet-question").replaceChildren();
        quotaMessage();message("Novi dan: obnavljam 50 pokušaja.");
        window.KZCastleRPC?.quota?.().then(q=>{
          if(!dialog||dialog.hidden)return;
          quotaLeft=Math.max(0,Number(q.remaining)||0);
          quotaResetAt=Number(q.resets_at)||0;
          quotaMessage();eligibility();
        }).catch(e=>message(e.message||"Ne mogu obnoviti dnevne pokušaje."));
      }
    }catch(e){
      if(!statusError){console.warn("KZ dvorci – stanje:",e);statusError=true;}
    }finally{fetching=false;}
  }
  function layerState(id,result){
    if(!result||Number(result.castle_id)!==id)return;
    const prev=state.get(id)||{};
    state.set(id,{...prev,id:id, generation:Number(result.generation)||0,
      hp:Number(result.hp)||100,born_at:Number(result.born_at)||realClock(),
      start_lat:result.start_lat??prev.start_lat??null,
      start_lng:result.start_lng??prev.start_lng??null,
      route_bearing:result.route_bearing??prev.route_bearing??null});
    if(result.defeated)cache.clear();
    if(id>=2000&&id<13200){
      window.dispatchEvent(new CustomEvent("kz:guardian-state",
        {detail:{state:{id:id,generation:Number(result.generation)||0,
          hp:Number(result.hp)||100,born_at:Number(result.born_at)||realClock(),
          start_lat:result.start_lat??null,start_lng:result.start_lng??null}}}));
    }
    setVisible();
  }
  // GPS dozvola traži se tek nakon klika igrača.
  // Izvor lokacije je browser Geolocation API; poslužitelj ne vjeruje
  // koordinatama čuvara iz klijenta i ponovno izračunava njihov položaj.
  let quotaLeft=null,busy=false,quotaResetAt=0;
  function monsterPosition(id){
    if(id>=2000&&id<13200)return window.KZIronLegion?.location(id)||null;
    return calculate(id,realClock()).point;
  }
  function currentFix(){
    if(selected===null||!gps||Date.now()-gps.at>25000||
      gps.accuracy>150||gps.accuracy<0)return null;
    const pos=monsterPosition(selected);
    if(!pos||dist(pos,gps)>1)return null;
    return {lat:gps.lat,lng:gps.lng,accuracy:gps.accuracy};
  }
  function eligibility(){
    if(!dialog||dialog.hidden)return;
    const here=monsterPosition(selected);
    const target=here&&gps?Math.round(dist(here,gps)*1000):null;
    const gpsLine=dialog.querySelector(".kz-fleet-gps-status");
    let status=gpsStatus;
    if(gps&&Date.now()-gps.at>25000)status="GPS je zastario. Čekam novo očitanje.";
    else if(gps&&gps.accuracy>150)status="GPS je neprecizan ("+Math.round(gps.accuracy)+" m).";
    else if(gps&&target!==null)
      status=target<=1000
        ?"✅ U krugu si za napad: "+target+" m od čuvara."
        :"🔒 Udaljenost "+target+" m. Priđi na 1 km ili manje.";
    gpsLine.textContent=status;
    const good=!!currentFix();
    const attack=dialog.querySelector(".kz-fleet-attack");
    attack.disabled=!good||busy||quotaLeft===0||!!activeChallenge;
    if(!good&&activeChallenge){
      activeChallenge=null;
      dialog.querySelector(".kz-fleet-question").replaceChildren();
      message("Izašao si iz kruga ili je GPS zastario. Napad je prekinut.");
    }
  }
  function stopGPS(){
    if(gpsWatch!==null && navigator.geolocation)navigator.geolocation.clearWatch(gpsWatch);
    gpsWatch=null;gps=null;gpsStatus="GPS nije uključen.";
  }
  function startGPS(){
    if(!navigator.geolocation){gpsStatus="Uređaj ne podržava GPS.";eligibility();return;}
    if(!window.isSecureContext){gpsStatus="GPS zahtijeva HTTPS.";eligibility();return;}
    if(gpsWatch!==null)return;
    gpsStatus="Tražim preciznu GPS lokaciju…";eligibility();
    gpsWatch=navigator.geolocation.watchPosition(
      position=>{
        gps={lat:position.coords.latitude,lng:position.coords.longitude,
          accuracy:position.coords.accuracy,at:position.timestamp};
        gpsStatus="GPS uključen.";eligibility();
      },
      err=>{
        gps=null;gpsStatus="GPS: "+err.message;
        if(gpsWatch!==null){navigator.geolocation.clearWatch(gpsWatch);gpsWatch=null;}
        eligibility();
      },
      {enableHighAccuracy:true,maximumAge:0,timeout:16000}
    );
  }
  function ensureDialog(){
    if(dialog)return;
    dialog=document.createElement("div");
    dialog.id="kz-fleet-battle";dialog.hidden=true;
    dialog.setAttribute("role","presentation");
    dialog.innerHTML='<div class="kz-fleet-card" role="dialog" aria-modal="true" aria-labelledby="kz-fleet-title">'+
      '<button class="kz-fleet-close" type="button" aria-label="Zatvori">×</button>'+
      '<h2 id="kz-fleet-title">⚔️ Čuvar znanja</h2>'+
      '<p class="kz-fleet-description"></p>'+
      '<div class="kz-fleet-health"><span></span></div>'+
      '<p class="kz-fleet-quota">Dnevni pokušaji: — / 50</p>'+
      '<p class="kz-fleet-gps-status" aria-live="polite">GPS nije uključen.</p>'+
      '<button class="kz-fleet-gps-enable" type="button">📍 Uključi GPS</button>'+
      '<button class="kz-fleet-attack" type="button" disabled>⚔️ Napadni znanjem</button>'+
      '<p class="kz-fleet-message" aria-live="polite"></p>'+
      '<div class="kz-fleet-question"></div>'+
      '</div>';
    document.body.appendChild(dialog);
    dialog.querySelector(".kz-fleet-close").addEventListener("click",closeFight);
    dialog.addEventListener("click",e=>{if(e.target===dialog)closeFight();});
    document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!dialog.hidden)closeFight();});
    dialog.querySelector(".kz-fleet-gps-enable").addEventListener("click",startGPS);
    dialog.querySelector(".kz-fleet-attack").addEventListener("click",()=>challenge(selected));
  }
  function closeFight(){
    if(dialog)dialog.hidden=true;
    selected=null;activeChallenge=null;busy=false;stopGPS();
  }
  function message(t){if(dialog)dialog.querySelector(".kz-fleet-message").textContent=t;}
  function quotaMessage(){
    if(!dialog)return;
    dialog.querySelector(".kz-fleet-quota").textContent=
      "Preostali dnevni pokušaji: "+(quotaLeft===null?"—":quotaLeft)+
      " / 50 · obnova u 00:00 (Sarajevo)";
  }
  function renderHP(id,hp){
    if(!dialog)return;
    const c=castle(id),reward=id>=2000?20:80;
    dialog.querySelector(".kz-fleet-description").textContent=
      c.name+" · "+c.region+" · HP "+hp+"/100 · nagrada "+
      (reward/20)+" kvadrat"+(reward===20?"":"a")+" ("+reward+
      " m²) na konto kraljevstva za završni pogodak.";
    dialog.querySelector(".kz-fleet-health span").style.width=
      Math.max(0,Math.min(100,hp))+"%";
  }
  function openFight(id){
    if(!ready)return;
    ensureDialog();stopGPS();
    selected=id;activeChallenge=null;busy=false;quotaLeft=null;dialog.hidden=false;
    dialog.querySelector("#kz-fleet-title").textContent=id>=2000
      ?"⚔️ Sir Željeznik":"⚔️ Hodajući dvorac";
    dialog.querySelector(".kz-fleet-question").replaceChildren();
    renderHP(id,state.get(id)?.hp??100);
    quotaMessage();
    message("Za napad uključi GPS i priđi na najviše 1 km od čuvara. Pitanja dolaze iz zajedničke baze.");
    eligibility();
    window.KZCastleRPC?.quota?.().then(q=>{
      if(selected!==id)return;
      quotaLeft=Math.max(0,Number(q.remaining)||0);
      quotaResetAt=Number(q.resets_at)||0;
      quotaMessage();eligibility();
    }).catch(err=>{
      if(selected===id)message(err.message||"Ne mogu provjeriti pokušaje.");
    });
  }
  async function challenge(id){
    if(id===null||selected!==id||busy||activeChallenge)return;
    const fix=currentFix();
    if(!fix){eligibility();return;}
    if(quotaLeft===0){message("Potrošeno je 50 dnevnih pokušaja.");return;}
    busy=true;eligibility();message("Učitavam pitanje iz zajedničke baze…");
    try{
      const q=await window.KZCastleRPC.challenge(id,fix);
      if(selected!==id)return;
      if(Number.isFinite(Number(q.remaining))){
        quotaLeft=Number(q.remaining);quotaMessage();
      }
      renderHP(id,Number(q.hp)??100);
      if(!currentFix()){
        message("U međuvremenu si izašao iz GPS kruga. Pitanje je prekinuto.");
        return;
      }
      activeChallenge=q.challenge_id;
      const box=dialog.querySelector(".kz-fleet-question");
      box.replaceChildren();
      const title=document.createElement("p");title.className="kz-fleet-prompt";
      title.textContent=q.prompt||"Pitanje nije dostupno.";box.appendChild(title);
      ["A","B","C"].forEach(choice=>{
        const button=document.createElement("button");button.type="button";
        button.className="kz-fleet-choice";
        button.textContent=choice+") "+String(q.options?.[choice]||"");
        button.addEventListener("click",()=>answer(id,q.challenge_id,choice));
        box.appendChild(button);
      });
      message("Odgovori dok si unutar 1 km. Svaki točan pogodak oduzima 20 HP.");
    }catch(e){if(selected===id)message(e.message||"Ne mogu učitati pitanje.");}
    finally{busy=false;eligibility();}
  }
  async function answer(id,cid,choice){
    if(selected!==id||activeChallenge!==cid||busy)return;
    const fix=currentFix();
    if(!fix){
      eligibility();message("GPS više nije unutar 1 km. Napad je prekinut.");return;
    }
    busy=true;dialog.querySelectorAll(".kz-fleet-choice").forEach(b=>b.disabled=true);
    message("Provjeravam odgovor i GPS…");
    try{
      const res=await window.KZCastleRPC.answer(cid,choice,fix);
      if(selected!==id)return;
      layerState(id,res);activeChallenge=null;
      quotaLeft=Math.max(0,Number(res.remaining)||0);
      quotaMessage();renderHP(id,Number(res.hp)??100);
      dialog.querySelector(".kz-fleet-question").replaceChildren();
      if(res.stale)message("Drugi igrači već su porazili ovu generaciju. Novi čuvar je stigao.");
      else if(res.defeated){
        const amt=Number(res.reward_m2)||0;
        message("🏆 Zadnji točan pogodak! Tvoje kraljevstvo dobiva "+amt+
          " m² na konto. Odmah se pojavio novi čuvar.");
        if(amt>0)window.dispatchEvent(new CustomEvent("kz:guardian-reward",
          {detail:{reward_m2:amt,guardian_id:id}}));
      }else message(res.correct?"✅ Točno! Čuvar je izgubio 20 HP.":"❌ Netočno. Nema oduzimanja HP-a.");
    }catch(e){
      if(selected===id){
        message(e.message||"Odgovor nije prihvaćen.");
        // Dopusti ponovni pokušaj istog pitanja samo ako je GPS opet valjan.
        dialog.querySelectorAll(".kz-fleet-choice").forEach(b=>b.disabled=false);
      }
    }finally{busy=false;eligibility();}
  }
  function mount(m){
    if(map||!m||!window.L||!window.KZ_ROAMING_CASTLE_WEBP)return;
    map=m;
    pane=map.getPane("kzFleetPane")||map.createPane("kzFleetPane");
    pane.classList.add("kz-fleet-pane");
    pane.style.zIndex="1550";
    pane.style.pointerEvents="auto";
    pane.parentNode?.appendChild(pane);
    sprite=new Image();
    sprite.onload=function(){
      if(sprite.naturalWidth!==FRAME_W*FRAMES||sprite.naturalHeight!==FRAME_H){
        console.warn("KZ: format devetkadrovnog atlasa dvorca nije valjan");return;
      }
      ready=true;
      const toggle=document.getElementById("map-life-toggle");
      enabled=!toggle||toggle.getAttribute("aria-pressed")!=="false";
      toggle?.addEventListener("click",function(){
        // Glavni game handler se izvršava prvi; ovo čita završno stanje.
        enabled=toggle.getAttribute("aria-pressed")!=="false";
        setVisible();
      });
      map.on("zoomend moveend",function(){
        clearTimeout(refreshTimer);
        refreshTimer=setTimeout(setVisible,100);
      });
      setupButton();
      loadStatus();
      setVisible();
      frameTimer=setInterval(tick,70);
      statusTimer=setInterval(loadStatus,8000);
      setInterval(setVisible,7000);
    };
    sprite.onerror=()=>console.warn("KZ: nije dostupan rasterizirani atlas dvorca");
    sprite.src=window.KZ_ROAMING_CASTLE_WEBP;
  }
  window.addEventListener("kz:map-ready",e=>mount(e.detail?.map));
  window.addEventListener("kz:kingdoms",e=>{
    kingdomCount=Array.isArray(e.detail?.kingdoms)?e.detail.kingdoms.length:kingdomCount;
    if(ready)setVisible();
  });
  window.KZCastleFleet={
    count:()=>total(),regions:()=>GROUPS.map(g=>g[0]),
    visibleCount:()=>visible.size,
    locate:(id,t)=>calculate(id,t||realClock()),
    openFight:(id)=>{if(Number.isInteger(id)&&id>=2000&&id<13200)openFight(id);},
    refresh:()=>{loadStatus();setVisible();}
  };
})();
