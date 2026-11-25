/* Golf and corner knowledge flags: server-authoritative shared attempts. */
(function(){
"use strict";
let map=null,enabled=true,markers=new Map(),serial=0,poll=0,timer=0,button=null,active=null;
const TOTAL=194568, MIN_ZOOM=19, MEDIA={golf:"./media/zastavica-1.mp4?v=5",corner:"./media/korner-henry-clean.webm?v=1",iwo:"./media/Iwo_Jima_popravljena.webm?v=1",astronaut:"./media/astronaut-nepal.webm?v=1"};
const videos={},ready={};let lastPaint=0,paintStarted=false;
const kindOf=f=>f.kind==="astronaut"?"astronaut":f.kind==="iwo"?"iwo":f.kind==="corner"?"corner":"golf";
const maxQuestions=f=>kindOf(f)==="astronaut"?4:kindOf(f)==="iwo"?3:kindOf(f)==="corner"?2:1;
const el=(tag,txt,cls)=>{const n=document.createElement(tag);if(txt!=null)n.textContent=txt;if(cls)n.className=cls;return n;};
const rpc=()=>window.KZFlagRPC;
function makeIcon(f){
 const lat=f.lat,kind=kindOf(f),videoReady=!!ready[kind];
 const root=el("div",null,"kz-flag-art");
 const fallback=el("span",kind==="astronaut"?"🧑‍🚀":kind==="corner"?"⚽":kind==="iwo"?"🇺🇸":"🚩","kz-flag-fallback");
 const c=el("canvas",null,"kz-flag-canvas");c.width=kind==="astronaut"?420:kind==="corner"?896:416;c.height=kind==="astronaut"?416:kind==="corner"?896:384;c.hidden=!videoReady;
 fallback.hidden=videoReady;root.append(fallback,c);
 const z=map.getZoom(),mpp=156543.033928*Math.max(.05,Math.cos(lat*Math.PI/180))/Math.pow(2,z);
 const baseW=Math.max(z<12?12:z<19?16:1,Math.round(7.5/mpp));
 const w=kind==="astronaut"?Math.max(1,Math.round(baseW*.8)):baseW;
 root.style.fontSize=Math.max(9,w*.72)+'px';
 return L.divIcon({className:"kz-flag-marker",html:root,iconSize:[w,w],iconAnchor:[w/2,w*.83]});
}
// Original golf MP4; key its black background once per decoded frame.
// Both original MP4s use independent key buffers; legacy corner WebM is a fallback.
const golfKey={canvas:null,ctx:null,token:null,peak:null,outside:null,queue:null};
const cornerKey={canvas:null,ctx:null,token:null,peak:null,outside:null,queue:null};
function golfFrame(video,token,kind="golf"){
 const w=video.videoWidth,h=video.videoHeight,n=w*h,k=kind==="corner"?cornerKey:golfKey;
 if(!w||!h)return null;
 if(!k.canvas||k.canvas.width!==w||k.canvas.height!==h){
  k.canvas=document.createElement("canvas");k.canvas.width=w;k.canvas.height=h;
  k.ctx=k.canvas.getContext("2d",{willReadFrequently:true});
  k.peak=new Uint8Array(n);k.outside=new Uint8Array(n);k.queue=new Int32Array(n);k.token=null;
 }
 if(k.token===token)return k.canvas;
 const ctx=k.ctx,p=k.peak,o=k.outside,q=k.queue;
 ctx.clearRect(0,0,w,h);ctx.drawImage(video,0,0,w,h);
 // Mask the fixed PopVid overlay in the top right, in source coordinates.
 ctx.save();ctx.fillStyle="#000";
 if(kind==="corner"){ctx.scale(w/448,h/448);ctx.fillRect(294,0,154,47);}
 else{
  ctx.scale(w/416,h/384);
  ctx.beginPath();ctx.moveTo(278,16);ctx.lineTo(320,2);ctx.lineTo(325,23);ctx.lineTo(298,32);ctx.lineTo(294,38);ctx.lineTo(280,38);ctx.lineTo(277,26);ctx.closePath();ctx.fill();
  ctx.fillRect(323,11,84,20);
 }
 ctx.restore();
 const image=ctx.getImageData(0,0,w,h),d=image.data;
 o.fill(0);
 for(let i=0,j=0;i<n;i++,j+=4)p[i]=Math.max(d[j],d[j+1],d[j+2]);
 let front=0,back=0;
 function visit(i){if(!o[i]&&p[i]<=24){o[i]=1;q[back++]=i;}}
 for(let x=0;x<w;x++){visit(x);visit((h-1)*w+x);}
 for(let y=1;y<h-1;y++){visit(y*w);visit(y*w+w-1);}
 while(front<back){
  const i=q[front++],x=i%w;
  if(x>0)visit(i-1);if(x<w-1)visit(i+1);
  if(i>=w)visit(i-w);if(i<n-w)visit(i+w);
 }
 // Preserve enclosed dark details (e.g. the golf hole); feather only outer edges.
 for(let i=0,j=3;i<n;i++,j+=4){
  if(o[i]){d[j]=0;continue;}
  if(p[i]>=62)continue;
  const x=i%w;
  if((x>0&&o[i-1])||(x<w-1&&o[i+1])||(i>=w&&o[i-w])||(i<n-w&&o[i+w]))
   d[j]=Math.round(255*Math.max(0,(p[i]-24)/38));
 }
 ctx.putImageData(image,0,0);k.token=token;
 return k.canvas;
}
function initVideo(){
 for(const [kind,src] of Object.entries(MEDIA)){
  if(videos[kind]||((kind==="iwo"||kind==="astronaut")&&![...markers.values()].some(x=>kindOf(x.f)===kind)))continue;
  const video=document.createElement("video");videos[kind]=video;
  video.src=src;video.muted=true;video.loop=true;video.playsInline=true;video.autoplay=true;video.preload="auto";
  video.style.cssText="position:fixed;left:-9999px;top:0;width:1px;height:1px;pointer-events:none";
  video.setAttribute("aria-hidden","true");document.body.append(video);
  video.addEventListener("loadeddata",()=>{ready[kind]=true;video.play().catch(()=>{});});
  video.addEventListener("error",()=>{
   ready[kind]=false;
   if(kind==="corner"&&!video.dataset.cornerFallback){
    video.dataset.cornerFallback="1";video.src="./media/korner-henry.webm?v=4";video.load();return;
   }
   console.warn("KZ zastavica: video nije dostupan",kind);
  });
 }
 if(paintStarted)return;paintStarted=true;
 function paint(t){
  requestAnimationFrame(paint);
  if(document.hidden||!enabled)return;
  const paintCorner=t-lastPaint>=55;
  if(paintCorner)lastPaint=t;
  for(const item of markers.values()){
   const kind=kindOf(item.f),video=videos[kind];
   if(!ready[kind]||!video||video.readyState<2||(kind==="corner"&&video.dataset.cornerFallback&&!paintCorner))continue;
   const node=item.marker.getElement(),c=node?.querySelector("canvas");
   if(!c)continue;
   let source=video;
   if(kind==="golf"){
    const frame=String(Math.floor(video.currentTime*24)) + ":" + String(video.getVideoPlaybackQuality?.().totalVideoFrames ?? 0);
    if(!c.hidden&&c.dataset.frameToken===frame)continue;
    source=golfFrame(video,frame,kind);
    if(!source)continue;
    c.dataset.frameToken=frame;
   }
   if(c.hidden){c.hidden=false;node.querySelector(".kz-flag-fallback").hidden=true;}
   const ctx=c.getContext("2d");ctx.clearRect(0,0,c.width,c.height);
   const w=c.width,h=c.height,scale=Math.min(w/video.videoWidth,h/video.videoHeight),vw=video.videoWidth*scale,vh=video.videoHeight*scale;
   ctx.drawImage(source,(w-vw)/2,(h-vh)/2,vw,vh);
  }
 }
 requestAnimationFrame(paint);
}
function syncVideos(){
 const visible=new Set([...markers.values()].map(x=>kindOf(x.f)));
 for(const [kind,v] of Object.entries(videos)){
  if(enabled&&visible.has(kind)){if(v.paused)v.play().catch(()=>{});}
  else v.pause();
 }
}
function removeAll(){for(const x of markers.values())map.removeLayer(x.marker);markers.clear();}
function boundsArgs(all=false){
 const b=map.getBounds().pad(.15),c=map.getCenter();
 return {p_south:all?-85:b.getSouth(),p_north:all?85:b.getNorth(),p_west:all?-180:b.getWest(),p_east:all?180:b.getEast(),p_lat:c.lat,p_lng:c.lng};
}
function draw(rows){
 const keep=new Set(),limit=map.getSize().x<560?48:100,zoom=map.getZoom();
 for(const f of rows.slice(0,limit)){
  keep.add(f.id);let x=markers.get(f.id);
  if(x&&x.f.generation!==f.generation){map.removeLayer(x.marker);markers.delete(f.id);x=null;}
  if(!x){
   const marker=L.marker([f.lat,f.lng],{icon:makeIcon(f),pane:"kzFlagPane",keyboard:true,title:f.kind==="astronaut"?"Astronaut znanja · do 4 pitanja":f.kind==="iwo"?"Iwo Jima · do 3 pitanja":f.kind==="corner"?"Korner znanja · do 2 pitanja":"Golf zastavica · 1 pitanje",bubblingMouseEvents:false}).addTo(map);
   marker.on("click",e=>{L.DomEvent.stopPropagation(e);openFlag(markers.get(f.id)?.f||f,marker);});
   x={marker,f,zoom};markers.set(f.id,x);
  }else{ x.f=f; if(x.zoom!==zoom){x.marker.setIcon(makeIcon(f));x.zoom=zoom;} }
 }
 for(const [id,x] of markers)if(!keep.has(id)){map.removeLayer(x.marker);markers.delete(id);}
 initVideo();syncVideos();
}
async function refresh(){
 if(!map)return;
 const request=++serial;
 if(!enabled||map.getZoom()<MIN_ZOOM){removeAll();syncVideos();return;}
 try{const rows=await rpc().map(boundsArgs());if(request===serial&&enabled&&map.getZoom()>=MIN_ZOOM)draw(Array.isArray(rows)?rows:[]);}
 catch(e){console.warn("KZ zastavice",e);}
}
function schedule(){clearTimeout(timer);if(map.getZoom()<MIN_ZOOM){refresh();return;}timer=setTimeout(refresh,160);}
function gpsFix(f){
 return new Promise((resolve,reject)=>{
  if(!window.isSecureContext||!navigator.geolocation){reject(Error("GPS zahtijeva HTTPS i uređaj s lokacijom."));return;}
  navigator.geolocation.getCurrentPosition(p=>{
   const c=p.coords;
   if(Date.now()-p.timestamp>25000||!Number.isFinite(c.accuracy)||c.accuracy>150||c.accuracy<0){reject(Error("GPS nije dovoljno precizan (do 150 m). Pokušaj ponovno."));return;}
   const km=map.distance([c.latitude,c.longitude],[f.lat,f.lng])/1000;
   if(km>2){reject(Error("Zastavica je udaljena "+km.toFixed(2)+" km. Priđi na najviše 2 km."));return;}
   resolve({lat:c.latitude,lng:c.longitude,accuracy:c.accuracy});
  },e=>reject(Error("GPS: "+e.message)),{enableHighAccuracy:true,maximumAge:0,timeout:16000});
 });
}
const FLAG_NAMES={golf:"Golf zastavica znanja",corner:"Korner znanja · Henry 14",iwo:"Iwo Jima · zastava znanja",astronaut:"Astronaut znanja"};
let flagDialog=null,flagSession=null;
function closeFlag(){
 if(flagDialog)flagDialog.hidden=true;
 flagSession=null;active=null;
}
function ensureFlagDialog(){
 if(flagDialog)return flagDialog;
 flagDialog=el("div");flagDialog.id="kz-flag-battle";flagDialog.hidden=true;
 const card=el("div",null,"kz-fleet-card");card.setAttribute("role","dialog");card.setAttribute("aria-modal","true");card.setAttribute("aria-labelledby","kz-flag-battle-title");
 const close=el("button","×","kz-fleet-close");close.type="button";close.setAttribute("aria-label","Zatvori");close.onclick=closeFlag;
 card.append(close);flagDialog.append(card);document.body.append(flagDialog);
 flagDialog.addEventListener("click",e=>{if(e.target===flagDialog)closeFlag();});
 document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!flagDialog.hidden)closeFlag();});
 return flagDialog;
}
function openFlag(f,marker){
 const dialog=ensureFlagDialog(),card=dialog.querySelector(".kz-fleet-card");
 const close=card.querySelector(".kz-fleet-close");card.replaceChildren(close);
 const session={};flagSession=session;active=null;dialog.hidden=false;
 const isOpen=()=>flagSession===session&&!dialog.hidden;
 const count=maxQuestions(f);
 const title=el("h2",FLAG_NAMES[kindOf(f)]);title.id="kz-flag-battle-title";
 const desc=el("p","Nagrada: 20 m² na konto kraljevstva za svaki točan odgovor.","kz-fleet-description");
 const quota=el("p",null,"kz-fleet-quota");
 const setRemaining=n=>{quota.textContent="Preostalo pitanja: "+Math.max(0,Math.min(count,Number(n??count)||0))+" / "+count;};
 setRemaining(f.remaining??count);
 const gps=el("p","GPS nije uključen.","kz-fleet-gps-status");gps.setAttribute("aria-live","polite");
 const gpsButton=el("button","📍 Uključi GPS","kz-fleet-gps-enable");gpsButton.type="button";
 const play=el("button","Pokreni pitanje","kz-fleet-attack");play.type="button";play.disabled=true;
 const message=el("p","Uključi GPS i priđi na najviše 2 km od zastavice. Pitanja dolaze iz zajedničke baze.","kz-fleet-message");message.setAttribute("aria-live","polite");
 const box=el("div",null,"kz-fleet-question");
 card.append(title,desc,quota,gps,gpsButton,play,message,box);
 let busy=false,gpsReady=false,completed=false,entryFix=null;
 const say=t=>{message.textContent=t;};
 const checkGps=async()=>{
  gps.textContent="Tražim preciznu GPS lokaciju…";
  try{
   const fix=await gpsFix(f);
   if(!isOpen())return null;
   entryFix=fix;gpsReady=true;gps.textContent="✅ GPS potvrđen · "+Math.round(map.distance([fix.lat,fix.lng],[f.lat,f.lng]))+" m od zastavice.";
   return fix;
  }catch(e){if(isOpen()){entryFix=null;gpsReady=false;gps.textContent=e.message;}return null;}
 };
 const update=()=>{gpsButton.hidden=gpsReady;gpsButton.disabled=busy||completed;play.disabled=busy||!gpsReady||completed||box.childElementCount>0;};
 gpsButton.onclick=async()=>{
  if(busy||completed||gpsReady)return;busy=true;update();await checkGps();
  if(!isOpen())return;busy=false;update();if(gpsReady)say("GPS potvrđen. Pokreni pitanje.");
 };
 const load=async()=>{
  if(busy||completed||!isOpen())return;
  busy=true;box.replaceChildren();update();say("Učitavam pitanje iz zajedničke baze…");
  try{
   if(!entryFix){say("Za igranje je potreban GPS unutar 2 km.");return;}
   const q=await rpc().challenge(f.id,f.generation,entryFix);if(!isOpen())return;
   setRemaining(q.remaining??f.remaining??count);
   box.append(el("p",q.prompt||"Pitanje nije dostupno.","kz-fleet-prompt"));
   if(q.image&&/^https?:\/\//i.test(q.image)){
    const img=el("img");img.src=q.image;img.alt="Slika uz pitanje";img.className="kz-flag-battle-image";img.addEventListener("error",()=>img.remove());box.append(img);
   }
   const choices=[];
   for(const key of ["A","B","C"]){
    const b=el("button",key+") "+String(q.options?.[key]??""),"kz-fleet-choice");b.type="button";b.dataset.key=key;choices.push(b);
    b.onclick=async()=>{
     if(busy||completed||!isOpen())return;
     busy=true;choices.forEach(n=>n.disabled=true);update();say("Provjeravam odgovor…");
     try{
      const result=await rpc().answer(q.challenge_id,key,entryFix);
      if(result.reward_m2>0)window.dispatchEvent(new CustomEvent("kz:guardian-reward",{detail:{reward_m2:result.reward_m2}}));
      const item=markers.get(f.id);
      if(result.moved){if(item){map.removeLayer(item.marker);markers.delete(f.id);}}
      else{f={...(item?.f||f),remaining:result.remaining};if(item)item.f=f;}
      refresh();
      if(!isOpen())return;
      setRemaining(result.remaining??0);
      choices.forEach(n=>{if(n.dataset.key===result.correct_key)n.dataset.state="correct";else if(n.dataset.key===key)n.dataset.state="wrong";});
      say((result.correct?"✅ Točno! +20 m².":"❌ Netočno. Točan odgovor: "+result.correct_key+") "+(q.options?.[result.correct_key]??"")+".")+(result.moved?" Zastavica je premještena.":""));
      completed=true;
      const next=el("button",result.moved?"Zatvori":"Sljedeće pitanje","kz-fleet-next");next.type="button";
      next.onclick=()=>{if(result.moved){closeFlag();return;}completed=false;load();};box.append(next);
     }catch(e){if(isOpen()){say(e.message);choices.forEach(n=>n.disabled=false);}refresh();}
     finally{if(isOpen()){busy=false;update();}}
    };
    box.append(b);
   }
   say("Odaberi točan odgovor.");
  }catch(e){if(isOpen())say(e.message);schedule();}
  finally{if(isOpen()){busy=false;update();}}
 };
 play.onclick=load;close.focus();
}
function mount(m){
 if(map||!m||!rpc())return;map=m;
 const pane=map.getPane("kzFlagPane")||map.createPane("kzFlagPane");pane.style.zIndex="1500";pane.style.pointerEvents="auto";
 const style=el("style");style.textContent=".kz-flag-art{width:100%;height:100%;display:grid;place-items:center}.kz-flag-canvas{width:100%;height:100%;object-fit:contain}.kz-flag-fallback{font-size:inherit}.kz-flag-art [hidden]{display:none!important}#kz-flag-battle[hidden],#kz-flag-battle [hidden]{display:none!important}#kz-flag-battle{position:fixed;z-index:220000;inset:0;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(3,9,21,.83);color:#f4f4f7;font-family:system-ui,-apple-system,'Segoe UI',sans-serif}#kz-flag-battle .kz-fleet-choice[data-state=correct]{background:#215c40;border-color:#72d59d;opacity:1}#kz-flag-battle .kz-fleet-choice[data-state=wrong]{background:#76363c;border-color:#e48b8b;opacity:1}.kz-flag-battle-image{display:block;max-width:100%;max-height:170px;object-fit:contain;margin:8px auto;border-radius:8px}";
 document.head.append(style);
 const toggle=document.getElementById("map-life-toggle");enabled=toggle?.getAttribute("aria-pressed")!=="false";toggle?.addEventListener("click",()=>{enabled=toggle.getAttribute("aria-pressed")!=="false";refresh();});
 const actions=document.querySelector(".map-top .map-actions");
 if(actions){button=el("button","🚩 Zastavice","minor kz-world-locate");button.type="button";button.id="kz-flag-button";
 button.onclick=async()=>{try{if(!enabled)toggle?.click();const rows=await rpc().map(boundsArgs(true));if(rows?.length)map.flyTo([rows[0].lat,rows[0].lng],Math.max(MIN_ZOOM,map.getZoom()));}catch(e){console.warn(e);}};
 actions.insertBefore(button,document.getElementById("kz-iron-button")||actions.firstChild);}
 initVideo();map.on("moveend zoomend",schedule);refresh();poll=setInterval(()=>{if(!document.hidden)refresh();},10000);
}
window.KZKnowledgeFlags={count:()=>TOTAL,refresh,mount};
window.addEventListener("kz:map-ready",e=>mount(e.detail?.map));
})();