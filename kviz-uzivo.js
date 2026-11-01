"use strict";

/* KvizToGo – zaseban lokalni urednik kvizova uživo. Bez promjena baze online pitanja. */
const ROUNDS=[
 {name:"1. KRUG",stated:24,sections:[
  {code:"povezano",name:"POVEZANO (NE)ZNANJE",desc:"Svaki odgovor je povezan s ostalima na neki način / 1 bod za svaki točan odgovor.",count:4,points:1},
  {code:"abc",name:"A, B ili C",desc:"Jednostavna pitalica sa slikama i ponuđenim odgovorima / 1 bod za svaki točan odgovor.",count:4,points:1},
  {code:"kvizoznalac",name:"KVIZOZNALAC",desc:"Pitanje za pitanjem / 1 bod za svaki točan odgovor.",count:6,points:1},
  {code:"kaladont",name:"KA - LA - DONT",desc:"Zadnja dva slova prvog odgovora su prva dva slova idućeg odgovora / 1 bod za svaki točan odgovor.",count:5,points:1},
  {code:"jucer",name:"JUČER, DANAS, SUTRA",desc:"Pitanja o aktualnostima / 1 bod za svaki točan odgovor.",count:3,points:1},
  {code:"pjevaj",name:"PJEVAJ MI PJEVAJ",desc:"Prepoznaj ime izvođača i ime pjesme / 1 bod za svaki točan odgovor.",count:1,points:2}
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
  ...(r===ROUNDS.length-1?[{kind:"thanks",r}]:[]),
  {kind:"score",r}
 ])
];
const SECTION_EXAMPLES={
 povezano:"Primjer: odgovore mogu povezivati ista boja, zanimanje ili skriveni zajednički pojam.",
 kaladont:"", // Rich Kaladont example is rendered directly, never in the old boxed format.
 slovo:"", // Rich all-on-P example is rendered using the same unboxed rubric style.
 abecedalica:"Primjer slijeda: A, B, C... Svaki sljedeći odgovor dolazi abecedno iza prethodnog."
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
const VOL_ONE_CLEANUP_KEY="ktg-keep-only-vol1-2026-11-01";
let db,project=null,position={r:0,s:0,i:0},slideIndex=0,revealed=false,showBoard=false,autoShowAnswers=false,publishTargetRound=0;
let channel=null,saveTimer=null,toastTimer=null,archivingSession=false,stageMode=new URLSearchParams(location.search).get("stage")==="1";
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
 const req=indexedDB.open(DBNAME,2);
 req.onupgradeneeded=()=>{const x=req.result;if(!x.objectStoreNames.contains("quizzes"))x.createObjectStore("quizzes",{keyPath:"id"});if(!x.objectStoreNames.contains("assets"))x.createObjectStore("assets",{keyPath:"id"});if(!x.objectStoreNames.contains("history"))x.createObjectStore("history",{keyPath:"id"});};
 req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
});}
function storeGet(store,id){return new Promise((resolve,reject)=>{const t=db.transaction(store,"readonly");const q=t.objectStore(store).get(id);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);});}
function storeAll(store){return new Promise((resolve,reject)=>{const t=db.transaction(store,"readonly");const q=t.objectStore(store).getAll();q.onsuccess=()=>resolve(q.result||[]);q.onerror=()=>reject(q.error);});}
function storePut(store,value){return new Promise((resolve,reject)=>{const t=db.transaction(store,"readwrite");t.objectStore(store).put(value);t.oncomplete=resolve;t.onerror=()=>reject(t.error||new Error("Spremanje nije uspjelo"));});}
function storeDelete(store,key){return new Promise((resolve,reject)=>{const t=db.transaction(store,"readwrite");t.objectStore(store).delete(key);t.oncomplete=resolve;t.onerror=()=>reject(t.error);});}
// Vol. 1 is stored in this browser's IndexedDB. Keep the edited copy, not a new
// template; remove other saved quizzes only after a recognizable Vol. 1 is found.
function isVolOneQuiz(q){
 const title=String(q?.title||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
 const isNamedVolOne=/\bkviz\s+opceg\s+znanja\s*(?:(?:vol(?:umen)?|br)\.?\s*)?1\b/.test(title)||
  /\bkviz\s+opceg\s+znanja\s*vol\.?\s*1\b/.test(title);
 if(isNamedVolOne||String(q?.sampleSource||"").includes("Prvi kviz dostavljen za KvizToGo"))return true;
 const section=q?.rounds?.[1]?.sections?.[4]?.items;
 return Array.isArray(section)&&
  /Veneri/i.test(String(section[0]?.question||""))&&
  /Australija/i.test(String(section[1]?.question||""));
}
async function keepOnlyVolOne(all,wantedId){
 if(localStorage.getItem(VOL_ONE_CLEANUP_KEY)==="complete")return {all,selected:null,deleted:0};
 const candidates=all.filter(isVolOneQuiz);
 if(!candidates.length)return {all,selected:null,deleted:0,notFound:all.length>0};
 // Preserve the currently selected Vol. 1 if present, otherwise the most recently edited one.
 const selected=candidates.find(q=>q.id===wantedId)||
  [...candidates].sort((a,b)=>(Number(b.updatedAt)||0)-(Number(a.updatedAt)||0))[0];
 const extra=all.filter(q=>q.id!==selected.id);
 for(const old of extra)await storeDelete("quizzes",old.id);
 localStorage.setItem(VOL_ONE_CLEANUP_KEY,"complete");
 return {all:[selected],selected,deleted:extra.length};
}
function toast(text,bad=false){const el=$("toast");el.textContent=text;el.style.background=bad?"#723242":"#24425e";el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.hidden=true,4200);}
function scheduleSave(){if(stageMode||!project)return;$("saveStatus").textContent="Spremam promjene…";clearTimeout(saveTimer);saveTimer=setTimeout(()=>persist().catch(e=>toast("Greška spremanja: "+e.message,true)),450);}
async function persist(p=project){if(!p)return;p.updatedAt=Date.now();await storePut("quizzes",p);if(!stageMode)$("saveStatus").textContent="✓ Spremljeno na ovom uređaju";}
function playedDate(time){
 const timestamp=Number(time);
 if(!Number.isFinite(timestamp)||timestamp<=0)return "Datum nije poznat";
 return new Intl.DateTimeFormat("hr-HR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(timestamp));
}
function startPlayedSession(){
 if(!project||stageMode)return;
 if(!project.playSession||project.playSession.completedAt){
  project.playSession={id:uid(),startedAt:Date.now(),completedAt:null};
  // A finished run can be replayed; preserve all question edits and score data.
  scheduleSave();
 }
}
async function archiveIfFinished(r){
 if(r!==2||!project||archivingSession)return;
 const final=publishedBoard(2);
 if(!final||!final.rows?.length)return;
 if(final.mode==="gradual"&&Number(final.revealedCount)<final.rows.length)return;
 const current=project;
 if(!current.playSession?.id){
  current.playSession={id:uid(),startedAt:Date.now(),completedAt:null};
 }
 const session=current.playSession;
 if(session.completedAt)return;
 archivingSession=true;
 try{
  const completedAt=Date.now();
  await storePut("history",{
   id:session.id,quizId:current.id,
   title:current.title||"Kviz Općeg Znanja",
   startedAt:session.startedAt||completedAt,
   completedAt,
   teams:final.rows.map(row=>({name:row.name,rounds:row.rounds,score:row.score}))
  });
  session.completedAt=completedAt;
  if(project===current)scheduleSave();
  toast("Kviz je spremljen u povijest s datumom i završnom ljestvicom.");
 }catch(error){toast("Povijest nije spremljena: "+error.message,true);}
 finally{archivingSession=false;}
}
async function renderHistory(){
 const container=$("historyList");
 if(!container||!db)return;
 const entries=(await storeAll("history")).sort((a,b)=>(Number(b.completedAt)||0)-(Number(a.completedAt)||0));
 if(!entries.length){
  container.innerHTML='<p class="history-empty">Još nema završenih kvizova. Prvi zapis nastaje nakon objave konačne ljestvice 3. kruga.</p>';
  return;
 }
 const fmt=v=>Number(v||0).toLocaleString("hr-HR",{maximumFractionDigits:2});
 container.innerHTML=entries.map(entry=>{
  const teams=Array.isArray(entry.teams)?entry.teams:[];
  return '<details class="history-entry"><summary><span><strong>'+esc(entry.title||"Kviz općeg znanja")+'</strong>'+
   '<small>'+esc(playedDate(entry.completedAt))+' · '+teams.length+' ekipa</small></span><span class="history-expand">Pogledaj poredak</span></summary>'+
   (teams.length?'<div class="history-table-wrap"><table class="history-table"><thead><tr><th>Mjesto</th><th>Ekipa</th><th>1. krug</th><th>2. krug</th><th>3. krug</th><th>Ukupno</th></tr></thead><tbody>'+
    teams.map((team,i)=>'<tr><td>'+(i+1)+'.</td><th scope="row">'+esc(team.name)+'</th>'+
     [0,1,2].map(r=>'<td>'+fmt(team.rounds?.[r])+'</td>').join("")+
     '<td>'+fmt(team.score)+'</td></tr>').join("")+'</tbody></table></div>':
    '<p class="muted">Nema spremljenih rezultata ekipa.</p>')+
   '</details>';
 }).join("");
}
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
// Results for the audience are frozen at publication time. Draft edits never update a published board.
function publishedBoard(r){
 const board=project?.publishedBoards?.[r];
 return board&&Array.isArray(board.rows)?board:null;
}
function publicBoard(r){
 const board=publishedBoard(r);
 if(!board)return {board:[],boardPending:true,boardHiddenCount:0,boardTotal:0};
 const all=board.rows,shown=board.mode==="gradual"?
  Math.min(all.length,Math.max(0,Number(board.revealedCount)||0)):all.length;
 return {
  board:all.slice(all.length-shown).map((row,i)=>({
   name:row.name,rounds:row.rounds,score:row.score,rank:all.length-shown+i+1
  })),
  boardPending:false,boardHiddenCount:all.length-shown,boardTotal:all.length
 };
}
function publishBoard(r,mode){
 if(!project||!Number.isInteger(r)||r<0||r>=ROUNDS.length)return;
 const teams=project.teams||[];
 if(!teams.length){toast("Prvo dodaj barem jednu ekipu.",true);return;}
 const existing=publishedBoard(r);
 if(mode==="gradual"&&existing?.mode==="gradual"&&existing.revealedCount<existing.rows.length){
  existing.revealedCount+=1;
 }else{
  // Start a fresh snapshot only on a new publication; never reorder mid-reveal.
  project.publishedBoards=project.publishedBoards||{};
  project.publishedBoards[r]={
   mode,rows:leaderboardRows(r),revealedCount:mode==="gradual"?1:teams.length
  };
 }
 publishTargetRound=r;
 scheduleSave();
 const scoreIndex=SLIDES.findIndex(slide=>slide.kind==="score"&&slide.r===r);
 if(scoreIndex>=0&&slideIndex!==scoreIndex)setSlideIndex(scoreIndex);
 else {showBoard=false;renderAll();}
 const state=publishedBoard(r);
 toast(mode==="all"?"Objavljena je cijela ljestvica za "+(r+1)+". krug.":
  "Otkriveno "+state.revealedCount+" / "+state.rows.length+" ekipa, od posljednjeg mjesta.");
 archiveIfFinished(r).catch(error=>toast("Povijest nije spremljena: "+error.message,true));
}
function updatePublishControls(){
 if(stageMode||!project)return;
 const selector=$("publishRound"),status=$("publishStatus"),all=$("publishAllBtn"),step=$("publishGradualBtn");
 if(!selector||!status||!all||!step)return;
 selector.value=String(publishTargetRound);
 const board=publishedBoard(publishTargetRound),n=project.teams?.length||0;
 all.disabled=step.disabled=!n;
 if(!board){
  status.textContent="Nije objavljeno. Publika ne vidi upisane bodove.";
 }else if(board.mode==="gradual"){
  status.textContent="Postupno objavljeno: "+board.revealedCount+" / "+board.rows.length+
   " ekipa, od posljednjeg mjesta. Novi upisi neće se prikazati prije nove objave.";
 }else{
  status.textContent="Objavljeno: "+board.rows.length+" ekipa. Naknadne izmjene neće se prikazati prije ponovne objave.";
 }
 step.textContent=board?.mode==="gradual"&&board.revealedCount<board.rows.length?
  "Objavi sljedeće mjesto ↑":"Objavi postupno";
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
    const slotButton=i=>{
      const item=itemAt(ri,si,i),active=position.r===ri&&position.s===si&&position.i===i;
      return '<button type="button" class="slot'+(active?' active':'')+(item?.question?.trim()?' filled':'')+'" data-r="'+ri+'" data-s="'+si+'" data-i="'+i+'" aria-label="'+esc(s.name+" "+labelItem(ri,si,i))+'">'+esc(s.code==="gameset"?(i%3+1)+".":labelItem(ri,si,i))+'</button>';
    };
    const buttons=s.code==="gameset"?
      [0,1].map(series=>'<div class="gameset-series-nav"><span class="gameset-series-caption">'+(series+1)+'. serija</span><div class="slotlist">'+
       Array.from({length:3},(_,i)=>slotButton(series*3+i)).join("")+'</div></div>').join(""):
      '<div class="slotlist">'+Array.from({length:s.count},(_,i)=>slotButton(i)).join("")+'</div>';
    return '<div class="rubric"><strong>'+esc((si+1)+". "+s.name)+'</strong>'+buttons+'</div>';
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
  answerFields+field("note",c.code==="vjerovali"?"Objašnjenje ispod točnog odgovora (vidljivo nakon otkrivanja)":"Napomena za voditelja (nije vidljiva publici)",q.note,{type:"textarea"})+
  '<label>Dodaj sliku, audio ili video<input id="mediaInput" type="file" accept="image/*,audio/*,video/*"></label>'+
  '<div class="media-status">'+mediaStatus+'</div>'+
  field("mediaUrl","Ili zalijepi javnu poveznicu na sliku, audio ili video",q.mediaUrl,{placeholder:"https://... (podržan i YouTube)"})+
  '</div>';
 $("mediaInput").addEventListener("change",uploadMedia);
 const remove=$("removeMedia");if(remove)remove.addEventListener("click",removeMedia);
}
// For "Ne zaboravi stihove", share ONLY word/letter counts before reveal,
 // never the hidden lyrics themselves.
function lyricWordLengths(answer){
 return String(answer||"").trim().split(/\s+/u)
  .map(word=>(word.match(/[\p{L}\p{N}]/gu)||[]).length)
  .filter(length=>length>0);
}
function createAnswer(r,s,i,q){
 const code=ROUNDS[r].sections[s].code;
 // Show the keyboard connection for the original sample even in older,
 // locally saved copies created before the annotations were added to JSON.
 if(r===0&&s===0&&code==="povezano"){
  const original=["Hamit Altıntop","Space Invaders","Francesco Petrarca","USS Enterprise"];
  const key=["alt","Space","esc","enter"];
  const answer=String(q.answer||"").trim();
  if(original[i]&&(answer===original[i]||answer===original[i]+" ("+key[i]+")"))
   return original[i]+" ("+key[i]+")";
 }
 if(code==="abc")return (q.correct||"A")+") "+(q.options?.[["A","B","C"].indexOf(q.correct)]||"");
 if(code==="vjerovali")return q.truth||"Točno";
 if(code==="pjevaj")return "1a. "+(q.answer||"…")+"  |  1b. "+(q.answer2||"…");
 if(code==="nabroji")return (q.five||[]).filter(x=>x?.trim()).join(" · ");
 return q.answer||"";
}
// Use the editor's accepted boundaries. Existing locally saved copies of the
// provided Guinness example can have empty fields, so honor the confirmed range.
function estimateAcceptedRange(q){
 let min=String(q.min??"").trim(),max=String(q.max??"").trim();
 if(!min&&!max&&/Guinness/i.test(q.question||"")&&/^9\s?000(?:\s+godina)?$/i.test(String(q.answer||"").trim())){
  min="8000";max="10000";
 }
 if(min===""||max==="")return "";
 const format=value=>{
  const n=Number(value);
  return Number.isFinite(n)?n.toLocaleString("hr-HR",{maximumFractionDigits:6}).replace(/\./g," "):value;
 };
 return "("+format(min)+" – "+format(max)+")";
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
function renderAll(draftScoresOnly=false){
 if(!project)return;
 if(!stageMode){
  $("quizTitle").value=project.title||"";
  renderNav();renderEditor();renderScores();renderScreen($("previewPane"),"preview");
  updateStudio();
  updatePublishControls();
 }else renderStage();
 // Unpublished score edits stay in the editor; never broadcast them to audience screens.
 if(!draftScoresOnly)pushStage();
}
function renderStage(){renderScreen($("stageCanvas"),"stage");}
function updateStudio(){
 if(stageMode||!project)return;
 const slide=currentSlide();
 const label=slide.kind==="welcome"?"Dobrodošli · pravila i početak":
  slide.kind==="round"?ROUNDS[slide.r].name+" · početak kruga":
  slide.kind==="section"?ROUNDS[slide.r].name+" · "+ROUNDS[slide.r].sections[slide.s].name+" · najava rubrike":
  slide.kind==="score"?ROUNDS[slide.r].name+" · ljestvica":
  slide.kind==="thanks"?"Završetak · Hvala vam na igri":
  ROUNDS[slide.r].name+" · "+ROUNDS[slide.r].sections[slide.s].name+
   (ROUNDS[slide.r].sections[slide.s].code==="gameset"?" · "+(Math.floor(slide.i/3)+1)+". serija, "+(slide.i%3+1)+". pitanje":"");
 $("homeQuizTitle").textContent=project.title||"Bez naziva";
 $("hostQuizTitle").textContent=project.title||"Kviz Općeg Znanja";
 $("hostQuestionLabel").textContent=label;
 $("hostCounter").textContent="Slajd "+(slideIndex+1)+" / "+SLIDES.length;
 // Highlight the current round on the presenter screen only.
 $("hostRoundJump").querySelectorAll("button[data-round-index]").forEach(button=>{
  const active=slide.r===Number(button.dataset.roundIndex);
  button.classList.toggle("active",active);
  button.setAttribute("aria-pressed",active?"true":"false");
 });
 $("prevBtn").disabled=slideIndex<=0;
 $("nextBtn").disabled=slideIndex>=SLIDES.length-1;
 $("firstSlideBtn").disabled=slideIndex===0&&!showBoard;
 $("autoShowAnswers").checked=autoShowAnswers;
 $("scoresBtn").disabled=slide.kind==="score";
 $("scoresBtn").textContent=showBoard?"Vrati slajd":"🏆 Prikaži ljestvicu";
 const canSize=slide.kind==="question"&&!showBoard;
 const size=canSize?questionScale(itemAt(slide.r,slide.s,slide.i)?.questionScale):1;
 $("questionSmaller").disabled=!canSize||size<=0.7;
 $("questionLarger").disabled=!canSize||size>=1.5;
 $("questionSizeReset").disabled=!canSize||size===1;
 $("questionSizeValue").textContent=Math.round(size*100)+" %";
}
function showView(view){
 if(stageMode)return;
 currentView=view;
 const ids={home:"homeScreen",host:"hostScreen",edit:"editScreen",manage:"manageScreen",history:"historyScreen"};
 for(const [key,id] of Object.entries(ids))$(id).hidden=key!==view;
 $("topHome").hidden=view==="home";
 if(view==="host"||view==="edit")renderAll();
 else if(view==="home")updateStudio();
 if(view==="manage")refreshSelect().catch(e=>toast(e.message,true));
 if(view==="history")renderHistory().catch(e=>toast("Ne mogu učitati povijest: "+e.message,true));
 window.scrollTo(0,0);
}
function setSlideIndex(next){
 if(next<0||next>=SLIDES.length){
  toast(next<0?"Ovo je prvi slajd.":"Stigao si do kraja kviza.");return;
 }
 slideIndex=next;
 const slide=currentSlide();
 if(Number.isInteger(slide.r))publishTargetRound=slide.r;
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
// Independent font size for every question, persisted with its other quiz data.
function questionScale(value){
 const n=Number(value);
 return Number.isFinite(n)&&n>=0.7&&n<=1.5?Math.round(n*10)/10:1;
}
function changeQuestionSize(action){
 const slide=currentSlide();
 if(!project||slide.kind!=="question"||showBoard)return;
 const q=itemAt(slide.r,slide.s,slide.i);
 if(!q)return;
 const current=questionScale(q.questionScale);
 const next=action==="reset"?1:
  Math.max(0.7,Math.min(1.5,Math.round((current+(action==="larger"?0.1:-0.1))*10)/10));
 if(next===current)return;
 q.questionScale=next;
 scheduleSave();
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
 project.teams.push({id:uid(),name,scores:{},roundScores:{}});$("teamName").value="";scheduleSave();renderAll(true);
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
   ...publicBoard(r)};
 }
 if(slide.kind==="welcome")return {
  ...base,title:"Dobrodošli!",subtitle:"Kviz općeg znanja vol. 1",
  rules:WELCOME_RULES,maxPoints:ROUNDS.reduce((sum,_,r)=>sum+roundMax(r),0),
  roundPoints:ROUNDS.map((_,r)=>roundMax(r)),ending:"Sretno svima!"
 };
 if(slide.kind==="round")return {
  ...base,roundName:ROUNDS[slide.r].name,
  maxPoints:roundMax(slide.r),
  questionCount:ROUNDS[slide.r].sections.reduce((total,section)=>total+section.count,0),
  sectionsCount:ROUNDS[slide.r].sections.length
 };
 if(slide.kind==="thanks")return {
  ...base,title:"Hvala vam na igri!",website:"KvizToGo.com"
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
 // Retain the explanation for older saved copies of this specific example quiz.
 // Only show it when all four original clues still match.
 const putinClues=section.code==="asocijacija"&&slide.i===4&&
  String(q.answer||"").trim().toLocaleLowerCase("hr-HR")==="vladimir putin"&&
  ["kgb","kremlj","judo","dresden"].every((answer,i)=>
   String(itemAt(slide.r,slide.s,i)?.answer||"").trim().toLocaleLowerCase("hr-HR")===answer);
 const putinExplanation=putinClues?
  String(q.explanation||"KGB – radio je u toj službi; Kremlj – predsjednička rezidencija; Judo – ima crni pojas; Dresden – ondje je službovao za KGB.").trim():"";
 return {
  ...base,slideType:"question",roundName:ROUNDS[slide.r].name,
  sectionTitle:rubricDisplayName(section.name),sectionCode:section.code,
  rubricQuestion:slide.i+1,rubricQuestionCount:section.count,
  seriesNumber:section.code==="gameset"?Math.floor(slide.i/3)+1:0,
  seriesQuestion:section.code==="gameset"?(slide.i%3)+1:0,
  lyricWordLengths:section.code==="stihovi"?lyricWordLengths(q.answer):[],
  question:q.question?.trim()||(section.code==="asocijacija"&&slide.i===4?"Koje je konačno rješenje?":"Ovdje upiši pitanje."),
  questionScale:questionScale(q.questionScale),
  choices:section.code==="abc"?(q.options||[]).map((t,i)=>["A","B","C"][i]+") "+(t||"…")):
   section.code==="vjerovali"?["Točno","Netočno"]:[],
  correct:revealed?(section.code==="abc"?q.correct:section.code==="vjerovali"?q.truth:""):"",
  answer:revealed?createAnswer(slide.r,slide.s,slide.i,q):"",
  truthExplanation:revealed&&section.code==="vjerovali"?String(q.note||"").trim():"",
  associationExplanation:revealed?putinExplanation:"",
  estimateRange:revealed&&section.code==="procjena"?estimateAcceptedRange(q):"",
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
   '<div class="slide-center"><div class="slide-kicker">KVIZTOGO · KVIZ OPĆEG ZNANJA</div>'+
   '<div class="slide-hero">'+esc(slide.title||"Dobrodošli!")+'</div>'+
   '<div class="slide-subtitle">'+esc(slide.subtitle||"Kviz Općeg Znanja")+'</div>'+
   '<div class="welcome-summary">3 kruga · maksimalno '+textNumber(slide.maxPoints)+' bodova</div>'+
   '<ul class="welcome-rules">'+rules+'</ul>'+
   '<div class="slide-goodluck">'+esc(slide.ending||"Sretno svima!")+'</div></div>');
  return;
 }
 if(type==="thanks"){
  root.innerHTML=inner("slide--thanks",
   '<div class="slide-center">'+
   '<div class="slide-hero thanks-hero">'+esc(slide.title||"Hvala vam na igri!")+'</div>'+
   '<div class="thanks-website" aria-label="'+esc(slide.website||"KvizToGo.com")+'">'+
    '<span class="thanks-kviz">Kviz</span><span class="thanks-to">To</span><span class="thanks-go">Go</span><span class="thanks-dotcom">.com</span></div>'+
   '</div>');
  return;
 }
 if(type==="round"){
  root.innerHTML=inner("slide--round",
   '<div class="slide-center">'+
   '<div class="slide-hero">'+esc(slide.roundName||"KRUG")+'</div>'+
   (Number.isInteger(slide.questionCount)?'<div class="rubric-question-count">('+slide.questionCount+' pitanja)</div>':'')+
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
   '</div>':
   slide.sectionCode==="premetaljka"?
   '<div class="rubric-examples" aria-label="Primjer premetaljke">'+
    '<div class="rubric-example-group">(Primjer: Ten Elite Brains - <span class="ktg-gold">Albert Einstein</span>)</div>'+
   '</div>':
   slide.sectionCode==="asocijacija"?
   '<div class="rubric-examples rubric-association-examples" aria-label="Dva primjera asocijacija">'+
    '<div class="rubric-example-group">(Primjer: Smiljan, Struja, New York, Golubovi = <span class="ktg-gold">Nikola Tesla</span>)</div>'+
    '<div class="rubric-example-group">(Primjer 2: Pijesak, Tourbillion, Ruka, Big Ben = <span class="ktg-gold">Sat</span>)</div>'+
   '</div>':
   slide.sectionCode==="abecedalica"?
   '<div class="rubric-examples" aria-label="Primjer abecednog redoslijeda">'+
    '<div class="rubric-example-group">(Primjer: <span class="ktg-gold">L</span>uka Modrić, <span class="ktg-gold">L</span>jubljana, <span class="ktg-gold">M</span>aori, <span class="ktg-gold">N</span>igdjezemska, <span class="ktg-gold">N</span>juškalo)</div>'+
   '</div>':
   slide.sectionCode==="gameover"?
   '<div class="rubric-examples" aria-label="Dva primjera igre Game Over Time">'+
    '<div class="rubric-example-group" style="color:#bd9c63"><span style="color:#edf3fb">(Primjer:</span> Deep <span class="ktg-gold">Purple</span> - <span class="ktg-gold">Purple</span> Rain = Deep <span class="ktg-gold">Purple</span> Rain)</div>'+
    '<div class="rubric-example-group" style="color:#bd9c63">(Michael <span class="ktg-gold">Owen</span> - <span class="ktg-gold">Owen</span> Wilson = Michael <span class="ktg-gold">Owen</span> Wilson)</div>'+
   '</div>':"";
  root.innerHTML=inner("slide--section",
   '<div class="slide-center">'+
   '<div class="slide-hero rubric-hero">'+esc(slide.sectionTitle||"Rubrika")+'</div>'+
   (Number.isInteger(slide.sectionQuestionCount)&&slide.sectionQuestionCount>0?
    '<div class="rubric-question-count">('+slide.sectionQuestionCount+' '+(slide.sectionQuestionCount===1?'pitanje':'pitanja')+')</div>':'')+
   '<div class="rubric-description">'+esc(slide.description||"")+'</div>'+
   (slide.sectionCode==="pjevaj"?'<div class="rubric-song-note">(1a. Ime pjesme / 1b. Ime izvođača)</div>':"")+
   (slide.sectionCode==="abc"?'<div class="rubric-instruction">Zaokruži slovo na pitanju za odgovor koji misliš da je točan.</div>':"")+
   (slide.sectionCode==="asocijacija"?'<div class="rubric-association-note">Konačno rješenje može biti bilo što.</div>':"")+
   (specialExamples|| (slide.example?'<div class="rubric-example">'+esc(slide.example)+'</div>':""))+'</div>');
  return;
 }
 if(type==="score"){
  const heads='<thead><tr><th>Ekipa</th><th>1. krug</th><th>2. krug</th><th>3. krug</th><th>Ukupno</th></tr></thead>';
  const hiddenCount=Math.max(0,Math.floor(Number(slide.boardHiddenCount)||0));
  const placeholders=Array.from({length:hiddenCount},(_,i)=>
   '<tr class="board-concealed"><th scope="row">'+(i+1)+'. ???</th><td colspan="4">Čeka se otkrivanje</td></tr>').join("");
  const rows=(slide.board||[]).map((t,i)=>
   '<tr><th scope="row">'+esc(t.rank||hiddenCount+i+1)+'. '+esc(t.name)+'</th>'+
   (t.rounds||[]).map(v=>'<td>'+(v===null||v===undefined?'—':textNumber(v))+'</td>').join("")+
   '<td class="stage-total">'+textNumber(t.score)+'</td></tr>').join("");
  const pending=!!slide.boardPending;
  root.innerHTML=inner("slide--score",
   '<div class="slide-kicker">REZULTATI · '+esc(slide.quizTitle||"KvizToGo")+'</div>'+
   '<div class="score-heading">🏆 '+esc(slide.scoreTitle||"Ljestvica")+'</div>'+
   (pending?'<div class="board-pending">Čekamo objavu rezultata…</div>':
    '<div class="stage-leaderboard-wrap"><table class="stage-leaderboard">'+heads+'<tbody>'+
    (placeholders+rows||'<tr><td colspan="5" class="empty-board">Nema ekipa za prikaz.</td></tr>')+
    '</tbody></table></div>'));
  return;
 }
 const question=String(slide.question||"");
 const fontScale=questionScale(slide.questionScale);
 const questionProgress=slide.sectionCode==="gameset"&&slide.seriesNumber&&slide.seriesQuestion?
  slide.seriesNumber+". SERIJA · PITANJE "+slide.seriesQuestion+"/3":
  Number.isInteger(slide.rubricQuestion)&&Number.isInteger(slide.rubricQuestionCount)&&slide.rubricQuestionCount>0?
   "PITANJE "+slide.rubricQuestion+"/"+slide.rubricQuestionCount:"";
 // Keep the lyric blanks on BOTH presenter and audience views, before AND after reveal.
 // Each short underline represents one letter; spaces between groups are words.
 const lyricLengths=slide.sectionCode==="stihovi"&&Array.isArray(slide.lyricWordLengths)?
  slide.lyricWordLengths.filter(n=>Number.isInteger(n)&&n>0&&n<=120):[];
 // The correct letters arrive only when the presenter reveals the answer.
 // Derive them from the existing revealed answer so no lyrics leak early.
 const lyricLetters=slide.sectionCode==="stihovi"&&slide.revealed?
  String(slide.answer||"").trim().split(/\s+/u)
   .map(word=>word.match(/[\p{L}\p{N}]/gu)||[]).filter(word=>word.length>0):[];
 const lyricBlanks=slide.sectionCode!=="stihovi"?"":lyricLengths.length?
  '<div class="lyric-blanks'+(slide.revealed?' lyric-blanks-revealed':'')+'" role="img" aria-label="'+
   (slide.revealed&&lyricLetters.length?esc(slide.answer):lyricLengths.length+' riječi: '+lyricLengths.join(", ")+' slova')+'">'+
   lyricLengths.map((length,wordIndex)=>'<span class="lyric-word" aria-hidden="true">'+
    Array.from({length},(_,letterIndex)=>'<span class="lyric-letter">'+
     (slide.revealed?esc(lyricLetters[wordIndex]?.[letterIndex]||""):"")+'</span>').join("")+
    '</span>').join("")+'</div>':
  '<div class="lyric-blanks-missing">Za prikaz crtica prvo upiši odgovor u uređivaču.</div>';
 // Every question has a fixed font size for its screen, regardless of character count.
 // The CSS also keeps ABC options at that same size.
 const choices=(slide.choices||[]).map(t=>{
  const isCorrect=!!slide.revealed&&!!slide.correct&&
   (String(t).startsWith(slide.correct+")")||String(t)===slide.correct);
  return '<div class="screen-choice'+(isCorrect?" correct":"")+'">'+esc(t)+'</div>';
 }).join("");
 root.innerHTML=inner("slide--question",
  '<div class="screen-head"><span>'+esc(slide.roundName||"")+'</span><strong>'+esc(slide.sectionTitle||"")+'</strong>'+
   (questionProgress?'<div class="rubric-question-progress">'+esc(questionProgress)+'</div>':"")+'</div>'+
  '<div class="screen-body" style="--question-scale:'+fontScale+'"><div class="screen-title question-fixed">'+esc(question)+'</div>'+
  lyricBlanks+
  (choices?'<div class="screen-choices'+(slide.sectionCode==="abc"?" abc-choices":"")+'">'+choices+'</div>':"")+
  '<div class="screen-media"></div>'+
  (slide.revealed&&slide.sectionCode!=="stihovi"?'<div class="screen-answer">'+esc(slide.answer||"Odgovor još nije upisan.")+'</div>':"")+
  (slide.revealed&&slide.sectionCode==="vjerovali"&&slide.truthExplanation?
   '<div class="truth-answer-note">('+esc(slide.truthExplanation)+')</div>':"")+
  (slide.revealed&&slide.sectionCode==="asocijacija"&&slide.associationExplanation?
   '<div class="association-answer-note">('+esc(slide.associationExplanation)+')</div>':"")+
  (slide.revealed&&slide.sectionCode==="procjena"&&slide.estimateRange?
   '<div class="estimate-accepted-range"><span>Priznaje se raspon:</span> '+esc(slide.estimateRange)+'</div>':"")+
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
   else if(action==="font-smaller")changeQuestionSize("smaller");
   else if(action==="font-larger")changeQuestionSize("larger");
   else if(action==="font-auto")changeQuestionSize("reset");
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
   const canChangeSize=slide.slideType==="question"&&!slide.showBoard;
   const size=questionScale(slide.questionScale);
   $("remoteQuestionSmaller").disabled=!canChangeSize||size<=0.7;
   $("remoteQuestionLarger").disabled=!canChangeSize||size>=1.5;
   $("remoteQuestionAuto").disabled=!canChangeSize||size===1;
   $("remoteQuestionSizeValue").textContent=Math.round(size*100)+" %";
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
 $("remoteQuestionSmaller").addEventListener("click",()=>KTGSync.sendCommand("font-smaller"));
 $("remoteQuestionLarger").addEventListener("click",()=>KTGSync.sendCommand("font-larger"));
 $("remoteQuestionAuto").addEventListener("click",()=>KTGSync.sendCommand("font-auto"));
}
async function copyLink(id){
 const input=$(id);
 if(!input?.value)return;
 try{await navigator.clipboard.writeText(input.value);toast("Poveznica kopirana.");}
 catch{input.focus();input.select();toast("Označena poveznica. Kopiraj je ručno.");}
}

function bindEditor(){
 $("topHome").addEventListener("click",()=>showView("home"));
 $("startBtn").addEventListener("click",()=>{startPlayedSession();showView("host");});
 $("manageBtn").addEventListener("click",()=>showView("manage"));
 $("historyBtn").addEventListener("click",()=>showView("history"));
 $("backHostHistory").addEventListener("click",()=>showView("home"));
 $("hostManageBtn").addEventListener("click",()=>showView("manage"));
 $("openEditorBtn").addEventListener("click",()=>showView("edit"));
 $("backHostEdit").addEventListener("click",()=>showView("host"));
 $("backHostManage").addEventListener("click",()=>showView("host"));
 $("manageOpenBtn").addEventListener("click",()=>{startPlayedSession();showView("host");});
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
 $("hostRoundJump").addEventListener("click",e=>{
  const button=e.target.closest("button[data-round-index]");
  if(!button)return;
  const round=Number(button.dataset.roundIndex);
  if(!Number.isInteger(round)||round<0||round>=ROUNDS.length)return;
  const index=SLIDES.findIndex(slide=>slide.kind==="round"&&slide.r===round);
  if(index>=0)setSlideIndex(index);
 });
 $("firstSlideBtn").addEventListener("click",()=>{if(slideIndex!==0||showBoard)setSlideIndex(0);});
 $("questionSmaller").addEventListener("click",()=>changeQuestionSize("smaller"));
 $("questionLarger").addEventListener("click",()=>changeQuestionSize("larger"));
 $("questionSizeReset").addEventListener("click",()=>changeQuestionSize("reset"));
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
 $("publishRound").addEventListener("change",e=>{
  const r=Number(e.target.value);
  if(Number.isInteger(r)&&r>=0&&r<ROUNDS.length){publishTargetRound=r;updatePublishControls();}
 });
 $("publishAllBtn").addEventListener("click",()=>publishBoard(publishTargetRound,"all"));
 $("publishGradualBtn").addEventListener("click",()=>publishBoard(publishTargetRound,"gradual"));
 $("addTeam").addEventListener("click",addTeam);
 $("teamName").addEventListener("keydown",e=>{if(e.key==="Enter")addTeam();});
 $("teamScores").addEventListener("change",e=>{const el=e.target.closest("select[data-team]");if(!el)return;const t=project.teams.find(x=>x.id===el.dataset.team);if(!t)return;t.scores[keyOf(position.r,position.s,position.i)]=Number(el.value);scheduleSave();renderAll(true);});
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
  scheduleSave();renderAll(true);
 });
 $("roundScores").addEventListener("click",e=>{
  const btn=e.target.closest("button[data-remove-team]");if(!btn)return;
  const t=project.teams.find(x=>x.id===btn.dataset.removeTeam);
  if(!t||!confirm("Ukloniti ekipu "+t.name+"?"))return;
  project.teams=project.teams.filter(x=>x.id!==t.id);
  scheduleSave();renderAll(true);
 });
 $("resetScores").addEventListener("click",()=>{if(!confirm("Poništiti sve bodove svih ekipa?"))return;project.teams.forEach(t=>{t.scores={};t.roundScores={};});scheduleSave();renderAll(true);});
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
  let all=await storeAll("quizzes");
  let wanted=new URLSearchParams(location.search).get("id")||localStorage.getItem("kviztogo_live_id");
  let cleanup={deleted:0};
  if(!stageMode){
   cleanup=await keepOnlyVolOne(all,wanted);
   all=cleanup.all;
  }
  project=cleanup.selected||all.find(x=>x.id===wanted)||all[0]||null;
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
   $("saveStatus").textContent=cleanup.deleted?
    "✓ Vol. 1 sačuvan, uklonjeno ostalih kvizova: "+cleanup.deleted:
    "✓ Spremljeno na ovom uređaju";
   if(cleanup.notFound)toast("Vol. 1 nije pouzdano prepoznat. Radi sigurnosti drugi kvizovi nisu obrisani.",true);
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
