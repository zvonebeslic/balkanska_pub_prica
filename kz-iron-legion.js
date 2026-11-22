/* KvizToGo — Sir Željeznik: stalni (neputujući) animirani čuvari.
 * Balkan 5000, ostatak Europe 2000, 6 drugih kontinenata po 700.
 * UKUPNO 11200, lokalno deterministički raspoređeno uz gradove i postaje.
 * Na karti se stvaraju samo vidljivi čuvari nakon zuma 12.
 * Svi dijele 1 rasterizirani WebP atlas (9 kadrova), bez SVG-a/GLB-a.
 */
(function(){
  "use strict";
  const MIN_ZOOM=12, FRAMES=40,FRAME_MS=105;
  let FW=224,FH=224;
  const EARTH=6371.0088, D2R=Math.PI/180, MAX_MOBILE=18, MAX_DESKTOP=36;
  // Raspored je namjerno vezan uz kopnene gradove i istraživačke postaje.
  // Četvrti podatak je približni polumjer disperzije u kilometrima.
  const REGIONS=[
    {name:"Balkan",count:5000,hubs:[
      ["Sarajevo",43.8563,18.4131,20],["Banja Luka",44.7722,17.1910,22],
      ["Mostar",43.344,17.808,12],["Tuzla",44.538,18.676,21],
      ["Zenica",44.203,17.908,18],["Travnik",44.226,17.665,16],
      ["Bihać",44.817,15.871,20],["Doboj",44.735,18.088,18],
      ["Bijeljina",44.758,19.214,19],["Trebinje",42.712,18.344,12],
      ["Livno",43.827,17.007,21],["Tomislavgrad",43.718,17.227,17],
      ["Zagreb",45.815,15.982,22],["Split",43.508,16.440,7],
      ["Rijeka",45.327,14.442,8],["Osijek",45.555,18.695,25],
      ["Zadar",44.120,15.232,9],["Šibenik",43.736,15.895,8],
      ["Dubrovnik",42.651,18.094,5],["Pula",44.866,13.850,7],
      ["Karlovac",45.492,15.555,22],["Sisak",45.487,16.375,21],
      ["Varaždin",46.305,16.337,20],["Slavonski Brod",45.160,18.012,17],
      ["Ljubljana",46.057,14.506,21],["Maribor",46.555,15.646,18],
      ["Celje",46.231,15.260,17],["Kranj",46.239,14.356,13],
      ["Koper",45.546,13.730,7],["Novo Mesto",45.804,15.169,18],
      ["Beograd",44.787,20.449,25],["Novi Sad",45.267,19.834,24],
      ["Niš",43.321,21.896,24],["Kragujevac",44.012,20.911,22],
      ["Subotica",46.100,19.667,22],["Kraljevo",43.724,20.689,20],
      ["Novi Pazar",43.137,20.514,18],["Užice",43.857,19.842,20],
      ["Valjevo",44.275,19.898,19],["Zrenjanin",45.382,20.390,23],
      ["Podgorica",42.430,19.259,16],["Nikšić",42.773,18.947,17],
      ["Kotor",42.425,18.771,6],["Bar",42.093,19.100,6],
      ["Cetinje",42.392,18.924,13],["Bijelo Polje",43.039,19.747,16],
      ["Skopje",41.998,21.425,22],["Ohrid",41.123,20.802,9],
      ["Bitola",41.030,21.334,18],["Tetovo",42.010,20.971,14],
      ["Strumica",41.437,22.644,18],["Prilep",41.344,21.554,20],
      ["Tirana",41.328,19.819,16],["Durrës",41.324,19.456,6],
      ["Vlorë",40.466,19.491,6],["Korçë",40.618,20.781,17],
      ["Shkodër",42.068,19.512,13],["Berat",40.705,19.952,15],
      ["Priština",42.663,21.166,19],["Prizren",42.214,20.739,15],
      ["Peć",42.660,20.288,15],["Gnjilane",42.463,21.469,16],
      ["Sofija",42.698,23.322,24],["Plovdiv",42.135,24.745,23],
      ["Varna",43.215,27.914,7],["Burgas",42.504,27.463,8],
      ["Veliko Tarnovo",43.076,25.617,20],["Ruse",43.835,25.966,18],
      ["Stara Zagora",42.425,25.635,20],["Pleven",43.417,24.606,21],
      ["Atena",37.984,23.728,18],["Solun",40.640,22.944,16],
      ["Patras",38.246,21.734,9],["Larisa",39.639,22.420,22],
      ["Ioannina",39.665,20.853,15],["Volos",39.361,22.944,10],
      ["Kavala",40.938,24.412,11],["Kozani",40.301,21.788,20]
    ]},
    {name:"Europa",count:2000,hubs:[
      ["London",51.507,-.128,25],["Manchester",53.481,-2.243,24],
      ["Birmingham",52.486,-1.890,24],["Edinburgh",55.953,-3.189,18],
      ["Dublin",53.350,-6.260,21],["Glasgow",55.864,-4.252,21],
      ["Paris",48.857,2.352,25],["Lyon",45.764,4.836,21],
      ["Marseille",43.297,5.370,11],["Bordeaux",44.837,-.579,22],
      ["Lille",50.629,3.057,19],["Toulouse",43.604,1.444,20],
      ["Madrid",40.417,-3.704,25],["Barcelona",41.387,2.170,12],
      ["Valencia",39.469,-.376,12],["Sevilla",37.389,-5.984,22],
      ["Bilbao",43.263,-2.935,12],["Lisboa",38.722,-9.139,10],
      ["Porto",41.158,-8.629,10],["Coimbra",40.204,-8.410,19],
      ["Berlin",52.520,13.405,24],["Hamburg",53.551,9.994,20],
      ["München",48.137,11.576,22],["Frankfurt",50.111,8.682,22],
      ["Köln",50.938,6.960,21],["Leipzig",51.340,12.373,23],
      ["Stuttgart",48.776,9.183,20],["Dresden",51.051,13.738,20],
      ["Wien",48.208,16.373,24],["Graz",47.071,15.439,20],
      ["Salzburg",47.810,13.055,19],["Innsbruck",47.269,11.404,12],
      ["Zürich",47.377,8.542,14],["Genève",46.204,6.144,14],
      ["Amsterdam",52.368,4.904,18],["Rotterdam",51.923,4.480,14],
      ["Bruxelles",50.850,4.352,20],["Antwerpen",51.220,4.402,19],
      ["København",55.676,12.568,10],["Oslo",59.914,10.752,13],
      ["Bergen",60.392,5.323,9],["Stockholm",59.329,18.068,13],
      ["Göteborg",57.708,11.975,12],["Helsinki",60.170,24.938,14],
      ["Tampere",61.498,23.761,18],["Tallinn",59.437,24.754,13],
      ["Rīga",56.950,24.105,18],["Vilnius",54.687,25.280,20],
      ["Warszawa",52.230,21.012,25],["Kraków",50.065,19.945,23],
      ["Gdańsk",54.352,18.646,9],["Wrocław",51.108,17.038,22],
      ["Praha",50.075,14.438,23],["Brno",49.196,16.608,22],
      ["Bratislava",48.149,17.108,21],["Budapest",47.498,19.040,25],
      ["București",44.427,26.103,25],["Cluj",46.771,23.623,20],
      ["Timișoara",45.749,21.208,20],["Iași",47.158,27.588,20],
      ["Chișinău",47.011,28.864,19],["Kyiv",50.450,30.523,23],
      ["Lviv",49.840,24.030,20],["Odesa",46.482,30.723,10],
      ["Minsk",53.900,27.567,20],["Reykjavík",64.147,-21.943,13],
      ["Roma",41.903,12.496,21],["Milano",45.464,9.190,20],
      ["Torino",45.070,7.686,20],["Firenze",43.770,11.255,18],
      ["Napoli",40.851,14.268,9],["Bologna",44.494,11.343,20]
    ]},
    {name:"Sjeverna Amerika",count:700,hubs:[
      ["New York",40.713,-74.006,20],["Boston",42.360,-71.059,17],
      ["Washington",38.907,-77.037,19],["Miami",25.762,-80.192,10],
      ["Atlanta",33.749,-84.388,22],["Chicago",41.878,-87.630,20],
      ["Dallas",32.777,-96.797,25],["Houston",29.761,-95.370,24],
      ["Denver",39.739,-104.990,24],["Phoenix",33.448,-112.074,26],
      ["Los Angeles",34.052,-118.244,17],["San Francisco",37.775,-122.419,9],
      ["Seattle",47.606,-122.333,9],["Minneapolis",44.978,-93.266,23],
      ["Toronto",43.653,-79.383,18],["Ottawa",45.421,-75.697,21],
      ["Montréal",45.502,-73.567,20],["Vancouver",49.283,-123.121,10],
      ["Calgary",51.045,-114.072,22],["Edmonton",53.547,-113.491,22],
      ["Winnipeg",49.896,-97.138,23],["Mexico City",19.433,-99.133,27],
      ["Guadalajara",20.674,-103.345,25],["Monterrey",25.687,-100.316,25],
      ["Puebla",19.042,-98.199,22],["Mérida",20.967,-89.623,22],
      ["Guatemala City",14.635,-90.506,17],["Managua",12.115,-86.236,18],
      ["San José",9.928,-84.091,16],["Panamá",8.983,-79.520,9],
      ["Havana",23.114,-82.367,14],["Santo Domingo",18.486,-69.932,14],
      ["Anchorage",61.218,-149.900,18]
    ]},
    {name:"Južna Amerika",count:700,hubs:[
      ["Bogotá",4.711,-74.072,20],["Medellín",6.245,-75.574,17],
      ["Cali",3.451,-76.532,19],["Cartagena",10.391,-75.479,10],
      ["Caracas",10.481,-66.904,16],["Maracaibo",10.654,-71.637,14],
      ["Quito",-.181,-78.468,19],["Guayaquil",-2.190,-79.888,17],
      ["Lima",-12.046,-77.043,15],["Arequipa",-16.409,-71.538,21],
      ["Cusco",-13.532,-71.968,18],["La Paz",-16.490,-68.119,19],
      ["Santa Cruz",-17.783,-63.182,24],["Santiago",-33.449,-70.669,18],
      ["Valparaíso",-33.045,-71.620,9],["Concepción",-36.828,-73.050,15],
      ["Buenos Aires",-34.604,-58.382,23],["Córdoba",-31.420,-64.189,23],
      ["Rosario",-32.944,-60.651,21],["Mendoza",-32.890,-68.845,24],
      ["Montevideo",-34.901,-56.165,16],["Asunción",-25.264,-57.576,23],
      ["São Paulo",-23.551,-46.634,22],["Rio de Janeiro",-22.907,-43.173,12],
      ["Brasília",-15.793,-47.883,24],["Belo Horizonte",-19.920,-43.938,20],
      ["Salvador",-12.978,-38.501,12],["Recife",-8.048,-34.877,8],
      ["Fortaleza",-3.732,-38.527,11],["Manaus",-3.119,-60.022,19],
      ["Belém",-1.455,-48.503,12],["Porto Alegre",-30.035,-51.230,22],
      ["Georgetown",6.802,-58.155,10],["Paramaribo",5.853,-55.204,10]
    ]},
    {name:"Azija",count:700,hubs:[
      ["Tokyo",35.676,139.650,18],["Osaka",34.693,135.502,16],
      ["Kyoto",35.012,135.768,16],["Sapporo",43.062,141.354,20],
      ["Seoul",37.567,126.978,19],["Busan",35.180,129.075,12],
      ["Beijing",39.904,116.407,25],["Shanghai",31.230,121.474,19],
      ["Shenzhen",22.543,114.057,16],["Guangzhou",23.129,113.264,22],
      ["Chengdu",30.573,104.067,25],["Xi'an",34.342,108.940,25],
      ["Taipei",25.033,121.565,12],["Hong Kong",22.319,114.169,9],
      ["Hanoi",21.029,105.854,17],["Ho Chi Minh City",10.823,106.630,22],
      ["Bangkok",13.756,100.502,21],["Chiang Mai",18.789,98.985,22],
      ["Phnom Penh",11.556,104.928,20],["Vientiane",17.975,102.634,21],
      ["Yangon",16.841,96.173,20],["Kuala Lumpur",3.139,101.687,21],
      ["Singapore",1.352,103.820,6],["Jakarta",-6.209,106.846,18],
      ["Bandung",-6.917,107.619,20],["Surabaya",-7.258,112.752,20],
      ["Manila",14.600,120.984,17],["Davao",7.190,125.455,19],
      ["Delhi",28.614,77.209,25],["Mumbai",19.076,72.878,15],
      ["Bengaluru",12.972,77.595,22],["Kolkata",22.573,88.363,25],
      ["Chennai",13.083,80.271,16],["Dhaka",23.810,90.413,24],
      ["Kathmandu",27.717,85.324,12],["Colombo",6.927,79.861,10],
      ["Karachi",24.861,67.010,19],["Lahore",31.550,74.344,24],
      ["Tashkent",41.312,69.280,23],["Almaty",43.238,76.945,20],
      ["Astana",51.169,71.449,25],["Ulaanbaatar",47.921,106.906,20],
      ["Tehran",35.689,51.389,25],["Baghdad",33.315,44.366,21],
      ["Riyadh",24.713,46.675,25],["Dubai",25.205,55.271,12],
      ["Tel Aviv",32.086,34.782,8],["Amman",31.954,35.929,18]
    ]},
    {name:"Afrika",count:700,hubs:[
      ["Cairo",30.044,31.236,24],["Alexandria",31.201,29.919,10],
      ["Giza",30.013,31.209,17],["Tunis",36.807,10.182,17],
      ["Algiers",36.753,3.059,15],["Oran",35.698,-.633,13],
      ["Casablanca",33.573,-7.590,16],["Rabat",34.021,-6.842,12],
      ["Marrakesh",31.630,-7.981,24],["Tripoli",32.887,13.191,17],
      ["Dakar",14.717,-17.467,10],["Bamako",12.639,-8.003,23],
      ["Ouagadougou",12.371,-1.519,25],["Niamey",13.512,2.113,25],
      ["Accra",5.604,-.187,16],["Abidjan",5.360,-4.008,15],
      ["Lagos",6.524,3.379,20],["Abuja",9.076,7.398,26],
      ["Kano",12.003,8.592,26],["Douala",4.048,9.704,17],
      ["Yaoundé",3.848,11.502,22],["Kinshasa",-4.442,15.266,21],
      ["Lubumbashi",-11.688,27.479,21],["Luanda",-8.839,13.290,12],
      ["Addis Ababa",8.981,38.758,23],["Dire Dawa",9.601,41.867,21],
      ["Nairobi",-1.292,36.821,25],["Mombasa",-4.043,39.668,8],
      ["Kampala",.348,32.583,19],["Kigali",-1.945,30.061,17],
      ["Dar es Salaam",-6.792,39.208,10],["Dodoma",-6.163,35.751,23],
      ["Lusaka",-15.388,28.322,24],["Harare",-17.825,31.049,23],
      ["Maputo",-25.965,32.573,10],["Johannesburg",-26.204,28.048,24],
      ["Pretoria",-25.747,28.188,20],["Cape Town",-33.925,18.424,11],
      ["Durban",-29.858,31.022,10],["Gaborone",-24.628,25.924,23],
      ["Windhoek",-22.561,17.083,24],["Antananarivo",-18.879,47.508,22]
    ]},
    {name:"Antarktika",count:700,hubs:[
      ["McMurdo",-77.842,166.686,20],["Scott Base",-77.849,166.770,19],
      ["Amundsen-Scott",-89.0,0.0,7],["Palmer",-64.774,-64.053,5],
      ["Rothera",-67.568,-68.125,12],["Casey",-66.283,110.527,13],
      ["Davis",-68.576,77.968,13],["Mawson",-67.602,62.875,13],
      ["Neumayer III",-70.678,-8.274,24],["Concordia",-75.100,123.350,24],
      ["Vostok",-78.467,106.833,24],["Halley VI",-75.581,-26.568,22],
      ["Troll",-72.012,2.535,20],["Belgrano II",-77.874,-34.626,20],
      ["Marambio",-64.241,-56.626,8],["Esperanza",-63.397,-56.998,5],
      ["Zhongshan",-69.373,76.374,12],["Syowa",-69.006,39.590,13]
    ]},
    {name:"Australija",count:700,hubs:[
      ["Sydney",-33.869,151.209,19],["Melbourne",-37.814,144.963,23],
      ["Brisbane",-27.470,153.025,19],["Perth",-31.951,115.861,22],
      ["Adelaide",-34.929,138.601,20],["Canberra",-35.281,149.130,24],
      ["Hobart",-42.882,147.327,14],["Darwin",-12.463,130.846,21],
      ["Cairns",-16.919,145.778,11],["Townsville",-19.259,146.817,12],
      ["Gold Coast",-28.017,153.400,9],["Newcastle",-32.929,151.781,11],
      ["Wollongong",-34.425,150.893,8],["Geelong",-38.150,144.361,14],
      ["Ballarat",-37.563,143.856,22],["Bendigo",-36.758,144.280,22],
      ["Launceston",-41.433,147.144,17],["Toowoomba",-27.561,151.953,25],
      ["Mackay",-21.142,149.186,12],["Rockhampton",-23.379,150.511,21],
      ["Bundaberg",-24.868,152.351,20],["Geraldton",-28.773,114.614,13],
      ["Kalgoorlie",-30.749,121.466,27],["Bunbury",-33.328,115.640,11],
      ["Albany",-35.028,117.884,10],["Broome",-17.961,122.235,9],
      ["Port Hedland",-20.312,118.607,13],["Alice Springs",-23.698,133.881,29],
      ["Mount Isa",-20.727,139.492,28],["Katherine",-14.466,132.265,23],
      ["Wagga Wagga",-35.115,147.369,24],["Albury",-36.073,146.914,18]
    ]}
  ];
  const RENDER_TOTAL=REGIONS.reduce((n,g)=>n+g.count,0);
  if(RENDER_TOTAL!==11200)throw Error("Sir Željeznik: expected 11200 guards, got "+RENDER_TOTAL);
  function hash(a,b){
    let x=(Math.imul(a+0x9e3779b9,1664525)^Math.imul(b+19,1013904223))|0;
    x=Math.imul(x^(x>>>16),0x7feb352d);
    x=Math.imul(x^(x>>>15),0x846ca68b);
    return ((x^(x>>>16))>>>0)/4294967296;
  }
  function dest(p,deg,km){
    const d=km/EARTH,a=p.lat*D2R,l=p.lng*D2R,b=deg*D2R;
    const y=Math.asin(Math.max(-1,Math.min(1,Math.sin(a)*Math.cos(d)+Math.cos(a)*Math.sin(d)*Math.cos(b))));
    const x=l+Math.atan2(Math.sin(b)*Math.sin(d)*Math.cos(a),Math.cos(d)-Math.sin(a)*Math.sin(y));
    return {lat:y/D2R,lng:((x/D2R+540)%360)-180};
  }
  // Stable ids 2000..13199. All clients calculate the same 11200 positions.
  const guards=[],byId=new Map(),cells=new Map(),states=new Map();
  function cellKey(p){
    return Math.floor((p.lat+90)*2)+":"+Math.floor((p.lng+180)*2);
  }
  function addToIndex(g){
    const key=cellKey(g.point);
    if(!cells.has(key))cells.set(key,[]);
    cells.get(key).push(g.id);
  }
  let id=2000;
  REGIONS.forEach((group,groupIndex)=>{
    for(let i=0;i<group.count;i++){
      const hub=group.hubs[(i*47+Math.floor(i/11)+groupIndex*5)%group.hubs.length];
      const bearing=hash(id,17)*360;
      const radius=(.3+.7*Math.sqrt(hash(id,29)))*hub[3];
      let p=dest({lat:hub[1],lng:hub[2]},bearing,radius);
      // Web Mercator reaches approximately 85 degrees. Keep polar sprites visible.
      p.lat=Math.max(-84.85,Math.min(84.85,p.lat));
      const guard={id:id,group:group.name,hub:hub[0],point:p};
      guards.push(guard);byId.set(id,guard);addToIndex(guard);id++;
    }
  });
  if(id!==13200)throw Error("Sir Željeznik: inconsistent guardian IDs");
  function posFor(id,gen){
    const base=byId.get(id)?.point;
    if(!base)return null;
    // Poslužitelj određuje novu točku nakon poraza: svi igrači
    // vide istog čuvara na istim koordinatama.
    const server=states.get(id);
    if(server?.start_lat!=null && server?.start_lng!=null &&
       Number.isFinite(Number(server.start_lat)) &&
       Number.isFinite(Number(server.start_lng)))
      return {lat:Number(server.start_lat),lng:Number(server.start_lng)};
    if(!gen)return base;
    const p=dest(base,hash(id,gen*101)*360,.8+hash(id,gen*991)*4);
    p.lat=Math.max(-84.85,Math.min(84.85,p.lat));
    return p;
  }
  let map=null,pane=null,sprite=null,ready=false,visible=new Map(),enabled=true;
  let pendingRefresh=0,clock=0;
  const COUNT_BY_REGION=Object.fromEntries(REGIONS.map(x=>[x.name,x.count]));
  const info=id=>{
    const g=byId.get(id);
    return g?{id:id,name:"Sir Željeznik · "+g.hub,region:g.group,lat:g.point.lat,lng:g.point.lng}:null;
  };
  function iconSize(p){
    const z=map.getZoom(),mobile=map.getSize().x<550;
    if(z<18)return mobile?42:59;
    const mpp=156543.033928*Math.cos(p.lat*D2R)/Math.pow(2,z);
    return Math.max(45,Math.min(205,Math.round(Math.sqrt(80)/Math.max(.001,mpp))));
  }
  function icon(w){
    return L.divIcon({className:"kz-iron-marker",
      html:'<canvas class="kz-iron-canvas" width="'+FW+'" height="'+FH+'" aria-hidden="true"></canvas>',
      iconSize:[w,w],iconAnchor:[w/2,w*.90]});
  }
  function generation(id){return Number(states.get(id)?.generation)||0;}
  function visibleCandidates(){
    if(!map||map.getZoom()<MIN_ZOOM)return [];
    const b=map.getBounds().pad(.18);
    const sw=b.getSouthWest(),ne=b.getNorthEast();
    const south=Math.floor((sw.lat+90)*2),north=Math.floor((ne.lat+90)*2);
    const west=Math.floor((sw.lng+180)*2),east=Math.floor((ne.lng+180)*2);
    const result=[],center=map.getCenter();
    const scan=function(ids){
      for(const id of ids){
        const p=posFor(id,generation(id));
        if(!p||!b.contains([p.lat,p.lng]))continue;
        const dx=(p.lng-center.lng)*Math.cos(center.lat*D2R),dy=p.lat-center.lat;
        result.push({id:id,point:p,d2:dx*dx+dy*dy});
      }
    };
    // A small spatial index avoids scanning every guard on every pan/zoom.
    const seen=new Set();
    for(let a=Math.max(0,south-1);a<=Math.min(359,north+1);a++){
      for(let b=west-1;b<=east+1;b++){
        const norm=(b%720+720)%720;
        const key=a+":"+norm;
        if(seen.has(key))continue;seen.add(key);
        scan(cells.get(key)||[]);
      }
    }
    result.sort((a,b)=>a.d2-b.d2);
    return result;
  }
  function frameDraw(entry,time){
    const node=entry.marker.getElement()?.querySelector("canvas");
    if(!node||!sprite)return;
    const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const n=reduced?0:Math.floor((time+entry.id*173)% (FRAMES*FRAME_MS)/FRAME_MS);
    if(n===entry.frame)return;
    const context=node.getContext("2d",{alpha:true});
    if(!context)return;
    context.clearRect(0,0,FW,FH);
    context.drawImage(sprite,n*FW,0,FW,FH,0,0,FW,FH);
    entry.frame=n;
  }
  function refresh(){
    if(!map||!ready)return;
    const toggle=document.getElementById("map-life-toggle");
    enabled=!toggle||toggle.getAttribute("aria-pressed")!=="false";
    if(!enabled||map.getZoom()<MIN_ZOOM){
      visible.forEach(entry=>map.removeLayer(entry.marker));
      visible.clear();return;
    }
    const cap=map.getSize().x<550?MAX_MOBILE:MAX_DESKTOP;
    const matches=visibleCandidates().slice(0,cap),keep=new Set();
    const now=Date.now();
    matches.forEach(match=>{
      keep.add(match.id);
      const width=iconSize(match.point),gen=generation(match.id);
      let entry=visible.get(match.id);
      if(!entry){
        const marker=L.marker([match.point.lat,match.point.lng],{
          pane:"kzIronPane",icon:icon(width),interactive:true,
          keyboard:true,bubblingMouseEvents:false,
          alt:"Sir Željeznik"
        }).on("click",e=>{
          L.DomEvent.stopPropagation(e);
          window.KZCastleFleet?.openFight(match.id);
        }).addTo(map);
        entry={id:match.id,marker:marker,frame:-1,width:width,generation:gen};
        visible.set(match.id,entry);
      }else if(entry.generation!==gen){
        entry.marker.setLatLng([match.point.lat,match.point.lng]);
        entry.generation=gen;
      }
      if(entry.width!==width){
        entry.marker.setIcon(icon(width));entry.width=width;entry.frame=-1;
      }
      frameDraw(entry,now);
    });
    for(const [id,entry] of visible){
      if(!keep.has(id)){
        map.removeLayer(entry.marker);visible.delete(id);
      }
    }
  }
  function onStatus(list){
    if(!Array.isArray(list))return;
    const next=new Map();
    for(const row of list){
      if(!Number.isInteger(row?.id)||!byId.has(row.id))continue;
      next.set(row.id,row);
    }
    states.clear();
    next.forEach((value,key)=>states.set(key,value));
    refresh();
  }
  function onChange(record){
    if(!record||!byId.has(Number(record.id)))return;
    states.set(Number(record.id),record);
    refresh();
  }
  function mount(m){
    if(map||!m||!window.L||!window.KZ_IRON_ROBOT_ATLAS)return;
    map=m;
    pane=map.getPane("kzIronPane")||map.createPane("kzIronPane");
    pane.classList.add("kz-iron-pane");
    pane.style.zIndex="1600";
    pane.style.pointerEvents="none";
    pane.parentNode?.appendChild(pane);
    const img=new Image();
    img.onload=()=>{
      // Primarni format: četrdeset zasebno renderiranih 192×192 kadrova.
      // Povratna kompatibilnost: iz starog 9-kadrovnog atlasa generira se
      // jednokratno 40 međukadrova. Nakon zamjene izvornog WebP-a koristi
      // se svih 40 originalnih renderiranih kadrova, bez interpoliranja.
      if(img.naturalWidth===192*40&&img.naturalHeight===192){
        FW=192;FH=192;sprite=img;
      }else if(img.naturalWidth===224*9&&img.naturalHeight===224){
        FW=224;FH=224;
        const temp=document.createElement("canvas");
        temp.width=FW*FRAMES;temp.height=FH;
        const ctx=temp.getContext("2d",{alpha:true});
        if(!ctx)return;
        for(let i=0;i<FRAMES;i++){
          const phase=i*9/FRAMES;
          const from=Math.floor(phase),to=(from+1)%9,blend=phase-from;
          ctx.globalAlpha=1-blend;
          ctx.drawImage(img,from*FW,0,FW,FH,i*FW,0,FW,FH);
          if(blend>0){
            ctx.globalAlpha=blend;
            ctx.drawImage(img,to*FW,0,FW,FH,i*FW,0,FW,FH);
          }
        }
        ctx.globalAlpha=1;
        sprite=temp;
      }else{
        console.warn("KZ: robot atlas must contain 40 frames of 192 px or legacy 9 frames of 224 px");return;
      }
      ready=true;
      map.on("moveend zoomend",()=>{
        clearTimeout(pendingRefresh);
        pendingRefresh=setTimeout(refresh,90);
      });
      document.getElementById("map-life-toggle")?.addEventListener("click",refresh);
      refresh();
      clock=setInterval(()=>{
        if(document.hidden||!enabled)return;
        const now=Date.now();
        visible.forEach(entry=>frameDraw(entry,now));
      },FRAME_MS);
    };
    img.onerror=()=>console.warn("KZ: Sir Željeznik sprite atlas not available");
    img.src=window.KZ_IRON_ROBOT_ATLAS;
  }
  window.addEventListener("kz:map-ready",e=>mount(e.detail?.map));
  window.addEventListener("kz:guardian-status",e=>onStatus(e.detail?.states));
  window.addEventListener("kz:guardian-state",e=>onChange(e.detail?.state));
  window.KZIronLegion={
    count:()=>guards.length,
    regions:()=>({...COUNT_BY_REGION}),
    visibleCount:()=>visible.size,
    info:info,
    location:(id)=>posFor(id,generation(id)),
    refresh:refresh
  };
})();