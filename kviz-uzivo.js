"use strict";

/* KvizToGo – zaseban lokalni urednik kvizova uživo. Bez promjena baze online pitanja. */
const ROUNDS=[
 {name:"1. KRUG",stated:24,sections:[
  {code:"povezano",name:"POVEZANO (NE)ZNANJE",desc:"Svaki odgovor je povezan s ostalima na neki način / 1 bod za svaki točan odgovor.",count:4,points:1},
  {code:"abc",name:"A, B ili C",desc:"Jednostavna pitalica sa slikama i ponuđenim odgovorima / 1 bod za svaki točan odgovor.",count:4,points:1},
  {code:"kvizoznalac",name:"KVIZOZNALAC",desc:"Pitanje za pitanjem / 1 bod za svaki točan odgovor.",count:6,points:1},
  {code:"kaladont",name:"KA - LA - DONT",desc:"Zadnja dva slova prvog odgovora su prva dva slova idućeg odgovora / 1 bod za svaki točan odgovor.",count:5,points:1},
  {code:"jucer",name:"JUČER, DANAS, SUTRA",desc:"Pitanja o aktualnostima / 1 bod za svaki točan odgovor.",count:3,points:1},
  {code:"pjevaj",name:"PJEVAJ MI PJEVAJ",desc:"Prepoznaj ime izvođača i ime pjesme / 1 bod za svaki točan odgovor (1a. Ime pjesme / 1b. Ime izvođača).",count:1,points:2}
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

// Redoslijed projekcije: dobrodošlica, najava kruga, najava rubrike, pitanja, ljestvica.
const SLIDES=[
 {kind:"welcome"},
 ...ROUNDS.flatMap((round,r)=>[
  {kind:"round",r},
  ...round.sections.flatMap((section,si)=>[
   {kind:"section",r,s:si},
   ...Array.from({length:section.count},(_,i)=>({kind:"question",r,s:si,i}))
  ]),
  {kind:"score",r}
 ])
];
const SECTION_EXAMPLES={
 povezano:"Primjer: odgovore mogu povezivati ista boja, zanimanje ili skriveni zajednički pojam.",
 kaladont:"", // Rich Kaladont example is rendered directly, never in the old boxed format.
 slovo:"", // Rich all-on-P example is rendered using the same unboxed rubric style.
 abecedalica:"Primjer slijeda: A, B, C... Svaki sljedeći odgovor dolazi abecedno iza prethodnog.",
 gameset:"U svakoj seriji tri pitanja donose redom 0,5, 1 i 2 boda."
};
const WELCOME_RULES=[
 "Kviz se igra u 3 kruga.",
 "Mobitele utišajte i spremite. Tijekom kruga nije dopušteno njihovo korištenje.",
 "Tijekom kruga nema izlaska van ni odlaska na WC. Pauze su između krugova.",
 "Poštujte ostale ekipe i prijavite ako vidite da netko krši pravila.",
 "Prvo upozorenje: −10 bodova. Drugo upozorenje: diskvalifikacija."
];
const currentSlide=()=>SLIDES[Math.max(0,Math.min(slideIndex,SLIDES.length-1))];

/* Only display typography changes here: original rubric names and descriptions remain untouched. */
const RUBRIC_DISPLAY_NAMES={
 "POVEZANO (NE)ZNANJE":"Povezano (ne)znanje",
 "KVIZOZNALAC":"KvizoZnalac",
 "KA - LA - DONT":"Ka - La - Dont",
 "JUČER, DANAS, SUTRA":"Jučer, danas, sutra",
 "PJEVAJ MI PJEVAJ":"Pjevaj mi pjevaj",
 "SVE NA SLOVO":"Sve na slovo",
 "BODOLOVAC":"Bodolovac",
 "PREMETALJKA":"Premetaljka",
 "ASOCIJACIJA":"Asocijacija",
 "VJEROVALI ILI NE":"Vjerovali ili ne",
 "NE ZABORAVI STIHOVE":"Ne zaboravi stihove",
 "KOCKA JE BAČENA":"Kocka je bačena",
 "PITANJE PROCJENE":"Pitanje procjene",
 "VIZUALNI DIO":"Vizualni dio",
 "ABECEDALICA":"Abecedalica",
 "GAME OVER TIME":"Game Over Time",
 "NABROJI IH SVE...":"Nabroji ih sve...",
 "GAME, SET, MATCH":"Game, Set, Match"
};
const rubricDisplayName=name=>RUBRIC_DISPLAY_NAMES[name]||name;

const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const uid=()=>typeof crypto!=="undefined"&&crypto.randomUUID?crypto.randomUUID():"ktg-"+Date.now()+"-"+Math.random().toString(36).slice(2);
const DBNAME="kviztogo-live-editor-v1";
const SAMPLE_PARTS=["kviz-uzivo-primjer-1.json","kviz-uzivo-primjer-2.json","kviz-uzivo-primjer-3.json"];
let db,project=null,position={r:0,s:0,i:0},slideIndex=0,revealed=false,showBoard=false,autoShowAnswers=false;
let channel=null,saveTimer=null,toastTimer=null,stageMode=new URLSearchParams(location.search).get("stage")==="1";
let activeUrls={},mediaSeq={},lastPreviewKey="",currentView="home",pairing=null;
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
 endPairing();
 if(!stageMode&&project)await persist();
 const quiz=await makeExampleQuiz();
 await persist(quiz);
 project=quiz;position={r:0,s:0,i:0};slideIndex=0;revealed=false;showBoard=false;
 localStorage.setItem("kviztogo_live_id",project.id);
 ensureChannel();await refreshSelect();renderAll();
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
function roundScore(team,r){
 const stored=team?.roundScores?.[r];
 if(stored!==null&&stored!==undefined&&stored!==""&&Number.isFinite(Number(stored)))return Number(stored);
 return Object.entries(team?.scores||{}).reduce((sum,[key,value])=>key.startsWith(r+"-")?sum+(Number(value)||0):sum,0);
}
function total(team,through=2){return [0,1,2].filter(r=>r<=through).reduce((sum,r)=>sum+roundScore(team,r),0);}
function sortedTeams(through=2){return [...(project?.teams||[])].sort((a,b)=>total(b,through)-total(a,through)||a.name.localeCompare(b.name,"hr"));}
function leaderboardRows(through=2){
 return sortedTeams(through).map(t=>({
  name:t.name,rounds:[0,1,2].map(r=>r<=through?roundScore(t,r):null),score:total(t,through)
 }));
}
function ensureChannel(){
 if(!("BroadcastChannel" in window)||!project)return;
 if(channel){channel.close();channel=null;}
 channel=new BroadcastChannel("kviztogo-live-"+project.id);
 channel.onmessage=async event=>{
   const m=event.data||{};
   if(stageMode){
     if(m.type==="state"&&m.quiz?.id===project.id){project=m.quiz;position=m.position||position;slideIndex=Number.isInteger(m.slideIndex)?Math.max(0,Math.min(m.slideIndex,SLIDES.length-1)):slideIndex;revealed=!!m.revealed;showBoard=!!m.showBoard;renderStage();}
   }else if(m.type==="hello")pushStage();
 };
 if(stageMode)channel.postMessage({type:"hello"});
}
function pushStage(){
 if(channel&&!stageMode&&project)channel.postMessage({type:"state",quiz:project,position,slideIndex,revealed,showBoard});
 if(!stageMode&&project&&window.KTGSync?.isHost())window.KTGSync.broadcastHost(sharedSlide());
}
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
 renderSharedSlide(root,sharedSlide(),{localMedia:true,mediaKind:kind});
}
function renderScores(){
 const teams=sortedTeams(),root=$("teamScores"),overview=$("roundScores");
 const k=keyOf(position.r,position.s,position.i),allowed=scoreAllowed(position.r,position.s,position.i);
 if(!teams.length){
  root.innerHTML='<p class="muted tiny">Nema ekipa. Dodaj prvu ekipu iznad.</p>';
  overview.innerHTML='<p class="muted">Dodaj ekipu kako bi mogao unositi bodove i prikazati ljestvicu.</p>';
  return;
 }
 const fmt=n=>Number(n).toLocaleString("hr-HR",{maximumFractionDigits:2});
 overview.innerHTML='<div class="score-scroll"><table class="scoreboard round-score-table"><thead><tr><th>Ekipa</th>'+
  [0,1,2].map(r=>'<th>'+(r+1)+'. krug <small> / '+roundMax(r)+'</small></th>').join("")+
  '<th>Ukupno</th><th></th></tr></thead><tbody>'+
  teams.map(t=>'<tr><th scope="row">'+esc(t.name)+'</th>'+
   [0,1,2].map(r=>{
    const manual=t.roundScores?.[r],hasManual=manual!==null&&manual!==undefined&&manual!=="";
    const inferred=roundScore({...t,roundScores:{}},r);
    return '<td><input type="number" inputmode="decimal" step="0.5" min="'+(r===2?-5:0)+'" max="'+roundMax(r)+'"'+
     ' data-round-team="'+esc(t.id)+'" data-round="'+r+'" value="'+(hasManual?esc(manual):'')+'" placeholder="'+fmt(inferred)+'"'+
     ' aria-label="'+esc(t.name+' '+(r+1)+'. krug')+'"></td>';
   }).join("")+
   '<td class="score-total">'+fmt(total(t))+'</td>'+
   '<td><button class="danger" type="button" data-remove-team="'+esc(t.id)+'" aria-label="Ukloni ekipu '+esc(t.name)+'">×</button></td></tr>').join("")+
  '</tbody></table></div>';
 root.innerHTML='<table class="scoreboard"><thead><tr><th>Ekipa</th><th>Ovo pitanje</th><th>Ukupno</th></tr></thead><tbody>'+
  teams.map(t=>'<tr><td>'+esc(t.name)+'</td><td><select data-team="'+esc(t.id)+'">'+allowed.map(v=>'<option value="'+v+'"'+(Number(t.scores?.[k]||0)===v?' selected':'')+'>'+fmt(v)+'</option>').join("")+'</select></td><td>'+fmt(total(t))+'</td></tr>').join("")+'</tbody></table>'+
  '<p class="muted tiny">Ako ručno upišeš bodove za krug iznad, taj unos ima prednost pred zbrojem pojedinačnih pitanja. Obriši unos za povratak na automatski zbroj.</p>';
}
function renderAll(){
 if(!project)return;
 if(!stageMode){
  $("quizTitle").value=project.title||"";
  renderNav();renderEditor();renderScores();renderScreen($("previewPane"),"preview");
  updateStudio();
 }else renderStage();
 pushStage();
}
function renderStage(){renderScreen($("stageCanvas"),"stage");}
function updateStudio(){
 if(stageMode||!project)return;
 const slide=currentSlide();
 const label=slide.kind==="welcome"?"Dobrodošli · pravila i početak":
  slide.kind==="round"?ROUNDS[slide.r].name+" · početak kruga":
  slide.kind==="section"?ROUNDS[slide.r].name+" · "+ROUNDS[slide.r].sections[slide.s].name+" · najava rubrike":
  slide.kind==="score"?ROUNDS[slide.r].name+" · ljestvica":
  ROUNDS[slide.r].name+" · "+ROUNDS[slide.r].sections[slide.s].name;
 $("homeQuizTitle").textContent=project.title||"Bez naziva";
 $("hostQuizTitle").textContent=project.title||"Kviz Općeg Znanja";
 $("hostQuestionLabel").textContent=label;
 $("hostCounter").textContent="Slajd "+(slideIndex+1)+" / "+SLIDES.length;
 $("prevBtn").disabled=slideIndex<=0;
 $("nextBtn").disabled=slideIndex>=SLIDES.length-1;
 $("firstSlideBtn").disabled=slideIndex===0&&!showBoard;
 $("autoShowAnswers").checked=autoShowAnswers;
 $("scoresBtn").disabled=slide.kind==="score";
 $("scoresBtn").textContent=showBoard?"Vrati slajd":"🏆 Prikaži ljestvicu";
}
function showView(view){
 if(stageMode)return;
 currentView=view;
 const ids={home:"homeScreen",host:"hostScreen",edit:"editScreen",manage:"manageScreen"};
 for(const [key,id] of Object.entries(ids))$(id).hidden=key!==view;
 $("topHome").hidden=view==="home";
 if(view==="host"||view==="edit")renderAll();
 else if(view==="home")updateStudio();
 if(view==="manage")refreshSelect().catch(e=>toast(e.message,true));
 window.scrollTo(0,0);
}
function setSlideIndex(next){
 if(next<0||next>=SLIDES.length){
  toast(next<0?"Ovo je prvi slajd.":"Stigao si do kraja kviza.");return;
 }
 slideIndex=next;
 const slide=currentSlide();
 if(slide.kind==="question")position={r:slide.r,s:slide.s,i:slide.i};
 else if(slide.kind==="section")position={r:slide.r,s:slide.s,i:0};
 else if(slide.kind==="round")position={r:slide.r,s:0,i:0};
 else if(slide.kind==="score"){
  const last=ROUNDS[slide.r].sections.length-1,items=ROUNDS[slide.r].sections[last].count;
  position={r:slide.r,s:last,i:items-1};
 }else position={r:0,s:0,i:0};
 revealed=autoShowAnswers&&slide.kind==="question";showBoard=false;renderAll();
}
function selectPosition(r,s,i){
 if(!itemAt(r,s,i))return;
 const idx=SLIDES.findIndex(sl=>sl.kind==="question"&&sl.r===r&&sl.s===s&&sl.i===i);
 if(idx>=0)setSlideIndex(idx);
}
function changePosition(delta){setSlideIndex(slideIndex+delta);}
function changeReveal(){
 if(currentSlide().kind!=="question"||showBoard)return;
 revealed=!revealed;
 // A manual hide from the remote / keyboard switches off auto-reveal too.
 if(autoShowAnswers&&!revealed)autoShowAnswers=false;
 renderAll();
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
 project.teams.push({id:uid(),name,scores:{},roundScores:{}});$("teamName").value="";scheduleSave();renderAll();
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
  endPairing();await persist(copy);clearTimeout(saveTimer);project=copy;position={r:0,s:0,i:0};slideIndex=0;revealed=false;showBoard=false;
  localStorage.setItem("kviztogo_live_id",copy.id);ensureChannel();await refreshSelect();renderAll();toast("Uvezen je novi kviz.");
 }catch(e){toast("Uvoz nije uspio: "+e.message,true);}
}

// Sharing across devices uses ephemeral Supabase Realtime messages, never database records.
function sharedSlide(){
 if(!project)return null;
 const slide=currentSlide(),base={
  kind:"ktg-slide",
  slideType:slide.kind,
  quizTitle:project.title||"Kviz Općeg Znanja",
  index:slideIndex+1,total:SLIDES.length,
  revealed:false,showBoard:showBoard||slide.kind==="score"
 };
 if(showBoard||slide.kind==="score"){
  const r=slide.r??0;
  return {...base,slideType:"score",roundIndex:r,
   scoreTitle:"Ljestvica nakon "+(r+1)+". kruga",
   board:leaderboardRows(r)};
 }
 if(slide.kind==="welcome")return {
  ...base,title:"Dobrodošli!",subtitle:"Kviz općeg znanja vol. 1",
  rules:WELCOME_RULES,maxPoints:ROUNDS.reduce((sum,_,r)=>sum+roundMax(r),0),
  roundPoints:ROUNDS.map((_,r)=>roundMax(r)),ending:"Sretno svima!"
 };
 if(slide.kind==="round")return {
  ...base,roundName:ROUNDS[slide.r].name,
  maxPoints:roundMax(slide.r),sectionsCount:ROUNDS[slide.r].sections.length
 };
 const section=ROUNDS[slide.r].sections[slide.s];
 if(slide.kind==="section")return {
  ...base,roundName:ROUNDS[slide.r].name,sectionTitle:rubricDisplayName(section.name),
  sectionCode:section.code,description:section.desc,example:SECTION_EXAMPLES[section.code]||"",
  sectionQuestionCount:section.count,
  sectionPoints:Array.from({length:section.count},(_,i)=>pointsFor(slide.r,slide.s,i)).reduce((a,b)=>a+b,0)
 };
 const q=itemAt(slide.r,slide.s,slide.i);
 if(!q)return base;
 return {
  ...base,slideType:"question",roundName:ROUNDS[slide.r].name,
  sectionTitle:rubricDisplayName(section.name),sectionCode:section.code,
  question:q.question?.trim()||(section.code==="asocijacija"&&slide.i===4?"Koje je konačno rješenje?":"Ovdje upiši pitanje."),
  choices:section.code==="abc"?(q.options||[]).map((t,i)=>["A","B","C"][i]+") "+(t||"…")):
   section.code==="vjerovali"?["Točno","Netočno"]:[],
  correct:revealed?(section.code==="abc"?q.correct:section.code==="vjerovali"?q.truth:""):"",
  answer:revealed?createAnswer(slide.r,slide.s,slide.i,q):"",
  revealed,showBoard:false,
  mediaUrl:q.mediaUrl?String(q.mediaUrl):"",
  mediaMissing:!!q.mediaId&&!q.mediaUrl
 };
}
function sharedMedia(root,slide){
 const holder=root.querySelector(".screen-media");if(!holder||!slide)return;
 if(slide.mediaUrl){
  const embed=youtubeEmbed(slide.mediaUrl);
  if(embed){
   const frame=document.createElement("iframe");frame.src=embed;frame.title="Video";frame.allow="fullscreen; autoplay; encrypted-media";frame.allowFullscreen=true;
   frame.style.cssText="width:min(85vw,700px);height:clamp(160px,28vh,350px);border:0;border-radius:9px";holder.append(frame);return;
  }
  const url=safeUrl(slide.mediaUrl);if(!url)return;
  const type=/\.(mp3|ogg|wav|m4a)(\?|$)/i.test(url)?"audio":/\.(mp4|webm|mov)(\?|$)/i.test(url)?"video":"img";
  const el=document.createElement(type);el.src=url;if(type==="img"){el.alt="Slika uz pitanje";}else{el.controls=true;el.preload="metadata";}
  holder.append(el);
 }else if(slide.mediaMissing){
  const p=document.createElement("p");p.className="muted tiny";p.textContent="Prilog je lokalno spremljen. Za prikaz na drugom uređaju dodaj mrežnu poveznicu na medij u uređivaču.";holder.append(p);
 }
}
function renderSharedSlide(root,slide,options={}){
 if(!root||!slide||slide.kind!=="ktg-slide")return;
 const type=slide.slideType||"question";
 const textNumber=n=>Number(n||0).toLocaleString("hr-HR",{maximumFractionDigits:2});
 const inner=(cls,body)=>'<div class="screen-inner slide-content '+cls+'">'+body+'</div>';
 if(options.localMedia&&type!=="question"){
  releaseMedia(options.mediaKind);
  mediaSeq[options.mediaKind]=(mediaSeq[options.mediaKind]||0)+1;
 }
 if(type==="welcome"){
  const rules=(slide.rules||[]).map(rule=>'<li>'+esc(rule)+'</li>').join("");
  root.innerHTML=inner("slide--welcome",
   '<div class="slide-center"><div class="slide-kicker">KVIZTOGO · PUB KVIZ</div>'+
   '<div class="slide-hero">'+esc(slide.title||"Dobrodošli!")+'</div>'+
   '<div class="slide-subtitle">'+esc(slide.subtitle||"Kviz Općeg Znanja")+'</div>'+
   '<div class="welcome-summary">3 kruga · maksimalno '+textNumber(slide.maxPoints)+' bodova</div>'+
   '<ul class="welcome-rules">'+rules+'</ul>'+
   '<div class="slide-goodluck">'+esc(slide.ending||"Sretno svima!")+'</div></div>');
  return;
 }
 if(type==="round"){
  root.innerHTML=inner("slide--round",
   '<div class="slide-center">'+
   '<div class="slide-hero">'+esc(slide.roundName||"KRUG")+'</div>'+
   '<div class="slide-subtitle">Maksimalno '+textNumber(slide.maxPoints)+' bodova</div>'+
   '<div class="slide-rule-meta">'+esc(slide.sectionsCount||"")+' rubrika</div></div>');
  return;
 }
 if(type==="section"){
  // Recognize the rubric also from its visible title: remote displays may receive older slide data.
  const kaladontSlide=slide.sectionCode==="kaladont"||/KA\s*-\s*LA\s*-\s*DONT/i.test(slide.sectionTitle||"");
  const specialExamples=slide.sectionCode==="povezano"?
   '<div class="rubric-examples" aria-label="Primjeri poveznica">'+
    '<div class="rubric-example-group">Primjer: (Pan<span class="ktg-gold">dora</span>, El <span class="ktg-gold">Dora</span>do, <span class="ktg-gold">Dora</span> Kurpić, Dia<span class="ktg-gold">dora</span>)</div>'+
    '<div class="rubric-example-group">(<span class="ktg-gold">Lovac</span> u žitu, <span class="ktg-gold">Kralj</span>evstvo nebesko, Turopoljski <span class="ktg-gold">top</span>, Nilski <span class="ktg-gold">konj</span>)</div>'+
   '</div>':
   kaladontSlide?
   '<div class="rubric-examples" aria-label="Povezana posljednja i prva dva slova">'+
    '<div class="rubric-example-group">(Trok<span class="ktg-gold" style="color:#bd9c63">ut</span> - <span class="ktg-gold" style="color:#bd9c63">Ut</span>akmi<span class="ktg-gold" style="color:#bd9c63">ca</span> - <span class="ktg-gold" style="color:#bd9c63">Ca</span>nber<span class="ktg-gold" style="color:#bd9c63">ra</span> - <span class="ktg-gold" style="color:#bd9c63">Ra</span>zlom<span class="ktg-gold" style="color:#bd9c63">ak</span> - <span class="ktg-gold" style="color:#bd9c63">Ak</span>ropola)</div>'+
   '</div>':
   slide.sectionCode==="slovo"?
   '<div class="rubric-examples" aria-label="Primjer odgovora na slovo P">'+
    '<div class="rubric-example-group">(<span class="ktg-gold" style="color:#bd9c63">P</span>ortugal, <span class="ktg-gold" style="color:#bd9c63">P</span>ortret, <span class="ktg-gold" style="color:#bd9c63">P</span>alma, <span class="ktg-gold" style="color:#bd9c63">P</span>ištolj, <span class="ktg-gold" style="color:#bd9c63">P</span>luton, <span class="ktg-gold" style="color:#bd9c63">P</span>ayPal)</div>'+
   '</div>':"";
  root.innerHTML=inner("slide--section",
   '<div class="slide-center">'+
   '<div class="slide-hero rubric-hero">'+esc(slide.sectionTitle||"Rubrika")+'</div>'+
   (Number.isInteger(slide.sectionQuestionCount)&&slide.sectionQuestionCount>0?
    '<div class="rubric-question-count">('+slide.sectionQuestionCount+' '+(slide.sectionQuestionCount===1?'pitanje':'pitanja')+')</div>':'')+
   '<div class="rubric-description">'+esc(slide.description||"")+'</div>'+
   (slide.sectionCode==="abc"?'<div class="rubric-instruction">Zaokruži slovo na pitanju za odgovor koji misliš da je točan.</div>':"")+
   (specialExamples|| (slide.example?'<div class="rubric-example">'+esc(slide.example)+'</div>':""))+'</div>');
  return;
 }
 if(type==="score"){
  const heads='<thead><tr><th>Ekipa</th><th>1. krug</th><th>2. krug</th><th>3. krug</th><th>Ukupno</th></tr></thead>';
  const rows=(slide.board||[]).map((t,i)=>
   '<tr><th scope="row">'+(i+1)+'. '+esc(t.name)+'</th>'+
   (t.rounds||[]).map(v=>'<td>'+(v===null||v===undefined?'—':textNumber(v))+'</td>').join("")+
   '<td class="stage-total">'+textNumber(t.score)+'</td></tr>').join("");
  root.innerHTML=inner("slide--score",
   '<div class="slide-kicker">REZULTATI · '+esc(slide.quizTitle||"KvizToGo")+'</div>'+
   '<div class="score-heading">🏆 '+esc(slide.scoreTitle||"Ljestvica")+'</div>'+
   '<div class="stage-leaderboard-wrap"><table class="stage-leaderboard">'+heads+'<tbody>'+
   (rows||'<tr><td colspan="5" class="empty-board">Bodovi ekipa još nisu upisani.</td></tr>')+
   '</tbody></table></div>');
  return;
 }
 const question=String(slide.question||"");
 // Every question has a fixed font size for its screen, regardless of character count.
 // The CSS also keeps ABC options at that same size.
 const choices=(slide.choices||[]).map(t=>{
  const isCorrect=!!slide.revealed&&!!slide.correct&&
   (String(t).startsWith(slide.correct+")")||String(t)===slide.correct);
  return '<div class="screen-choice'+(isCorrect?" correct":"")+'">'+esc(t)+'</div>';
 }).join("");
 root.innerHTML=inner("slide--question",
  '<div class="screen-head"><span>'+esc(slide.roundName||"")+'</span><strong>'+esc(slide.sectionTitle||"")+'</strong></div>'+
  '<div class="screen-body"><div class="screen-title question-fixed">'+esc(question)+'</div>'+
  (choices?'<div class="screen-choices'+(slide.sectionCode==="abc"?" abc-choices":"")+'">'+choices+'</div>':"")+
  '<div class="screen-media"></div>'+
  (slide.revealed?'<div class="screen-answer">'+esc(slide.answer||"Odgovor još nije upisan.")+'</div>':"")+
  '</div>');
 if(options.localMedia){
  const current=currentSlide(),q=current.kind==="question"?itemAt(current.r,current.s,current.i):null;
  if(q)attachMedia(root.querySelector(".screen-media"),q,options.mediaKind).catch(()=>{});
 }else sharedMedia(root,slide);
}
function pairingForCurrentQuiz(){
 if(!project||!window.KTGSync)throw Error("Povezivanje nije dostupno.");
 const storageKey="ktg-room-"+project.id;
 let info;try{info=JSON.parse(localStorage.getItem(storageKey)||"null");}catch{}
 if(!info||!KTGSync.validRoom(info.room)||!(/^[0-9a-f]{48}$/.test(info.secret||""))){
  info={room:KTGSync.genRoom(),secret:KTGSync.genSecret()};
  localStorage.setItem(storageKey,JSON.stringify(info));
 }
 return info;
}
function audienceUrl(room){return new URL("kviz-uzivo.html?stage=1&room="+encodeURIComponent(room),location.href).href;}
function controllerUrl(room,secret){return new URL("kviz-uzivo.html?remote="+encodeURIComponent(room)+"&auth="+encodeURIComponent(secret),location.href).href;}
function startPairing(){
 if(!project||!window.KTGSync)throw Error("Za povezivanje uređaja potrebna je dostupna internetska usluga.");
 const info=pairingForCurrentQuiz();pairing=info;
 $("pairPanel").hidden=false;
 $("roomCode").textContent=info.room;
 $("audienceLink").value=audienceUrl(info.room);
 $("controlLink").value=controllerUrl(info.room,info.secret);
 KTGSync.startHost({
  room:info.room,controlSecret:info.secret,getState:sharedSlide,
  onStatus:s=>$("pairStatus").textContent=s,
  onCommand:action=>{
   if(action==="next")changePosition(1);
   else if(action==="previous")changePosition(-1);
   else if(action==="reveal")changeReveal();
   else if(action==="board"){showBoard=!showBoard;renderAll();}
  }
 });
}
function endPairing(){
 if(window.KTGSync)KTGSync.stop();
 pairing=null;
 if($("pairPanel"))$("pairPanel").hidden=true;
}
function connectAudience(room){
 $("editorApp").hidden=true;$("stageApp").hidden=false;
 $("stageCanvas").textContent="Povezujem ekran za publiku…";
 let lastSlide="";
 KTGSync.startAudience({
  room,
  onState:slide=>{
   const signature=JSON.stringify(slide);
   if(signature!==lastSlide){renderSharedSlide($("stageCanvas"),slide);lastSlide=signature;}
  },
  onStatus:status=>{
   if(status==="Povezano"&&!lastSlide)$("stageCanvas").textContent="Ekran je povezan. Čekam voditelja kviza…";
   else if(status!=="Povezano"){$("stageCanvas").textContent=status;lastSlide="";}
  }
 });
}
function connectRemoteController(room,secret){
 $("homeScreen").hidden=true;$("hostScreen").hidden=true;
 $("editScreen").hidden=true;$("manageScreen").hidden=true;$("remoteScreen").hidden=false;
 $("topHome").hidden=true;
 $("remotePreview").innerHTML='<div class="screen"><div class="screen-inner">Čekam prvo pitanje…</div></div>';
 let lastSlide="";
 KTGSync.startController({
  room,controlSecret:secret,
  onState:slide=>{
   const signature=JSON.stringify(slide);
   if(signature!==lastSlide){
    $("remotePreview").innerHTML='<div class="screen"></div>';
    renderSharedSlide($("remotePreview").firstElementChild,slide);
    lastSlide=signature;
   }
   $("remoteStatus").textContent="Upravljanje aktivnim kvizom · "+slide.index+" / "+slide.total;
   $("remoteReveal").textContent=slide.revealed?"Sakrij odgovor":"Prikaži odgovor";
   $("remoteReveal").disabled=slide.slideType!=="question"||slide.showBoard;
   $("remotePrev").disabled=slide.index<=1;
   $("remoteNext").disabled=slide.index>=slide.total;
  },
  onStatus:s=>{
   $("remoteStatus").textContent=s==="Povezano"?"Spojeno na sustav. Čekam aktivnog voditelja…":s;
   if(s!=="Povezano")lastSlide="";
  }
 });
 $("remotePrev").addEventListener("click",()=>KTGSync.sendCommand("previous"));
 $("remoteNext").addEventListener("click",()=>KTGSync.sendCommand("next"));
 $("remoteReveal").addEventListener("click",()=>KTGSync.sendCommand("reveal"));
}
async function copyLink(id){
 const input=$(id);
 if(!input?.value)return;
 try{await navigator.clipboard.writeText(input.value);toast("Poveznica kopirana.");}
 catch{input.focus();input.select();toast("Označena poveznica. Kopiraj je ručno.");}
}

function bindEditor(){
 $("topHome").addEventListener("click",()=>showView("home"));
 $("startBtn").addEventListener("click",()=>showView("host"));
 $("manageBtn").addEventListener("click",()=>showView("manage"));
 $("hostManageBtn").addEventListener("click",()=>showView("manage"));
 $("openEditorBtn").addEventListener("click",()=>showView("edit"));
 $("backHostEdit").addEventListener("click",()=>showView("host"));
 $("backHostManage").addEventListener("click",()=>showView("host"));
 $("manageOpenBtn").addEventListener("click",()=>showView("host"));
 $("manageEditBtn").addEventListener("click",()=>showView("edit"));
 $("pairBtn").addEventListener("click",()=>{
  try{startPairing();toast("Poveži TV pomoću koda, a mobitel privatnom poveznicom.");}
  catch(e){toast(e.message,true);}
 });
 $("copyAudience").addEventListener("click",()=>copyLink("audienceLink"));
 $("copyControl").addEventListener("click",()=>copyLink("controlLink"));
 $("joinAudience").addEventListener("click",()=>{
  const room=$("joinRoom").value.trim().toUpperCase();
  if(!window.KTGSync?.validRoom(room)){toast("Upiši kod od 8 znakova s voditeljskog ekrana.",true);return;}
  location.href=audienceUrl(room);
 });
 $("joinRoom").addEventListener("keydown",e=>{if(e.key==="Enter")$("joinAudience").click();});
 $("quizSelect").addEventListener("change",async e=>{
  endPairing();clearTimeout(saveTimer);await persist();const q=await storeGet("quizzes",e.target.value);if(!q)return;
  project=q;localStorage.setItem("kviztogo_live_id",q.id);position={r:0,s:0,i:0};slideIndex=0;revealed=false;showBoard=false;ensureChannel();renderAll();
 });
 $("exampleBtn").addEventListener("click",async()=>{
  const button=$("exampleBtn");button.disabled=true;
  try{await installExampleQuiz();showView("host");}
  catch(e){toast("Ne mogu učitati primjer: "+e.message,true);}
  finally{button.disabled=false;}
 });
 $("newBtn").addEventListener("click",async()=>{
  endPairing();clearTimeout(saveTimer);await persist();
  project=createQuiz();await persist();localStorage.setItem("kviztogo_live_id",project.id);
  position={r:0,s:0,i:0};slideIndex=0;revealed=false;showBoard=false;ensureChannel();await refreshSelect();renderAll();showView("edit");toast("Novi prazni kviz je spreman.");
 });
 $("deleteBtn").addEventListener("click",async()=>{
  if(!project||!confirm("Trajno obrisati kviz „"+project.title+"” na ovom uređaju?"))return;
  endPairing();clearTimeout(saveTimer);const id=project.id;await storeDelete("quizzes",id);const all=await storeAll("quizzes");
  project=all[0]||createQuiz();if(!all.length)await persist();localStorage.setItem("kviztogo_live_id",project.id);
  position={r:0,s:0,i:0};slideIndex=0;revealed=false;showBoard=false;ensureChannel();await refreshSelect();renderAll();toast("Kviz je obrisan.");
 });
 $("importBtn").addEventListener("click",()=>$("importFile").click());
 $("importFile").addEventListener("change",e=>{importQuiz(e.target.files[0]);e.target.value="";});
 $("exportBtn").addEventListener("click",exportQuiz);
 $("quizTitle").addEventListener("input",e=>{project.title=e.target.value;scheduleSave();updateStudio();pushStage();});
 $("quizTitle").addEventListener("change",refreshSelect);
 $("nav").addEventListener("click",e=>{const el=e.target.closest("button[data-r]");if(el)selectPosition(+el.dataset.r,+el.dataset.s,+el.dataset.i);});
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
 $("prevBtn").addEventListener("click",()=>changePosition(-1));
 $("nextBtn").addEventListener("click",()=>changePosition(1));
 $("firstSlideBtn").addEventListener("click",()=>{if(slideIndex!==0||showBoard)setSlideIndex(0);});
 $("autoShowAnswers").addEventListener("change",e=>{
  autoShowAnswers=e.target.checked;
  if(currentSlide().kind==="question")revealed=autoShowAnswers;
  renderAll();
 });
 $("scoresBtn").addEventListener("click",()=>{if(currentSlide().kind==="score")return;showBoard=!showBoard;renderAll();});
 $("stageBtn").addEventListener("click",()=>{
  if(!project)return;const target=pairing?audienceUrl(pairing.room):"kviz-uzivo.html?stage=1&id="+encodeURIComponent(project.id);
  const w=window.open(target,"_blank");
  if(!w)toast("Preglednik je blokirao novi prozor. Dopusti skočne prozore.",true);
  else {persist().catch(()=>{});setTimeout(pushStage,600);setTimeout(pushStage,1500);}
 });
 $("addTeam").addEventListener("click",addTeam);
 $("teamName").addEventListener("keydown",e=>{if(e.key==="Enter")addTeam();});
 $("teamScores").addEventListener("change",e=>{const el=e.target.closest("select[data-team]");if(!el)return;const t=project.teams.find(x=>x.id===el.dataset.team);if(!t)return;t.scores[keyOf(position.r,position.s,position.i)]=Number(el.value);scheduleSave();renderAll();});
 $("roundScores").addEventListener("change",e=>{
  const input=e.target.closest("input[data-round-team]");if(!input)return;
  const team=project.teams.find(x=>x.id===input.dataset.roundTeam);
  if(!team)return;
  const r=Number(input.dataset.round),value=input.value.trim();
  if(!Number.isInteger(r)||r<0||r>2)return;
  if(value!==""&&(!Number.isFinite(Number(value))||Number(value)<(r===2?-5:0)||Number(value)>roundMax(r))){
   toast("Bodovi za "+(r+1)+". krug moraju biti između "+(r===2?-5:0)+" i "+roundMax(r)+".",true);
   renderScores();return;
  }
  team.roundScores=team.roundScores||{};
  if(value==="")delete team.roundScores[r];else team.roundScores[r]=Number(value);
  scheduleSave();renderAll();
 });
 $("roundScores").addEventListener("click",e=>{
  const btn=e.target.closest("button[data-remove-team]");if(!btn)return;
  const t=project.teams.find(x=>x.id===btn.dataset.removeTeam);
  if(!t||!confirm("Ukloniti ekipu "+t.name+"?"))return;
  project.teams=project.teams.filter(x=>x.id!==t.id);
  scheduleSave();renderAll();
 });
 $("resetScores").addEventListener("click",()=>{if(!confirm("Poništiti sve bodove svih ekipa?"))return;project.teams.forEach(t=>{t.scores={};t.roundScores={};});scheduleSave();renderAll();});
 document.addEventListener("keydown",e=>{
  if(currentView!=="host"||e.target.closest("input,textarea,select,button"))return;
  if(e.key==="ArrowRight"){e.preventDefault();changePosition(1);}
  else if(e.key==="ArrowLeft"){e.preventDefault();changePosition(-1);}
  else if(e.code==="Space"){e.preventDefault();changeReveal();}
 });
 window.addEventListener("beforeunload",()=>{if(saveTimer&&project)storePut("quizzes",project).catch(()=>{});});
}
async function init(){
 try{
  const params=new URLSearchParams(location.search);
  const room=String(params.get("room")||"").toUpperCase();
  const remote=String(params.get("remote")||"").toUpperCase();
  if(stageMode&&room){connectAudience(room);return;}
  if(remote){connectRemoteController(remote,params.get("auth")||"");return;}
  db=await openDB();
  const all=await storeAll("quizzes");
  let wanted=new URLSearchParams(location.search).get("id")||localStorage.getItem("kviztogo_live_id");
  project=all.find(x=>x.id===wanted)||all[0]||null;
  if(stageMode){
   $("editorApp").hidden=true;$("stageApp").hidden=false;
   // Publika vidi samo pitanje, odgovor kada je otkriven i logo.
   if(!project){$("stageCanvas").textContent="Nema spremljenog kviza na ovom uređaju.";return;}
   ensureChannel();renderStage();
  }else{
   if(!project){
    try{project=await makeExampleQuiz();await persist();}
    catch(e){project=createQuiz();await persist();toast("Primjer još nije dostupan: "+e.message,true);}
   }
   localStorage.setItem("kviztogo_live_id",project.id);
   bindEditor();ensureChannel();await refreshSelect();renderAll();showView("home");
   $("saveStatus").textContent="✓ Spremljeno na ovom uređaju";
  }
 }catch(e){toast("Ne mogu otvoriti lokalnu bazu: "+e.message,true);if(stageMode)$("stageCanvas").textContent="Greška: "+e.message;else $("saveStatus").textContent="Spremanje nije dostupno"; }
}

/**
 * Original image has a dark rectangle baked into the pixels.
 * Keep its exact icon/lettering while turning only the near-black backdrop transparent.
 * The source is same-origin; a canvas is used instead of approximating the logo with new art.
 */
function cutOutLogoBackground(){
 const logos=[...document.querySelectorAll('img[src="kviz-uzivo-logo.webp"]')];
 if(!logos.length)return;
 const original=new Image();
 original.onload=()=>{
  try{
   const canvas=document.createElement("canvas");
   canvas.width=original.naturalWidth;canvas.height=original.naturalHeight;
   if(!canvas.width||!canvas.height)return;
   const ctx=canvas.getContext("2d",{willReadFrequently:true});
   if(!ctx)return;
   ctx.drawImage(original,0,0);
   const image=ctx.getImageData(0,0,canvas.width,canvas.height),pixels=image.data;
   const background=[1,22,34];
   for(let n=0;n<pixels.length;n+=4){
    const r=pixels[n],g=pixels[n+1],b=pixels[n+2];
    const alpha=Math.min(1,Math.max(0,(Math.max(r,g,b)-36)/62));
    if(alpha<=.02){pixels[n+3]=0;continue;}
    for(let k=0;k<3;k++)pixels[n+k]=Math.max(0,Math.min(255,Math.round((pixels[n+k]-(1-alpha)*background[k])/alpha)));
    pixels[n+3]=Math.round(255*alpha);
   }
   ctx.putImageData(image,0,0);
   const transparent=canvas.toDataURL("image/png");
   logos.forEach(logo=>{logo.src=transparent;logo.classList.add("logo-cutout");});
  }catch(error){console.warn("Logo ostaje izvoran:",error);}
 };
 original.src="kviz-uzivo-logo.webp";
}

cutOutLogoBackground();
init();
