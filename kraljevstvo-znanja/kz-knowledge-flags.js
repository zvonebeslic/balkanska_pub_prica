/* Golf and corner knowledge flags: server-authoritative shared attempts. */
(function(){
"use strict";
let map=null,enabled=true,markers=new Map(),serial=0,poll=0,timer=0,button=null,active=null;
const TOTAL=68340, MIN_ZOOM=8, MEDIA={golf:"./media/zastavica-1.mp4?v=5",corner:"./media/korner-henry-clean.webm?v=1",iwo:"./media/Iwo_Jima_popravljena.webm?v=1"};
const videos={},ready={};let lastPaint=0,paintStarted=false;
const kindOf=f=>f.kind==="iwo"?"iwo":f.kind==="corner"?"corner":"golf";
const maxQuestions=f=>kindOf(f)==="iwo"?3:kindOf(f)==="corner"?2:1;
const el=(tag,txt,cls)=>{const n=document.createElement(tag);if(txt!=null)n.textContent=txt;if(cls)n.className=cls;return n;};
const rpc=()=>window.KZFlagRPC;
function makeIcon(f){
 const lat=f.lat,kind=kindOf(f),videoReady=!!ready[kind];
 const root=el("div",null,"kz-flag-art");
 const fallback=el("span",kind==="corner"?"⚽":kind==="iwo"?"🇺🇸":"🚩","kz-flag-fallback");
 const c=el("canvas",null,"kz-flag-canvas");c.width=kind==="corner"?896:416;c.height=kind==="corner"?896:384;c.hidden=!videoReady;
 fallback.hidden=videoReady;root.append(fallback,c);
 const z=map.getZoom(),mpp=156543.033928*Math.max(.05,Math.cos(lat*Math.PI/180))/Math.pow(2,z);
 const w=Math.max(z<12?12:z<19?16:1,Math.round(7.5/mpp));
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
  if(videos[kind]||(kind==="iwo"&&![...markers.values()].some(x=>kindOf(x.f)==="iwo")))continue;
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
   const marker=L.marker([f.lat,f.lng],{icon:makeIcon(f),pane:"kzFlagPane",keyboard:true,title:f.kind==="iwo"?"Iwo Jima · do 3 pitanja":f.kind==="corner"?"Korner znanja · do 2 pitanja":"Golf zastavica · 1 pitanje",bubblingMouseEvents:false}).addTo(map);
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
function schedule(){clearTimeout(timer);timer=setTimeout(refresh,160);}
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
async function openFlag(f,marker){
 if(active)return;
 const count=maxQuestions(f),multi=count>1;
 const box=el("div",null,"kz-flag-popup");box.append(el("strong",f.kind==="iwo"?"🇺🇸 Iwo Jima · zastava znanja":f.kind==="corner"?"⚽ Korner znanja · Henry 14":"🚩 Golf zastavica znanja"),el("p",multi?"Preostalo pitanja: "+(f.remaining??count)+" / "+count+" · +20 m² za točan odgovor.":"Jedno pitanje · +20 m² za točan odgovor."),el("p","Provjeravam GPS · najviše 2 km…"));
 const popup=L.popup({maxWidth:330,minWidth:220,autoClose:true,closeOnClick:true}).setLatLng(marker.getLatLng()).setContent(box).openOn(map);
 const token={};active=token;
 let q;
 try{const fix=await gpsFix(f);box.lastChild.textContent='Učitavam pitanje…';q=await rpc().challenge(f.id,f.generation,fix);}
 catch(e){box.lastChild.textContent=e.message;active=null;schedule();return;}
 if(active!==token)return;
 active=null;
 if(!map.hasLayer(popup))return;
 box.lastChild.remove();
 if(multi)box.children[1].textContent="Preostalo pitanja: "+(q.remaining??f.remaining??count)+" / "+count+" · +20 m² za točan odgovor.";
 box.append(el("p",q.prompt,"kz-flag-question"));
 if(q.image&&/^https?:\/\//i.test(q.image)){const img=el("img");img.src=q.image;img.alt="Slika uz pitanje";img.style.maxWidth="100%";box.append(img);}
 const buttons=el("div",null,"kz-flag-options"),result=el("p",null,"kz-flag-result");
 let busy=false,done=false;
 for(const key of ["A","B","C"]){
  const b=el("button",key+") "+String(q.options?.[key]??""),"kz-flag-answer");b.type="button";
  b.onclick=async()=>{
   if(busy||done)return;
   busy=true;for(const n of buttons.children)n.disabled=true;
   try{
    result.textContent='Ponovno provjeravam GPS…';const fix=await gpsFix(f);const r=await rpc().answer(q.challenge_id,key,fix);done=true;
    result.textContent=(r.correct?"✓ Točno! +20 m².":"✗ Netočno. Točan odgovor: "+r.correct_key+") "+(q.options?.[r.correct_key]??"")+".")+(r.moved?" Zastavica je premještena.":" Preostalo pitanja: "+r.remaining+".");
    const item=markers.get(f.id);if(r.moved&&item){map.removeLayer(item.marker);markers.delete(f.id);}else if(item){item.f={...item.f,remaining:r.remaining};const next=el("button","Sljedeće pitanje →","kz-flag-answer");next.type="button";next.onclick=()=>openFlag(item.f,item.marker);box.append(next);}
    if(r.reward_m2>0)window.dispatchEvent(new CustomEvent("kz:guardian-reward",{detail:{reward_m2:r.reward_m2}}));
    refresh();
   }catch(e){result.textContent=e.message;for(const n of buttons.children)n.disabled=false;refresh();}
   finally{busy=false;}
  };
  buttons.append(b);
 }
 box.append(buttons,result);
}
function mount(m){
 if(map||!m||!rpc())return;map=m;
 const pane=map.getPane("kzFlagPane")||map.createPane("kzFlagPane");pane.style.zIndex="1500";pane.style.pointerEvents="auto";
 const style=el("style");style.textContent=".kz-flag-art{width:100%;height:100%;display:grid;place-items:center}.kz-flag-canvas{width:100%;height:100%;object-fit:contain}.kz-flag-fallback{font-size:inherit}.kz-flag-art [hidden]{display:none!important}.kz-flag-popup{font-size:13px}.kz-flag-question{font-weight:700;font-size:15px}.kz-flag-options{display:grid;gap:5px}.kz-flag-answer{padding:8px;text-align:left;border:1px solid #aaa;border-radius:8px;background:#f4f5f7;color:#152238;cursor:pointer}.kz-flag-answer:disabled{opacity:.65}.kz-flag-result{font-weight:700}";
 document.head.append(style);
 const toggle=document.getElementById("map-life-toggle");enabled=toggle?.getAttribute("aria-pressed")!=="false";toggle?.addEventListener("click",()=>{enabled=toggle.getAttribute("aria-pressed")!=="false";refresh();});
 const actions=document.querySelector(".map-top .map-actions");
 if(actions){button=el("button","🚩 Zastavice (68.340)","minor kz-world-locate");button.type="button";button.id="kz-flag-button";
 button.onclick=async()=>{try{if(!enabled)toggle?.click();const rows=await rpc().map(boundsArgs(true));if(rows?.length)map.flyTo([rows[0].lat,rows[0].lng],Math.max(15,map.getZoom()));}catch(e){console.warn(e);}};
 actions.insertBefore(button,document.getElementById("kz-iron-button")||actions.firstChild);}
 initVideo();map.on("moveend zoomend",schedule);refresh();poll=setInterval(()=>{if(!document.hidden)refresh();},10000);
}
window.KZKnowledgeFlags={count:()=>TOTAL,refresh,mount};
window.addEventListener("kz:map-ready",e=>mount(e.detail?.map));
})();