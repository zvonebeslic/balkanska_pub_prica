"use strict";

/* KvizToGo – zaseban lokalni urednik kvizova uživo. Bez promjena baze online pitanja. */
const ROUNDS=[
 {name:"1. KRUG",stated:24,sections:[
  {code:"povezano",name:"POVEZANO (NE)ZNANJE",desc:"Svaki odgovor je povezan s ostalima na neki način / 1 bod za svaki točan odgovor.",count:4,points:1},
  {code:"abc",name:"A, B ili C",desc:"Jednostavna pitalica sa slikama i ponuđenim odgovorima / 1 bod za svaki točan odgovor.",count:4,points:1},
  {code:"kvizoznalac",name:"KVIZOZNALAC",desc:"Pitanje za pitanjem / 1 bod za svaki točan odgovor.",count:6,points:1},
  {code:"kaladont",name:"KA - LA - DONT",desc:"Zadnja dva slova prvog odgovora su prva dva slova idućeg odgovora / 1 bod za svaki točan odgovor.",count:5,points:1},
  {code:"jucer",name:"JUČER, DANAS, SUTRA",desc:"Pitanja o aktualnostima / 1 bod za svaki točan odgovor.",count:3,points:1},
  {code:"pjevaj",name:"PJEVAJ MI PJEVAJ",desc:"Prepoznaj ime izvođača i ime pjesme / 1 bod za svaki točan odgovor (1a i 1b).",count:1,points:2}
 ]},
 {name:"2. KRUG",stated:29,sections:[
  {code:"slovo",name:"SVE NA SLOVO",desc:"Svaki točan odgovor počinje istim slovom / 1 bod za svaki točan odgovor.",count:6,points:1},
  {code:"bodolovac",name:"BODOLOVAC",desc:"Pitanje za pitanjem / 2 boda za svaki točan odgovor.",count:6,points:2},
  {code:"premetaljka",name:"PREMETALJKA",desc:"U premetaljci se krije ime i prezime poznate osobe / 2 boda za točan odgovor.",count:1,points:2},
  {code:"asocijacija",name:"ASOCIJACIJA",desc:"Četiri odgovora daju asocijaciju na konačno rješenje / 1 bod za svaki točan odgovor i 2 boda za konačno rješenje.",count:5,points:1},
  {code:"vjerovali",name:"VJEROVALI ILI NE",desc:"Pitanja s ponuđenim točno ili netočno odgovorima / 0,5 boda za svaki točan odgovor.",count:4,points:.5},
  {code:"stihovi",name:"NE ZABORAVI STIHOVE",desc:"Nadopuni stihove poznate pjesme / 1 bod za točan odgovor.",count:1,points:1}
 ]},
 {name:"3. KRUG",stated:35,sections:[
  {code:"kocka",name:"KOCKA JE BAČENA",desc:"Točno +1; točno i zaokruženo +2; netočno i zaokruženo −1; bez odgovora ili netočno bez zaokruživanja 0.",count:5,points:2},
  {code:"procjena",name:"PITANJE PROCJENE",desc:"Broj procjene mora biti unutar zadanih granica / 2 boda za pogodak unutar procjene.",count:1,points:2},
  {code:"vizualni",name:"VIZUALNI DIO",desc:"Pitanja uz slike ili video / 1 bod za svaki točan odgovor.",count:4,points:1},
  {code:"abecedalica",name:"ABECEDALICA",desc:"Od prvog do zadnjeg pitanja odgovori idu abecednim redom / 1 bod za svaki točan odgovor.",count:5,points:1},
  {code:"gameover",name:"GAME OVER TIME",desc:"Dva pitanja koja se međusobno nadopunjuju: zadnji dio prvog pitanja je prvi dio drugog / 1 bod za svaku točnu kombinaciju.",count:2,points:1},
  {code:"nabroji",name:"NABROJI IH SVE...",desc:"Jedno pitanje s pet mogućih točnih odgovora / 1 bod za svaki točan odgovor.",count:1,points:5},
  {code:"gameset",name:"GAME, SET, MATCH",desc:"Dvije serije po tri pitanja: lako 0,5 boda, srednje 1 bod, teško 2 boda.",count:6,points:2}
 ]}
];
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const uid=()=>typeof crypto!=="undefined"&&crypto.randomUUID?crypto.randomUUID():"ktg-"+Date.now()+"-"+Math.random().toString(36).slice(2);
const DBNAME="kviztogo-live-editor-v1";
const SAMPLE_PARTS=["kviz-uzivo-primjer-1.json","kviz-uzivo-primjer-2.json","kviz-uzivo-primjer-3.json"];
let db,project=null,position={r:0,s:0,i:0},revealed=false,showBoard=false,timerUntil=0;
let channel=null,saveTimer=null,toastTimer=null,stageMode=new URLSearchParams(location.search).get("stage")==="1";
let activeUrls={},mediaSeq={},lastPreviewKey="";
const keyOf=(r,s,i)=>r+"-"+s+"-"+i;
const itemAt=(r,s,i,p=project)=>p?.rounds?.[r]?.sections?.[s]?.items?.[i];
function baseItem(){return {question:"",answer:"",answer2:"",options:["","",""],correct:"A",truth:"Točno",five:["","","","",""],min:"",max:"",note:"",mediaId:"",mediaName:"",mediaType:"",mediaUrl:""};}
function createQuiz(){
 return {id:uid(),title:"Kviz Općeg Znanja",updatedAt:Date.now(),teams:[],
 rounds:ROUNDS.map(r=>({sections:r.sections.map(s=>({items:Array.from({length:s.count},()=>baseItem())}))}))};
}
const positions=()=>ROUNDS.flatMap((r,ri)=>r.sections.flatMap((s,si)=>Array.from({length:s.count},(_,i)=>({r:ri,s:si,i}))));
const pointsFor=(r,s,i)=>{
 const c=ROUNDS[r].sections[s];
 if(c.code==="asocijacija"&&i===4)return 2;
 if(c.code==="gameset")return [.5,1,2,.5,1,2][i];
 return c.points;
};
async function makeExampleQuiz(){
 const parts=await Promise.all(SAMPLE_PARTS.map(async path=>{
  const response=await fetch(path+"?v=1",{cache:"no-store"});
  if(!response.ok)throw Error("Datoteka primjera nije dostupna: "+path+" ("+response.status+")");
  return response.json();
 }));
 const quiz=createQuiz();
 quiz.title="Kviz Općeg Znanja 1";
 quiz.sampleSource="Prvi kviz dostavljen za KvizToGo Kviz uživo";
 for(let r=0;r<ROUNDS.length;r++){
  const sections=parts[r]?.sections;
  if(parts[r]?.round!==r+1||!Array.isArray(sections)||sections.length!==ROUNDS[r].sections.length)throw Error("Primjer nema sve rubrike u "+(r+1)+". krugu.");
  for(let s=0;s<sections.length;s++){
   const items=sections[s],expected=ROUNDS[r].sections[s].count;
   if(!Array.isArray(items)||items.length!==expected)throw Error("Neispravan broj pitanja u rubrici "+ROUNDS[r].sections[s].name);
   quiz.rounds[r].sections[s].items=items.map(item=>({...baseItem(),...item}));
  }
 }
 return quiz;
}
async function installExampleQuiz(){
 if(!stageMode&&project)await persist();
 const quiz=await makeExampleQuiz();
 await persist(quiz);
 project=quiz;position={r:0,s:0,i:0};revealed=false;showBoard=false;timerUntil=0;
 localStorage.setItem("kviztogo_live_id",project.id);
 ensureChannel();await refreshSelect();renderAll();
 $("revealBtn").textContent="Otkrij odgovor";
 $("scoresBtn").textContent="🏆 Prikaži ljestvicu";
 toast("Kviz Općeg Znanja 1 učitan je sa svim pitanjima i odgovorima. Možeš uređivati svoju kopiju.");
}
function openDB(){return new Promise((resolve,reject)=>{
 const req=indexedDB.open(DBNAME,1);
 req.onupgradeneeded=()=>{const x=req.result;if(!x.objectStoreNames.contains("quizzes"))x.createObjectStore("quizzes",{keyPath:"id"});if(!x.objectStoreNames.contains("assets"))x.createObjectStore("assets",{keyPath:"id"});};
 req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
});}
function storeGet(store,id){return new Promise((resolve,reject)=>{const t=db.transaction(store,"readonly");const q=t.objectStore(store).get(id);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);});}
function storeAll(store){return new Promise((resolve,reject)=>{const t=db.transaction(store,"readonly");const q=t.objectStore(store).getAll();q.onsuccess=()=>resolve(q.result||[]);q.onerror=()=>reject(q.error);});}
function storePut(store,value){return new Promise((resolve,reject)=>{const t=db.transaction(store,"readwrite");t.objectStore(store).put(value);t.oncomplete=resolve;t.onerror=()=>reject(t.error||new Error("Spremanje nije uspjelo"));});}
function storeDelete(store,key){return new Promise((resolve,reject)=>{const t=db.transaction(store,"readwrite");t.objectStore(store).delete(key);t.oncomplete=resolve;t.onerror=()=>reject(t.error);});}
function toast(text,bad=false){const el=$("toast");el.textContent=text;el.style.background=bad?"#723242":"#24425e";el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.hidden=true,4200);}
function scheduleSave(){if(stageMode||!project)return;$("saveStatus").textContent="Spremam promjene…";clearTimeout(saveTimer);saveTimer=setTimeout(()=>persist().catch(e=>toast("Greška spremanja: "+e.message,true)),450);}
async function persist(p=project){if(!p)return;p.updatedAt=Date.now();await storePut("quizzes",p);if(!stageMode)$("saveStatus").textContent="✓ Spremljeno na ovom uređaju";}
function scoreAllowed(r,s,i){
 const c=ROUNDS[r].sections[s].code;
 if(c==="kocka")return [-1,0,1,2];
 if(c==="vjerovali")return [0,.5];
 if(c==="gameset"&&i%3===0)return [0,.5];
 if(c==="gameset"&&i%3===1)return [0,1];
 if(c==="gameset"&&i%3===2)return [0,2];
 if(c==="nabroji")return [0,1,2,3,4,5];
 if(c==="pjevaj")return [0,1,2];
 return [0,pointsFor(r,s,i)];
}
function total(team){return Object.values(team.scores||{}).reduce((a,b)=>a+(Number(b)||0),0);}
function sortedTeams(){return [...(project?.teams||[])].sort((a,b)=>total(b)-total(a)||a.name.localeCompare(b.name,"hr"));}
function ensureChannel(){
 if(!("BroadcastChannel" in window)||!project)return;
 if(channel){channel.close();channel=null;}
 channel=new BroadcastChannel("kviztogo-live-"+project.id);
 channel.onmessage=async event=>{
   const m=event.data||{};
   if(stageMode){
     if(m.type==="state"&&m.quiz?.id===project.id){project=m.quiz;position=m.position||position;revealed=!!m.revealed;showBoard=!!m.showBoard;timerUntil=m.timerUntil||0;renderStage();}
   }else if(m.type==="hello")pushStage();
   else if(m.type==="control"&&["previous","next","reveal","board"].includes(m.action))applyPresentationControl(m.action);
 };
 if(stageMode)channel.postMessage({type:"hello"});
}
function pushStage(){if(channel&&!stageMode&&project)channel.postMessage({type:"state",quiz:project,position,revealed,showBoard,timerUntil});}
function roundMax(r){return ROUNDS[r].sections.reduce((sum,s,si)=>sum+Array.from({length:s.count},(_,i)=>pointsFor(r,si,i)).reduce((a,b)=>a+b,0),0);}
function labelItem(r,s,i){
 const code=ROUNDS[r].sections[s].code;
 if(code==="asocijacija"&&i===4)return "Konačno rješenje";
 if(code==="pjevaj")return "1a + 1b";
 if(code==="gameset")return (Math.floor(i/3)+1)+". serija, "+(i%3+1)+".";
 return String(i+1)+".";
}
async function refreshSelect(){
 const all=(await storeAll("quizzes")).sort((a,b)=>b.updatedAt-a.updatedAt);
 const sel=$("quizSelect");sel.replaceChildren(...all.map(q=>new Option(q.title||"Bez naziva",q.id)));
 if(project)sel.value=project.id;
}
function renderNav(){
 const root=$("nav");root.innerHTML=ROUNDS.map((r,ri)=>{
  const sum=roundMax(ri);
  return '<details '+(position.r===ri?'open':'')+'><summary>'+esc(r.name)+' <span class="tiny muted">· '+sum+' bodova</span></summary>'+r.sections.map((s,si)=>{
    return '<div class="rubric"><strong>'+esc((si+1)+". "+s.name)+'</strong><div class="slotlist">'+Array.from({length:s.count},(_,i)=>{
      const item=itemAt(ri,si,i),active=position.r===ri&&position.s===si&&position.i===i;
      return '<button type="button" class="slot'+(active?' active':'')+(item?.question?.trim()?' filled':'')+'" data-r="'+ri+'" data-s="'+si+'" data-i="'+i+'" aria-label="'+esc(s.name+" "+labelItem(ri,si,i))+'">'+esc(labelItem(ri,si,i))+'</button>';
    }).join("")+'</div></div>';
  }).join("")+'</details>';
 }).join("");
}
function field(name,label,value,opts={}){
 const type=opts.type||"input",extra=opts.placeholder?' placeholder="'+esc(opts.placeholder)+'"':"";
 const attr=' data-field="'+esc(name)+'"';
 return '<label>'+esc(label)+(type==="textarea"?'<textarea'+attr+extra+'>'+esc(value)+'</textarea>':'<input'+attr+extra+' value="'+esc(value)+'"'+(opts.inputType?' type="'+esc(opts.inputType)+'"':'')+'>')+'</label>';
}
function renderEditor(){
 const r=position.r,s=position.s,i=position.i,c=ROUNDS[r].sections[s],q=itemAt(r,s,i);
 if(!q)return;
 let answerFields="";
 if(c.code==="abc"){
  answerFields='<div class="choices">'+["A","B","C"].map((letter,k)=>'<label class="choice"><span>'+letter+'</span><input data-option="'+k+'" value="'+esc(q.options?.[k]||"")+'" placeholder="Odgovor '+letter+'"></label>').join("")+'</div>';
  answerFields+='<label>Točan odgovor <select data-field="correct">'+["A","B","C"].map(v=>'<option value="'+v+'"'+(q.correct===v?' selected':'')+'>'+v+'</option>').join("")+'</select></label>';
 }else if(c.code==="vjerovali"){
  answerFields='<label>Točan odgovor <select data-field="truth"><option value="Točno"'+(q.truth==="Točno"?' selected':'')+'>Točno</option><option value="Netočno"'+(q.truth==="Netočno"?' selected':'')+'>Netočno</option></select></label>';
 }else if(c.code==="pjevaj"){
  answerFields=field("answer","1a. Izvođač",q.answer)+field("answer2","1b. Pjesma",q.answer2);
 }else if(c.code==="nabroji"){
  answerFields='<div class="choices">'+Array.from({length:5},(_,k)=>'<label>'+((k+1)+". točan odgovor")+'<input data-five="'+k+'" value="'+esc(q.five?.[k]||"")+'"></label>').join("")+'</div>';
 }else{
  answerFields=field("answer",c.code==="asocijacija"&&i===4?"Konačno rješenje":"Točan odgovor",q.answer);
 }
 if(c.code==="procjena")answerFields+='<div class="rowfields">'+field("min","Donja prihvatljiva granica",q.min,{inputType:"number"})+field("max","Gornja prihvatljiva granica",q.max,{inputType:"number"})+'</div>';
 const titleLabel=c.code==="asocijacija"&&i===4?"Asocijacija za konačno rješenje":"Tekst pitanja";
 const mediaStatus=q.mediaId?'<span class="badge">📎 '+esc(q.mediaName||"Datoteka")+'</span><button type="button" id="removeMedia" class="danger">Ukloni datoteku</button>':"<span class='muted tiny'>Nema učitane datoteke</span>";
 $("questionEdit").innerHTML=
  '<div class="question-meta"><span class="badge">'+esc(ROUNDS[r].name)+'</span><span class="badge">'+(s+1)+'. rubrika</span><span class="badge">'+esc(labelItem(r,s,i))+'</span><span class="badge">do '+pointsFor(r,s,i)+' bodova</span></div>'+
  '<h2>'+esc(c.name)+'</h2><p class="description">'+esc(c.desc)+'</p>'+
  '<div class="fieldset">'+field("question",titleLabel,q.question,{type:"textarea",placeholder:"Ovdje napiši pitanje koje će publika vidjeti…"})+
  answerFields+field("note","Napomena za voditelja (nije vidljiva publici)",q.note,{type:"textarea"})+
  '<label>Dodaj sliku, audio ili video<input id="mediaInput" type="file" accept="image/*,audio/*,video/*"></label>'+
  '<div class="media-status">'+mediaStatus+'</div>'+
  field("mediaUrl","Ili zalijepi javnu poveznicu na sliku, audio ili video",q.mediaUrl,{placeholder:"https://... (podržan i YouTube)"})+
  '</div>';
 $("mediaInput").addEventListener("change",uploadMedia);
 const remove=$("removeMedia");if(remove)remove.addEventListener("click",removeMedia);
}
function createAnswer(r,s,i,q){
 const code=ROUNDS[r].sections[s].code;
 if(code==="abc")return (q.correct||"A")+") "+(q.options?.[["A","B","C"].indexOf(q.correct)]||"");
 if(code==="vjerovali")return q.truth||"Točno";
 if(code==="pjevaj")return "1a. "+(q.answer||"…")+"  |  1b. "+(q.answer2||"…");
 if(code==="nabroji")return (q.five||[]).filter(x=>x?.trim()).join(" · ");
 let a=q.answer||"";
 if(code==="procjena"&&(q.min!==""||q.max!==""))a+=(a?"  ·  ":"")+"Prihvatljivo: "+(q.min||"…")+" – "+(q.max||"…");
 return a;
}
function safeUrl(raw){
 try{const u=new URL(raw);return ["https:","http:"].includes(u.protocol)?u.href:"";}catch{return "";}
}
function youtubeEmbed(raw){
 try{
  const u=new URL(raw);
  if(u.hostname==="youtu.be")return /^[\w-]{11}$/.test(u.pathname.slice(1))?"https://www.youtube-nocookie.com/embed/"+u.pathname.slice(1):"";
  if(["youtube.com","www.youtube.com","m.youtube.com"].includes(u.hostname)){
   let id=u.searchParams.get("v")||u.pathname.split("/").at(-1);
   return /^[\w-]{11}$/.test(id)?"https://www.youtube-nocookie.com/embed/"+id:"";
  }
 }catch{}
 return "";
}
function releaseMedia(kind){if(activeUrls[kind]){URL.revokeObjectURL(activeUrls[kind]);delete activeUrls[kind];}}
async function attachMedia(host,q,kind){
 const seq=(mediaSeq[kind]||0)+1;mediaSeq[kind]=seq;releaseMedia(kind);
 if(!host)return;host.replaceChildren();
 let url="",type="";
 if(q.mediaId){
  const data=await storeGet("assets",q.mediaId).catch(()=>null);
  if(mediaSeq[kind]!==seq||!host.isConnected||!data?.blob)return;
  url=URL.createObjectURL(data.blob);activeUrls[kind]=url;type=data.type||"";
 }else if(q.mediaUrl){
  const embed=youtubeEmbed(q.mediaUrl);
  if(embed){const frame=document.createElement("iframe");frame.src=embed;frame.title="Priloženi video";frame.allow="accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen";frame.allowFullscreen=true;frame.style.cssText="width:min(100%,680px);height:clamp(150px,32vh,350px);border:0;border-radius:9px";host.append(frame);return;}
  url=safeUrl(q.mediaUrl);
  if(!url)return;
  type=/\.(mp3|ogg|wav|m4a)(\?|$)/i.test(url)?"audio/remote":/\.(mp4|webm|mov|m3u8)(\?|$)/i.test(url)?"video/remote":"image/remote";
 }else return;
 const el=document.createElement(type.startsWith("audio/")?"audio":type.startsWith("video/")?"video":"img");
 el.src=url;el.setAttribute("aria-label","Medijski prilog pitanja");
 if(el.tagName==="AUDIO"||el.tagName==="VIDEO"){el.controls=true;el.preload="metadata";}else el.alt="Ilustracija uz pitanje";
 host.append(el);
}
function renderScreen(root,kind){
 if(!root||!project)return;
 const c=ROUNDS[position.r].sections[position.s],q=itemAt(position.r,position.s,position.i);
 if(!q)return;
 if(showBoard){
  releaseMedia(kind);mediaSeq[kind]=(mediaSeq[kind]||0)+1;
  const teams=sortedTeams();
  root.innerHTML='<div class="screen-inner"><div class="screen-head">'+esc(project.title)+'</div><div class="screen-title">🏆 Ljestvica ekipa</div><table class="stage-leaderboard"><tbody>'+teams.map((t,i)=>'<tr><td>'+(i+1)+'. '+esc(t.name)+'</td><td>'+total(t).toLocaleString("hr-HR")+'</td></tr>').join("")+'</tbody></table></div>';
  return;
 }
 const ans=createAnswer(position.r,position.s,position.i,q);
 const title=q.question?.trim()|| (c.code==="asocijacija"&&position.i===4?"Koje je konačno rješenje?":"Ovdje upiši pitanje.");
 const choices=c.code==="abc"?'<div class="screen-choices">'+(q.options||[]).map((a,k)=>'<div class="screen-choice'+(revealed&&q.correct===["A","B","C"][k]?" correct":"")+'">'+["A","B","C"][k]+") "+esc(a||"…")+'</div>').join("")+'</div>':c.code==="vjerovali"?'<div class="screen-choices"><div class="screen-choice'+(revealed&&q.truth==="Točno"?" correct":"")+'">Točno</div><div class="screen-choice'+(revealed&&q.truth==="Netočno"?" correct":"")+'">Netočno</div></div>':"";
 root.innerHTML='<div class="screen-inner"><div class="screen-head">'+esc(ROUNDS[position.r].name+' · '+c.name)+'</div>'+
  '<div class="screen-title '+(title.length>280?'extra-long':title.length>135?'long':'')+'">'+esc(title)+'</div>'+choices+'<div class="screen-media"></div>'+
  (revealed?'<div class="screen-answer">✓ '+esc(ans||"Odgovor još nije upisan.")+'</div>':"")+
  '<div class="screen-foot">'+esc(labelItem(position.r,position.s,position.i))+' · '+pointsFor(position.r,position.s,position.i)+' bodova</div></div>';
 attachMedia(root.querySelector(".screen-media"),q,kind).catch(()=>{});
}
function renderScores(){
 const teams=sortedTeams(),root=$("teamScores"),k=keyOf(position.r,position.s,position.i),allowed=scoreAllowed(position.r,position.s,position.i);
 if(!teams.length){root.innerHTML='<p class="muted tiny">Dodaj ekipu za bodovanje tijekom kviza.</p>';return;}
 root.innerHTML='<table class="scoreboard"><thead><tr><th>Ekipa</th><th>Ovo pitanje</th><th>Ukupno</th><th></th></tr></thead><tbody>'+
 teams.map(t=>'<tr><td>'+esc(t.name)+'</td><td><select data-team="'+esc(t.id)+'">'+allowed.map(v=>'<option value="'+v+'"'+(Number(t.scores?.[k]||0)===v?' selected':'')+'>'+v.toLocaleString("hr-HR")+'</option>').join("")+'</select></td><td>'+total(t).toLocaleString("hr-HR")+'</td><td><button type="button" class="danger" data-remove-team="'+esc(t.id)+'" aria-label="Ukloni ekipu '+esc(t.name)+'">×</button></td></tr>').join("")+'</tbody></table>';
}
function renderAll(){
 if(!project)return;
 if(!stageMode){
  $("quizTitle").value=project.title||"";
  renderNav();renderEditor();renderScores();renderScreen($("previewPane"),"preview");
 }else renderStage();
 pushStage();
}
function renderStage(){
 renderScreen($("stageCanvas"),"stage");refreshClocks();
 const arr=positions(),idx=arr.findIndex(v=>v.r===position.r&&v.s===position.s&&v.i===position.i);
 $("stagePrev").disabled=idx<=0;
 $("stageNext").disabled=idx>=arr.length-1;
 $("stageReveal").textContent=revealed?"Sakrij odgovor":"✓ Otkrij odgovor";
 $("stageBoard").textContent=showBoard?"Vrati pitanje":"🏆 Ljestvica";
}
function selectPosition(r,s,i){
 if(!itemAt(r,s,i))return;
 position={r,s,i};revealed=false;showBoard=false;renderAll();
}
function changePosition(delta){
 const arr=positions(),idx=arr.findIndex(v=>v.r===position.r&&v.s===position.s&&v.i===position.i);
 const p=arr[idx+delta];if(p)selectPosition(p.r,p.s,p.i);else toast(delta>0?"Stigao si do kraja kviza.":"Ovo je prvo pitanje.");
}
function changeReveal(){showBoard=false;revealed=!revealed;renderAll();$("revealBtn").textContent=revealed?"Sakrij odgovor":"Otkrij odgovor";}
function applyPresentationControl(action){
 if(!project)return;
 if(action==="next")changePosition(1);
 else if(action==="previous")changePosition(-1);
 else if(action==="reveal")changeReveal();
 else if(action==="board"){showBoard=!showBoard;renderAll();}
 if(!stageMode){
  $("revealBtn").textContent=revealed?"Sakrij odgovor":"Otkrij odgovor";
  $("scoresBtn").textContent=showBoard?"Vrati pitanje":"🏆 Prikaži ljestvicu";
 }
}
function stageControl(action){
 if(!stageMode)return;
 applyPresentationControl(action);
 if(channel)channel.postMessage({type:"control",action});
}
async function uploadMedia(e){
 const f=e.target.files?.[0];if(!f)return;
 if(!/^(image|audio|video)\//.test(f.type)){toast("Odaberi sliku, audio ili video datoteku.",true);return;}
 if(f.size>250*1024*1024){toast("Datoteka je veća od 250 MB. Koristi manji video ili poveznicu.",true);return;}
 const q=itemAt(position.r,position.s,position.i),id=uid();
 try{await storePut("assets",{id,name:f.name,type:f.type,blob:f});q.mediaId=id;q.mediaName=f.name;q.mediaType=f.type;scheduleSave();renderEditor();renderScreen($("previewPane"),"preview");pushStage();toast("Medij spremljen na ovom uređaju.");}
 catch(err){toast("Medij nije spremljen: "+err.message,true);}
}
function removeMedia(){const q=itemAt(position.r,position.s,position.i);q.mediaId="";q.mediaName="";q.mediaType="";scheduleSave();renderAll();}
async function addTeam(){
 const name=$("teamName").value.trim();if(!name)return;
 if(project.teams.some(t=>t.name.toLowerCase()===name.toLowerCase())){toast("Ekipa s tim imenom već postoji.",true);return;}
 project.teams.push({id:uid(),name,scores:{}});$("teamName").value="";scheduleSave();renderScores();pushStage();
}
function refreshClocks(){
 const sec=timerUntil?Math.max(0,Math.ceil((timerUntil-Date.now())/1000)):null;
 const text=sec===null?"":String(Math.floor(sec/60)).padStart(2,"0")+":"+String(sec%60).padStart(2,"0");
 if(stageMode)$("stageClock").textContent=text;else $("editorClock").textContent=text||String($("timerSeconds").value/60|0).padStart(2,"0")+":"+String(Number($("timerSeconds").value)%60).padStart(2,"0");
}
function validateImported(raw){
 if(!raw||!Array.isArray(raw.rounds)||raw.rounds.length!==ROUNDS.length)throw Error("Datoteka nema tri tražena kruga.");
 for(let ri=0;ri<ROUNDS.length;ri++){
  if(!Array.isArray(raw.rounds[ri].sections)||raw.rounds[ri].sections.length!==ROUNDS[ri].sections.length)throw Error("Nepotpune rubrike u "+(ri+1)+". krugu.");
  for(let si=0;si<ROUNDS[ri].sections.length;si++){
   if(!Array.isArray(raw.rounds[ri].sections[si].items)||raw.rounds[ri].sections[si].items.length!==ROUNDS[ri].sections[si].count)throw Error("Nepotpun broj pitanja u rubrici "+ROUNDS[ri].sections[si].name);
  }
 }
}
function walkItems(q,fn){q.rounds.forEach(r=>r.sections.forEach(s=>s.items.forEach(fn)));}
async function exportQuiz(){
 if(!project)return;
 try{
  $("exportBtn").disabled=true;toast("Pripremam izvoz s medijima…");
  const copy=structuredClone(project),assets={};const ids=new Set();
  walkItems(copy,q=>{if(q.mediaId)ids.add(q.mediaId);});
  for(const id of ids){
   const a=await storeGet("assets",id);if(!a?.blob)continue;
   if(a.blob.size>50*1024*1024&&!confirm("Datoteka "+a.name+" ima više od 50 MB. Izvoz JSON-a s videom može biti vrlo velik. Nastaviti?")){throw Error("Izvoz je otkazan.");}
   const data=await new Promise((resolve,reject)=>{const fr=new FileReader();fr.onload=()=>resolve(fr.result);fr.onerror=reject;fr.readAsDataURL(a.blob);});
   assets[id]={name:a.name,type:a.type,data};
  }
  const file=new Blob([JSON.stringify({format:"kviztogo-live-1",quiz:copy,assets})],{type:"application/json"});
  const url=URL.createObjectURL(file),a=document.createElement("a");a.href=url;a.download=(project.title||"Kviz").replace(/[^a-z0-9čćžšđ _-]/gi,"").slice(0,50).replace(/\s+/g,"-")+"-KvizToGo.json";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
  toast("Kviz izvezen s priloženim medijima.");
 }catch(e){toast(e.message,true);}finally{$("exportBtn").disabled=false;}
}
async function importQuiz(file){
 if(!file)return;
 try{
  const payload=JSON.parse(await file.text());const q=payload.quiz||payload;validateImported(q);
  const copy=structuredClone(q);copy.id=uid();copy.title=(q.title||"Uvezeni kviz")+" (uvoz)";copy.updatedAt=Date.now();
  copy.teams=Array.isArray(copy.teams)?copy.teams:[];for(const t of copy.teams){t.id=uid();t.scores=t.scores||{};}
  const imported=payload.assets||{},remap={};
  for(const [old,a] of Object.entries(imported)){
   if(!a||typeof a.data!=="string"||!/^data:(image|audio|video)\//.test(a.data))continue;
   const blob=await (await fetch(a.data)).blob(),id=uid();await storePut("assets",{id,name:a.name||"Prilog",type:blob.type,blob});remap[old]=id;
  }
  walkItems(copy,item=>{item.mediaId=remap[item.mediaId]||"";});
  await persist(copy);clearTimeout(saveTimer);project=copy;position={r:0,s:0,i:0};revealed=false;showBoard=false;
  localStorage.setItem("kviztogo_live_id",copy.id);ensureChannel();await refreshSelect();renderAll();toast("Uvezen je novi kviz.");
 }catch(e){toast("Uvoz nije uspio: "+e.message,true);}
}
function bindEditor(){
 $("quizSelect").addEventListener("change",async e=>{
  clearTimeout(saveTimer);await persist();const q=await storeGet("quizzes",e.target.value);if(!q)return;
  project=q;localStorage.setItem("kviztogo_live_id",q.id);position={r:0,s:0,i:0};revealed=false;showBoard=false;timerUntil=0;ensureChannel();renderAll();
 });
 $("exampleBtn").addEventListener("click",async()=>{
  const button=$("exampleBtn");button.disabled=true;button.textContent="Učitavam primjer…";
  try{await installExampleQuiz();}catch(e){toast("Ne mogu učitati primjer: "+e.message,true);}
  finally{button.disabled=false;button.textContent="📚 Učitaj Kviz Općeg Znanja 1";}
 });
 $("newBtn").addEventListener("click",async()=>{
  clearTimeout(saveTimer);await persist();
  project=createQuiz();await persist();localStorage.setItem("kviztogo_live_id",project.id);
  position={r:0,s:0,i:0};revealed=false;showBoard=false;timerUntil=0;ensureChannel();await refreshSelect();renderAll();toast("Novi prazni kviz je spreman.");
 });
 $("deleteBtn").addEventListener("click",async()=>{
  if(!project||!confirm("Trajno obrisati kviz „"+project.title+"” na ovom uređaju?"))return;
  clearTimeout(saveTimer);const id=project.id;await storeDelete("quizzes",id);const all=await storeAll("quizzes");
  project=all[0]||createQuiz();if(!all.length)await persist();localStorage.setItem("kviztogo_live_id",project.id);
  position={r:0,s:0,i:0};revealed=false;showBoard=false;timerUntil=0;ensureChannel();await refreshSelect();renderAll();toast("Kviz je obrisan.");
 });
 $("importBtn").addEventListener("click",()=>$("importFile").click());
 $("importFile").addEventListener("change",e=>{importQuiz(e.target.files[0]);e.target.value="";});
 $("exportBtn").addEventListener("click",exportQuiz);
 $("quizTitle").addEventListener("input",e=>{project.title=e.target.value;scheduleSave();pushStage();});
 $("quizTitle").addEventListener("change",refreshSelect);
 $("nav").addEventListener("click",e=>{const el=e.target.closest("button[data-r]");if(el)selectPosition(+el.dataset.r,+el.dataset.s,+el.dataset.i);$("revealBtn").textContent="Otkrij odgovor";});
 const changeField=e=>{
  const target=e.target,q=itemAt(position.r,position.s,position.i);if(!q)return;
  if(target.dataset.field){q[target.dataset.field]=target.value;}
  else if(target.dataset.option!==undefined){q.options[Number(target.dataset.option)]=target.value;}
  else if(target.dataset.five!==undefined){q.five[Number(target.dataset.five)]=target.value;}
  else return;
  scheduleSave();renderScreen($("previewPane"),"preview");pushStage();
 };
 $("questionEdit").addEventListener("input",changeField);
 $("questionEdit").addEventListener("change",changeField);
 $("prevBtn").addEventListener("click",()=>{changePosition(-1);$("revealBtn").textContent="Otkrij odgovor";});
 $("nextBtn").addEventListener("click",()=>{changePosition(1);$("revealBtn").textContent="Otkrij odgovor";});
 $("revealBtn").addEventListener("click",changeReveal);
 $("scoresBtn").addEventListener("click",()=>{showBoard=!showBoard;renderAll();$("scoresBtn").textContent=showBoard?"Vrati pitanje":"🏆 Prikaži ljestvicu";});
 $("stageBtn").addEventListener("click",()=>{
  if(!project)return;const w=window.open("kviz-uzivo.html?stage=1&id="+encodeURIComponent(project.id),"_blank");
  if(!w)toast("Preglednik je blokirao novi prozor. Dopusti skočne prozore.",true);
  else setTimeout(pushStage,650);
 });
 $("addTeam").addEventListener("click",addTeam);
 $("teamName").addEventListener("keydown",e=>{if(e.key==="Enter")addTeam();});
 $("teamScores").addEventListener("change",e=>{const el=e.target.closest("select[data-team]");if(!el)return;const t=project.teams.find(x=>x.id===el.dataset.team);if(!t)return;t.scores[keyOf(position.r,position.s,position.i)]=Number(el.value);scheduleSave();renderScores();pushStage();});
 $("teamScores").addEventListener("click",e=>{const el=e.target.closest("button[data-remove-team]");if(!el)return;const t=project.teams.find(x=>x.id===el.dataset.removeTeam);if(!t||!confirm("Ukloniti ekipu "+t.name+"?"))return;project.teams=project.teams.filter(x=>x.id!==t.id);scheduleSave();renderScores();pushStage();});
 $("resetScores").addEventListener("click",()=>{if(!confirm("Poništiti sve bodove svih ekipa?"))return;project.teams.forEach(t=>t.scores={});scheduleSave();renderScores();pushStage();});
 $("timerStart").addEventListener("click",()=>{timerUntil=Date.now()+Number($("timerSeconds").value)*1000;refreshClocks();pushStage();});
 $("timerStop").addEventListener("click",()=>{timerUntil=0;refreshClocks();pushStage();});
 $("timerSeconds").addEventListener("change",refreshClocks);
 document.addEventListener("keydown",e=>{
  if(e.target.closest("input,textarea,select,button"))return;
  if(e.key==="ArrowRight"){changePosition(1);$("revealBtn").textContent="Otkrij odgovor";}
  if(e.key==="ArrowLeft"){changePosition(-1);$("revealBtn").textContent="Otkrij odgovor";}
  if(e.key===" "){e.preventDefault();changeReveal();}
 });
 window.addEventListener("beforeunload",()=>{if(saveTimer&&project)storePut("quizzes",project).catch(()=>{});});
}
async function init(){
 try{
  db=await openDB();
  const all=await storeAll("quizzes");
  let wanted=new URLSearchParams(location.search).get("id")||localStorage.getItem("kviztogo_live_id");
  project=all.find(x=>x.id===wanted)||all[0]||null;
  if(stageMode){
   $("editorApp").hidden=true;$("stageApp").hidden=false;
   $("stageFullscreen").addEventListener("click",()=>{if(!document.fullscreenElement)$("stageApp").requestFullscreen?.().catch(()=>{});else document.exitFullscreen?.();});
   $("stageClose").addEventListener("click",()=>window.close());
   $("stagePrev").addEventListener("click",()=>stageControl("previous"));
   $("stageNext").addEventListener("click",()=>stageControl("next"));
   $("stageReveal").addEventListener("click",()=>stageControl("reveal"));
   $("stageBoard").addEventListener("click",()=>stageControl("board"));
   document.addEventListener("keydown",e=>{
    if(e.target.closest("button,input,textarea,select,audio,video"))return;
    if(e.key==="ArrowRight"){e.preventDefault();stageControl("next");}
    else if(e.key==="ArrowLeft"){e.preventDefault();stageControl("previous");}
    else if(e.code==="Space"){e.preventDefault();stageControl("reveal");}
   });
   if(!project){$("stageCanvas").textContent="Nema spremljenog kviza na ovom uređaju.";return;}
   ensureChannel();renderStage();
  }else{
   if(!project){
    try{project=await makeExampleQuiz();await persist();}
    catch(e){project=createQuiz();await persist();toast("Primjer još nije dostupan: "+e.message,true);}
   }
   localStorage.setItem("kviztogo_live_id",project.id);
   bindEditor();ensureChannel();await refreshSelect();renderAll();
   $("saveStatus").textContent="✓ Spremljeno na ovom uređaju";
  }
  setInterval(refreshClocks,250);
 }catch(e){toast("Ne mogu otvoriti lokalnu bazu: "+e.message,true);if(stageMode)$("stageCanvas").textContent="Greška: "+e.message;else $("saveStatus").textContent="Spremanje nije dostupno"; }
}
init();
