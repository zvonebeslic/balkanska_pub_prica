/* Kraljevstvo znanja — ministarska vozila, deterministicki globalni promet.
 * 375 vozila; brzina 2 km/h; 1000 km van i 1000 km natrag.
 * Svaki novi ciklus zakrece smjer za 5% punoga kruga (18 stupnjeva).
 * Vizualni prikaz je privremen dok 8 stvarnih atlasa ne bude preneseno.
 * Borba mora biti validirana na serveru; klijent ne dodjeljuje HP ni nagrade.
 */
(function(){
"use strict";
const world=window.KZWorldRegistry;
if(!world||!window.L)return;
const COUNTS=[300,50,5,5,5,5,5], REGIONS=[0,1,2,3,4,5,6];
const NAMES=["Balkan","Ostatak Europe","Sjeverna Amerika","Južna Amerika","Afrika","Azija","Australija i Oceanija"];
const BOUNDS=[[12,30,35,48],[-13,49,35,72],[-169,-52,8,83],[-82,-34,-56,14],[-18,52,-36,38],[26,147,-13,77],[110,180,-48,-10]];
const R=6371.0088, DEG=Math.PI/180, START=Date.UTC(2026,10,24,10,0,0);
const SPEED=2, HALF_TRIP=1000, FULL_TRIP=2000, CYCLE_HOURS=FULL_TRIP/SPEED;
const DIRECTIONS=["N","NE","E","SE","S","SW","W","NW"];
function rand(seed){let x=seed|0;return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};}
function bearing(a){return (a%360+360)%360;}
function travel(p,angle,km){
 const d=km/R,lat=p.lat*DEG,lon=p.lng*DEG,b=bearing(angle)*DEG;
 const y=Math.asin(Math.max(-1,Math.min(1,Math.sin(lat)*Math.cos(d)+Math.cos(lat)*Math.sin(d)*Math.cos(b))));
 const x=lon+Math.atan2(Math.sin(b)*Math.sin(d)*Math.cos(lat),Math.cos(d)-Math.sin(lat)*Math.sin(y));
 return {lat:y/DEG,lng:((x/DEG+540)%360)-180};
}
function distance(a,b){const x=(a.lat-b.lat)*DEG,y=(a.lng-b.lng)*DEG;const h=Math.sin(x/2)**2+Math.cos(a.lat*DEG)*Math.cos(b.lat*DEG)*Math.sin(y/2)**2;return 2*R*Math.asin(Math.min(1,Math.sqrt(h)));}
function makeVehicles(){
 const list=[];let id=0;
 for(let r=0;r<COUNTS.length;r++){
  const [w,e,s,n]=BOUNDS[r],random=rand(0x3f829c21^(r*0x47ac593d));
  const sinS=Math.sin(s*DEG),sinN=Math.sin(n*DEG);let tries=0,placed=0;
  while(placed<COUNTS[r]&&tries++<250000){
   const lng=w+(e-w)*random(),lat=Math.asin(sinS+(sinN-sinS)*random())/DEG;
   if(!world.belongs(REGIONS[r],lng,lat))continue;
   if(list.some(v=>v.region===r&&distance(v.start,{lat,lng})<(r===0?8:25)))continue;
   const snapped=world.pointFromBlock(world.blockFor(lat,lng));
   list.push({id:id++,region:r,start:snapped,base:(placed%8)*45,phase:random()*CYCLE_HOURS});
   placed++;
  }
  if(placed!==COUNTS[r])console.warn("Ministarska vozila: nedostaje",NAMES[r],COUNTS[r]-placed);
 }
 return Object.freeze(list);
}
const vehicles=makeVehicles();let map=null,enabled=true,markers=new Map(),timer=0,button=null;
function position(v,now){
 const elapsed=Math.max(0,(now-START)/3600000)+v.phase;
 const cycle=Math.floor(elapsed/CYCLE_HOURS);
 const km=(elapsed%CYCLE_HOURS)*SPEED;
 const heading=bearing(v.base+cycle*18);
 // Povratak prati istu geodetsku dionicu u obrnutom smjeru.
 const out=travel(v.start,heading,Math.min(HALF_TRIP,km));
 const point=km<=HALF_TRIP?out:travel(v.start,heading,FULL_TRIP-km);
 const direction=km<=HALF_TRIP?heading:bearing(heading+180);
 return {point,direction,sector:Math.round(direction/45)%8,cycle};
}
function icon(sector){
 // Osam zasebnih, ne-rotiranih WebP animacija. Bez zrcaljenja i bez SVG-a.
 // Nazivi odgovaraju redoslijedu DIRECTIONS: N, NE, E, SE, S, SW, W, NW.
 const direction=DIRECTIONS[sector],file="./media/ministarska-limuzina-"+direction.toLowerCase()+"-80.webp?v=1";
 const arrows=["↑","↗","→","↘","↓","↙","←","↖"];
 const html='<span class="kz-minister-art" style="display:block;width:100%;height:100%;position:relative">'+
   '<img src="'+file+'" alt="" style="width:100%;height:100%;object-fit:contain" '+
   'onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'block\'">'+
   '<span style="display:none;background:#101b30;border:2px solid #f5ce62;border-radius:12px;padding:3px 5px;color:white;white-space:nowrap;font-size:16px">🚘 '+arrows[sector]+'</span></span>';
 return L.divIcon({className:"kz-minister-marker",html,iconSize:[88,88],iconAnchor:[44,44]});
}
function refresh(){
 if(!map)return;
 const visible=enabled&&map.getZoom()>=6;
 if(!visible){for(const x of markers.values())map.removeLayer(x.marker);markers.clear();return;}
 const bounds=map.getBounds().pad(.25),center=map.getCenter(),now=Date.now();
 const nearby=vehicles.map(v=>({v,p:position(v,now)})).filter(x=>bounds.contains([x.p.point.lat,x.p.point.lng]));
 nearby.sort((a,b)=>distance(a.p.point,center)-distance(b.p.point,center));
 const limit=map.getSize().x<560?24:48,keep=new Set();
 for(const {v,p} of nearby.slice(0,limit)){
  keep.add(v.id);let item=markers.get(v.id);
  if(!item){
   const marker=L.marker([p.point.lat,p.point.lng],{icon:icon(p.sector),keyboard:false,pane:"kzMinisterPane",title:"Službeno vozilo — "+NAMES[v.region]}).addTo(map);
   marker.on("click",()=>{const x=position(v,Date.now());L.popup().setLatLng([x.point.lat,x.point.lng]).setContent("<strong>🚘 Ministarsko vozilo</strong><p>Brzina: 2 km/h · HP: 100 · 10 pitanja, po 10 HP za točan odgovor.</p><p>Napad će biti omogućen nakon povezivanja sa sigurnom poslužiteljskom provjerom.</p>").openOn(map);});
   item={marker,sector:p.sector};markers.set(v.id,item);
  }else{item.marker.setLatLng([p.point.lat,p.point.lng]);if(item.sector!==p.sector){item.marker.setIcon(icon(p.sector));item.sector=p.sector;}}
 }
 for(const [id,item] of markers)if(!keep.has(id)){map.removeLayer(item.marker);markers.delete(id);}
}
function mount(m){
 if(map||!m)return;map=m;
 const pane=map.getPane("kzMinisterPane")||map.createPane("kzMinisterPane");pane.style.zIndex="1295";pane.style.pointerEvents="none";
 const toggle=document.getElementById("map-life-toggle");
 enabled=toggle?.getAttribute("aria-pressed")!=="false";
 toggle?.addEventListener("click",()=>{enabled=toggle.getAttribute("aria-pressed")!=="false";refresh();});
 map.on("moveend zoomend",refresh);
 const actions=document.querySelector(".map-top .map-actions");
 if(actions&&!document.getElementById("kz-minister-button")){
  button=document.createElement("button");button.id="kz-minister-button";button.type="button";button.className="minor kz-world-locate";button.textContent="🚘 Vozila ("+vehicles.length+")";
  button.onclick=()=>{const c=map.getCenter();let best=null,d=Infinity;for(const v of vehicles){const p=position(v,Date.now()).point,km=distance(c,p);if(km<d){d=km;best=p;}}if(best)map.flyTo([best.lat,best.lng],Math.max(12,map.getZoom()));};
  actions.insertBefore(button,document.getElementById("kz-iron-button")||actions.firstChild);
 }
 refresh();timer=setInterval(()=>{if(!document.hidden)refresh();},1000);
}
window.KZMinisterVehicles=Object.freeze({count:vehicles.length,counts:Object.fromEntries(NAMES.map((n,i)=>[n,COUNTS[i]])),vehicles,position,speedKmH:SPEED,legKm:HALF_TRIP,hp:100,questions:10,damagePerCorrect:10,directions:DIRECTIONS,mount});
window.addEventListener("kz:map-ready",e=>mount(e.detail?.map));
})();