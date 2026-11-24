/* Zastavice znanja: shared positions and one-question attempts are server-authoritative. */
(function(){
"use strict";
let map=null,enabled=true,markers=new Map(),serial=0,poll=0,timer=0,button=null,active=null;
const TOTAL=25200, MIN_ZOOM=8, MEDIA="./media/zastavica-1.webm?v=1";
let video=null,videoReady=false,lastPaint=0;
const el=(tag,txt,cls)=>{const n=document.createElement(tag);if(txt!=null)n.textContent=txt;if(cls)n.className=cls;return n;};
const rpc=()=>window.KZFlagRPC;
function makeIcon(){
 const root=el("div",null,"kz-flag-art");
 const fallback=el("span","🚩","kz-flag-fallback");
 const c=el("canvas",null,"kz-flag-canvas");c.width=128;c.height=118;c.hidden=!videoReady;
 fallback.hidden=videoReady;root.append(fallback,c);
 const w=map.getZoom()>=16?72:map.getZoom()>=12?56:40;
 return L.divIcon({className:"kz-flag-marker",html:root,iconSize:[w,w],iconAnchor:[w/2,w*.83]});
}
function initVideo(){
 if(video)return;
 video=document.createElement("video");video.src=MEDIA;video.muted=true;video.loop=true;video.playsInline=true;video.autoplay=true;video.preload="auto";
 video.style.cssText="position:fixed;left:-9999px;top:0;width:1px;height:1px;pointer-events:none";
 video.setAttribute("aria-hidden","true");document.body.append(video);
 video.addEventListener("loadeddata",()=>{videoReady=true;video.play().catch(()=>{});});
 video.addEventListener("error",()=>{videoReady=false;console.warn("KZ zastavica: WebM nije dostupan");});
 function paint(t){
  requestAnimationFrame(paint);
  if(document.hidden||!enabled||!videoReady||video.readyState<2||t-lastPaint<55)return;
  lastPaint=t;
  for(const item of markers.values()){
   const node=item.marker.getElement(),c=node?.querySelector("canvas");
   if(!c)continue;
   if(c.hidden){c.hidden=false;node.querySelector(".kz-flag-fallback").hidden=true;}
   const ctx=c.getContext("2d");ctx.clearRect(0,0,c.width,c.height);ctx.drawImage(video,0,0,c.width,c.height);
  }
 }
 requestAnimationFrame(paint);
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
   const marker=L.marker([f.lat,f.lng],{icon:makeIcon(),pane:"kzFlagPane",keyboard:true,title:"Zastavica znanja · 1 pitanje",bubblingMouseEvents:false}).addTo(map);
   marker.on("click",e=>{L.DomEvent.stopPropagation(e);openFlag(f,marker);});
   x={marker,f,zoom};markers.set(f.id,x);
  }else if(x.zoom!==zoom){x.marker.setIcon(makeIcon());x.zoom=zoom;}
 }
 for(const [id,x] of markers)if(!keep.has(id)){map.removeLayer(x.marker);markers.delete(id);}
 if(video&&markers.size&&video.paused)video.play().catch(()=>{});
 if(video&&!markers.size)video.pause();
}
async function refresh(){
 if(!map)return;
 const request=++serial;
 if(!enabled||map.getZoom()<MIN_ZOOM){removeAll();video?.pause();return;}
 try{const rows=await rpc().map(boundsArgs());if(request===serial&&enabled&&map.getZoom()>=MIN_ZOOM)draw(Array.isArray(rows)?rows:[]);}
 catch(e){console.warn("KZ zastavice",e);}
}
function schedule(){clearTimeout(timer);timer=setTimeout(refresh,160);}
async function openFlag(f,marker){
 if(active)return;
 const box=el("div",null,"kz-flag-popup");box.append(el("strong","🚩 Zastavica znanja"),el("p","Jedno pitanje · 20 blokova (400 m²) za točan odgovor."),el("p","Učitavam pitanje…"));
 const popup=L.popup({maxWidth:330,minWidth:220,autoClose:true,closeOnClick:true}).setLatLng(marker.getLatLng()).setContent(box).openOn(map);
 const token={};active=token;
 let q;
 try{q=await rpc().challenge(f.id,f.generation);}
 catch(e){box.lastChild.textContent=e.message;active=null;schedule();return;}
 if(active!==token)return;
 active=null;
 if(!map.hasLayer(popup))return;
 box.lastChild.remove();
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
    const r=await rpc().answer(q.challenge_id,key);done=true;
    result.textContent=r.correct?"✓ Točno! +20 blokova (400 m²). Zastavica je premještena.":"✗ Netočno. Točan odgovor: "+r.correct_key+") "+(q.options?.[r.correct_key]??"")+". Zastavica je premještena.";
    const item=markers.get(f.id);if(item){map.removeLayer(item.marker);markers.delete(f.id);}
    if(r.reward_m2>0)window.dispatchEvent(new CustomEvent("kz:guardian-reward",{detail:{reward_m2:r.reward_m2}}));
    refresh();
   }catch(e){result.textContent=e.message;done=true;refresh();}
   finally{busy=false;}
  };
  buttons.append(b);
 }
 box.append(buttons,result);
}
function mount(m){
 if(map||!m||!rpc())return;map=m;
 const pane=map.getPane("kzFlagPane")||map.createPane("kzFlagPane");pane.style.zIndex="1500";pane.style.pointerEvents="auto";
 const style=el("style");style.textContent=".kz-flag-art{width:100%;height:100%;display:grid;place-items:center}.kz-flag-canvas{width:100%;height:100%;object-fit:contain}.kz-flag-fallback{font-size:24px}.kz-flag-art [hidden]{display:none!important}.kz-flag-popup{font-size:13px}.kz-flag-question{font-weight:700;font-size:15px}.kz-flag-options{display:grid;gap:5px}.kz-flag-answer{padding:8px;text-align:left;border:1px solid #aaa;border-radius:8px;background:#f4f5f7;color:#152238;cursor:pointer}.kz-flag-answer:disabled{opacity:.65}.kz-flag-result{font-weight:700}";
 document.head.append(style);
 const toggle=document.getElementById("map-life-toggle");enabled=toggle?.getAttribute("aria-pressed")!=="false";toggle?.addEventListener("click",()=>{enabled=toggle.getAttribute("aria-pressed")!=="false";refresh();});
 const actions=document.querySelector(".map-top .map-actions");
 if(actions){button=el("button","🚩 Zastavice (25.200)","minor kz-world-locate");button.type="button";button.id="kz-flag-button";
 button.onclick=async()=>{try{if(!enabled)toggle?.click();const rows=await rpc().map(boundsArgs(true));if(rows?.length)map.flyTo([rows[0].lat,rows[0].lng],Math.max(15,map.getZoom()));}catch(e){console.warn(e);}};
 actions.insertBefore(button,document.getElementById("kz-iron-button")||actions.firstChild);}
 initVideo();map.on("moveend zoomend",schedule);refresh();poll=setInterval(()=>{if(!document.hidden)refresh();},10000);
}
window.KZKnowledgeFlags={count:()=>TOTAL,refresh,mount};
window.addEventListener("kz:map-ready",e=>mount(e.detail?.map));
})();