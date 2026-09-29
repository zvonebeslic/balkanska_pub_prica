'use strict';
const LANG_KEY='kviztogo_lang';
let currentLang=localStorage.getItem(LANG_KEY)==='en'?'en':'hr';
const I18N={
hr:{
pageTitle:'Multiplayer | KvizToGo',back:'Natrag',languageToEnglish:'Promijeni jezik na engleski',languageToCroatian:'Promijeni jezik na hrvatski',
heroTitle:'Multiplayer',heroCopy:'Multiplayer način igranja kviza. 10 pitanja po setu. 10 sekundi po pitanju.',
meReady:'Spreman',opponentUnknown:'?',opponentNotFound:'Protivnik još nije pronađen',questionsReady:'Pitanja spremna',findOpponent:'Traži protivnika',playFriends:'Igraj s prijateljima',
aiNote:'Ako naš sustav ne pronađe stvarnog protivnika, u igru se uključuje AI generirani protivnik kako bi se izbjeglo duže čekanje.',
waitingStart:'Čekamo početak…',historyTitle:'Rezultati & povijest',downloadHistory:'📥 Preuzmi cijelu odigranu povijest',
downloadHistoryNote:'Sva pitanja i odgovori iz trenutačne partije spremit će se u jednu dugu PNG sliku.',shareResult:'📤 Podijeli rezultat',
rematch:'Revanš',newOpponent:'Novi protivnik',backQuiz:'Natrag',
searching:'Tražimo protivnika…',queue:'U redu čekanja',searchButton:'Tražim…',checkingQueue:'provjeravamo red čekanja',searchError:'Greška pri spajanju. Pokušaj ponovno.',
preparingInvite:'Pripremam poveznicu…',waiting:'Čekamo…',friendNotJoined:'prijatelj još nije ušao',preparingInviteMeta:'Pripremamo pozivnicu',creatingPrivate:'Kreiramo privatni 1 na 1…',
inviteError:'Pozivnicu nije moguće napraviti. Pokušaj ponovno.',inviteTitle:'KvizToGo 1 na 1',inviteMessage:'Pridruži mi se u kvizu 1 na 1 na KvizToGo! 🧠⚔️\n10 pitanja, 10 sekundi po pitanju. Tko zna više?\n{url}',
inviteCardCta:'PRIDRUŽI MI SE 1 NA 1',inviteCardRules:'10 pitanja  •  10 sekundi po pitanju',inviteCardQuestion:'Tko zna više?',inviteCardButton:'OTVORI POVEZNICU I IGRAJ',
inviteCopied:'Poveznica za prijatelja je kopirana.',joining:'Pridružujem…',findingFriend:'Tražimo prijatelja…',checkingInvite:'provjeravamo pozivnicu',joiningQuiz:'Pridružujemo te 1 na 1 kvizu…',
ownInvite:'Ovo je tvoja vlastita pozivnica.',inviteExpired:'Pozivnica više nije aktivna.',inviteOpenError:'Pozivnicu nije moguće otvoriti.',
opponentFound:'Protivnik pronađen',ready:'Spreman ✓',waitingYourStart:'Čeka tvoj start',waitingOpponentStart:'Čeka da pokrene kviz',startQuiz:'Kreni s kvizom',
waitingOpponentClick:'Čekamo da protivnik klikne Kreni s kvizom…',waitingOpponent:'Čekamo protivnika…',connectionLost:'Protivnik je izgubio vezu. Čekamo da se vrati…',connectionLostMeta:'Veza prekinuta',
friendWaiting:'Čekamo da se prijatelj pridruži…',inviteActive:'Pozivnica aktivna',waitingFriend:'Čekamo prijatelja…',shareAgain:'Podijeli ponovno',
multiplayer:'Multiplayer',bothReady:'Oba igrača su spremna.',answerLocked:'Odgovor zaključan. Čekamo protivnika…',opponentAnswered:'Protivnik je odgovorio.',answerBeforeTime:'Odgovori prije isteka vremena.',
correctAnswer:'Točan odgovor:',win:'🏆 Pobjeda!',disconnectWin:'Protivnik se nije vratio u igru pa pobjeda pripada tebi.',duelFinished:'Dvoboj je završen',disconnectLoss:'Nisi se vratio u igru unutar dopuštenog vremena.',
duelInterrupted:'Dvoboj prekinut',opponentLeft:'Protivnik je napustio dvoboj.',duelInactive:'Dvoboj više nije aktivan.',questionIn:'Pitanje za {sec} sekundi…',
historyEmpty:'Odigrana pitanja pojavit će se ovdje.',noAnswer:'nije odgovorio',correctTag:t('correctTag'),victory:'🏆 Pobjeda!',victoryText:'Pobijedio si {opponent}.',
opponentWins:'Protivnik pobjeđuje',opponentBetter:'{opponent} je ovaj put bio bolji.',draw:'🤝 Neriješeno',drawText:'Potpuno izjednačen dvoboj.',
preparingQuestions:'Pripremam pitanja…',questionsLoadError:'Pitanja nije moguće učitati.',opponentThinking:'{opponent} razmišlja…',wrongOpponentCan:'Netočno. Protivnik još može odgovoriti.',
opponentWrong:'{opponent} je pogriješio. Još možeš odgovoriti.',feedback:'Pohvale/primjedbe',likeTitle:'Sviđa mi se pitanje',dislikeTitle:'Ne sviđa mi se pitanje',
voteSaved:'Ocjena spremljena.',voteError:'Ocjena nije spremljena. Pokušaj ponovno.',feedbackTitle:'Pronašli ste grešku ili možete poboljšati pitanje? Pišite nam ovdje.',
feedbackPlaceholder:'Napiši primjedbu, ispravak ili prijedlog...',send:'Pošalji',feedbackNote:'Poruka će biti poslana izravno KvizToGo timu.',writeMessage:'Prvo napiši poruku.',
supabaseUnavailable:'Supabase nije dostupan.',sending:'Šaljem...',feedbackThanks:'Hvala na povratnim informacijama!',feedbackReceived:'Vaša poruka je uspješno zaprimljena.',feedbackError:'Poruka nije poslana. Pokušaj ponovno.',
sharePrompt:'Sjetili ste se nekoga na ovom pitanju? Pošaljite mu i provjerite zna li odgovor.',sendQuestion:'📤 Pošalji pitanje',challenge:'MOŽEŠ LI ODGOVORITI?',
questionShareFooter:'Pošalji prijatelju i provjeri zna li odgovor.',questionShareText:'Možeš li odgovoriti na ovo pitanje?\n\nSjetio/la sam te se baš na ovom pitanju 😄\nOdigraj i ti na KvizToGo i provjeri svoje znanje:\nhttps://kviztogo.com/online-kviz',
questionReady:'Pitanje je spremno za slanje.',questionSaved:'Slika pitanja je spremljena.',quizLinkCopied:'Poveznica za kviz je kopirana.',
historyImageTitle:'Multiplayer · odigrana povijest',playedAgainst:'{me} protiv {opponent}',historySaved:'Cijela odigrana povijest spremljena je kao PNG slika.',nothingPlayed:t('nothingPlayed'),
resultHeading:'MULTIPLAYER REZULTAT',goodFight:'DOBRA BORBA',resultWin:'POBJEDA',resultDraw:'NERIJEŠENO',resultCta:'Misliš da možeš bolje? Pridruži se multiplayer kvizu.',
resultShareText:'Upravo sam odigrao/la KvizToGo 1 na 1: {me} {meScore} : {oppScore} {opponent}. 🧠⚔️\n\nPridruži se multiplayer kvizu:\nhttps://kviztogo.com/multiplayer.html',
resultTitle:'Moj KvizToGo multiplayer rezultat',resultReady:'Rezultat je spreman za dijeljenje.',resultSaved:'Slika rezultata je spremljena.',resultShareError:t('resultShareError'),
guest:'Gost'
},
en:{
pageTitle:'Multiplayer | KvizToGo',back:'Back',languageToEnglish:'Switch language to English',languageToCroatian:'Switch language to Croatian',
heroTitle:'Multiplayer',heroCopy:'Play multiplayer quizzes. 10 questions per match. 10 seconds per question.',
meReady:'Ready',opponentUnknown:'?',opponentNotFound:'Opponent has not been found yet',questionsReady:'Questions ready',findOpponent:'Find opponent',playFriends:'Play with friends',
aiNote:'If our system cannot find a real opponent, an AI-generated opponent joins the game so you do not have to wait too long.',
waitingStart:'Waiting to start…',historyTitle:'Results & history',downloadHistory:'📥 Download full played history',
downloadHistoryNote:'All questions and answers from the current match will be saved as one long PNG image.',shareResult:'📤 Share result',
rematch:'Rematch',newOpponent:'New opponent',backQuiz:'Back',
searching:'Finding an opponent…',queue:'In matchmaking queue',searchButton:'Searching…',checkingQueue:'checking the matchmaking queue',searchError:'Could not connect. Try again.',
preparingInvite:'Preparing link…',waiting:'Waiting…',friendNotJoined:'your friend has not joined yet',preparingInviteMeta:'Preparing invitation',creatingPrivate:'Creating a private 1v1…',
inviteError:'Could not create the invitation. Try again.',inviteTitle:'KvizToGo 1v1',inviteMessage:'Join me for a 1v1 quiz on KvizToGo! 🧠⚔️\n10 questions, 10 seconds per question. Who knows more?\n{url}',
inviteCardCta:'JOIN ME FOR A 1V1 QUIZ',inviteCardRules:'10 questions  •  10 seconds per question',inviteCardQuestion:'Who knows more?',inviteCardButton:'OPEN THE LINK AND PLAY',
inviteCopied:'The friend link has been copied.',joining:'Joining…',findingFriend:'Finding your friend…',checkingInvite:'checking the invitation',joiningQuiz:'Joining the 1v1 quiz…',
ownInvite:'This is your own invitation.',inviteExpired:'This invitation is no longer active.',inviteOpenError:'The invitation could not be opened.',
opponentFound:'Opponent found',ready:'Ready ✓',waitingYourStart:'Waiting for you to start',waitingOpponentStart:'Waiting to start the quiz',startQuiz:'Start quiz',
waitingOpponentClick:'Waiting for your opponent to click Start quiz…',waitingOpponent:'Waiting for opponent…',connectionLost:'Opponent lost connection. Waiting for them to return…',connectionLostMeta:'Connection lost',
friendWaiting:'Waiting for your friend to join…',inviteActive:'Invitation active',waitingFriend:'Waiting for friend…',shareAgain:'Share again',
multiplayer:'Multiplayer',bothReady:'Both players are ready.',answerLocked:'Answer locked. Waiting for opponent…',opponentAnswered:'Opponent answered.',answerBeforeTime:'Answer before time runs out.',
correctAnswer:'Correct answer:',win:'🏆 Victory!',disconnectWin:'Your opponent did not return, so you win the match.',duelFinished:'Match finished',disconnectLoss:'You did not return to the match within the allowed time.',
duelInterrupted:'Match interrupted',opponentLeft:'Your opponent left the match.',duelInactive:'The match is no longer active.',questionIn:'Question in {sec} seconds…',
historyEmpty:'Played questions will appear here.',noAnswer:'no answer',correctTag:'CORRECT ANSWER',victory:'🏆 Victory!',victoryText:'You beat {opponent}.',
opponentWins:'Opponent wins',opponentBetter:'{opponent} was better this time.',draw:'🤝 Draw',drawText:'A completely even match.',
preparingQuestions:'Preparing questions…',questionsLoadError:'Questions could not be loaded.',opponentThinking:'{opponent} is thinking…',wrongOpponentCan:'Incorrect. Your opponent can still answer.',
opponentWrong:'{opponent} answered incorrectly. You can still answer.',feedback:'Feedback',likeTitle:'I like this question',dislikeTitle:'I do not like this question',
voteSaved:'Rating saved.',voteError:'Rating was not saved. Try again.',feedbackTitle:'Found an error or have a way to improve this question? Tell us here.',
feedbackPlaceholder:'Write a correction, comment or suggestion...',send:'Send',feedbackNote:'Your message will be sent directly to the KvizToGo team.',writeMessage:'Write a message first.',
supabaseUnavailable:'Supabase is unavailable.',sending:'Sending...',feedbackThanks:'Thanks for the feedback!',feedbackReceived:'Your message was received successfully.',feedbackError:'Message was not sent. Try again.',
sharePrompt:'Did this question remind you of someone? Send it and see if they know the answer.',sendQuestion:'📤 Send question',challenge:'CAN YOU ANSWER?',
questionShareFooter:'Send it to a friend and see if they know the answer.',questionShareText:'Can you answer this question?\n\nThis question made me think of you 😄\nPlay KvizToGo too and put your knowledge to the test:\nhttps://kviztogo.com/online-kviz',
questionReady:'The question is ready to send.',questionSaved:'The question image was saved.',quizLinkCopied:'The quiz link was copied.',
historyImageTitle:'Multiplayer · played history',playedAgainst:'{me} vs {opponent}',historySaved:'The full played history was saved as a PNG image.',nothingPlayed:'There are no played questions yet.',
resultHeading:'MULTIPLAYER RESULT',goodFight:'GOOD FIGHT',resultWin:'VICTORY',resultDraw:'DRAW',resultCta:'Think you can do better? Join a multiplayer quiz.',
resultShareText:'I just played a KvizToGo 1v1: {me} {meScore} : {oppScore} {opponent}. 🧠⚔️\n\nJoin the multiplayer quiz:\nhttps://kviztogo.com/multiplayer.html',
resultTitle:'My KvizToGo multiplayer result',resultReady:'Your result is ready to share.',resultSaved:'The result image was saved.',resultShareError:'The result could not be shared.',
guest:'Guest'
}
};
function t(key,vars={}){let value=I18N[currentLang]?.[key]??I18N.hr[key]??key;for(const[name,replacement]of Object.entries(vars))value=value.replaceAll('{'+name+'}',String(replacement));return value}
function applyLanguage(lang){
  currentLang=lang==='en'?'en':'hr';localStorage.setItem(LANG_KEY,currentLang);document.documentElement.lang=currentLang;document.title=t('pageTitle');
  document.querySelectorAll('[data-i18n]').forEach(el=>el.textContent=t(el.dataset.i18n));
  document.querySelectorAll('[data-i18n-aria-label]').forEach(el=>el.setAttribute('aria-label',t(el.dataset.i18nAriaLabel)));
  const b=$('language-cycle-btn');if(b){b.dataset.currentLang=currentLang;b.setAttribute('aria-label',currentLang==='hr'?t('languageToEnglish'):t('languageToCroatian'))}
  if(state?.match_id)handle(state);else if(!botMode&&!friendCode)resetLobby()
}

const SB='https://hssfjguysejbosvholqu.supabase.co',KEY='sb_publishable_1wlZVov1csReXuZEgcuInA_7F7_gzIy',RECENT='kviztogo_multiplayer_recent_v2';
const LEADER_BOT_NAMES=["7Ivan","4Ana","9Marko","Јово","Стефан","Светлана","Nikola5","Ivana2","Matej1","Lucija7","Filip23","Ema64","Josip18","Sara27","Karlo91","Lea42","David76","Iva35","Lovro58","Nina84","Ivan Horvat317","Petra Marić204","Luka Kovač731","Ana Babić418","Marko Jurić592","Marta Novak163","Filip Radić826","Sara Perić305","Nikola Barišić714","Lucija Matić249","ČudniKljun","SjenaSaŠanka","TrećiPokušaj","KaktusNaKvadrat","BezGooglea","KasniOdgovor","PlaviToster","MozakNaPauzi","MaliOrakul","KriviKontinent","TihiAlarm","ZadnjaKlupa","PetaBrzina","PolaBoda","NoćnaSova","KavaBezŠećera","LijeviKlik","ZeleniFenjer","MorskiKrastavac","NultiMeridijan","PogrešanPlanet","ŠestiOsjećaj","DvaPromilaZnanja","RezervniMozak","SlučajniGenij","KraljTipfelera","ČetvrtiOdgovor","PitajSusjeda","BezPojmaAliBrzo","TkoJeOvo","KrumpirProfesor","GospodinMožda","AjdeC","NisamUčio","BurekLogika","KvizniPuž","PametniĆevap","ČekajZnam","MaloSutra","JošJednoPaIdem","NijeA","SigurnoB","MoždaC","ProfesoricaKava","TriSekundeKasnije","KvizniJež","ZaboravniLav","PonedjeljakMozak","SubotnjiGenije","TetaWikipedia","KvizMaster","LovacNaBodove","Mozgalo","Kvizoman","Znalac","Pitanjolovac","BrziPrst","PubKvizVeteran","Enciklopedist","KvizNindža","BodPoBod","TridesetPitanja","FinalniOdgovor","BezDžokera","LovacNaTrideset","KvizKompas","TihiZnalac","MozakUTrećoj","KvizRudar","TočanOdgovor"],BOT_GROUPS=[["excellent",8,12,20,[180,300]],["veryGood",17,10,19,[210,360]],["average",30,7,17,[270,480]],["sufficient",20,5,14,[330,570]],["bad",15,3,10,[420,660]],["veryBad",10,2,7,[480,720]]],MP_BOT_ALIASES=["Roko27","Mia","Toni","Lara","Dino","Nera","Vito","Ena28","Noa","Mara","Leo","Una","Jakov","Tara","Niko29","Lana","Tin","Klara","Teo","Nika","Ivor","EmaQ30","Marin","PetraQ","LukaQ","SaraQ","Vid","IvaQ","Borna31","TeaQ","Jan","Lena","KarloQ","Mila","LovroQ","NinaQ32","DavidQ","LucijaQ","FilipQ","AnaQ","MarkoQ","MatejQ","NikolaQ33","JosipQ","LeaQ","EvaQ","Fran","Tena","Maks","Lota34","Roko83","Mia30","Toni67","Lara14","Dino51","Nera88","Vito35","Ena72","Noa19","Mara56","Leo93","Una40","Jakov77","Tara24","Niko61","Lana98","Tin45","Klara82","Teo29","Nika66","Ivor13","EmaQ50","Marin87","PetraQ34","LukaQ71","SaraQ18","Vid55","IvaQ92","Borna39","TeaQ76","Jan23","Lena60","KarloQ97","Mila44","LovroQ81","NinaQ28","DavidQ65","LucijaQ12","FilipQ49","AnaQ86","MarkoQ33","MatejQ70","NikolaQ17","JosipQ54","LeaQ91","EvaQ38","Fran75","Tena22","Maks59","Lota96"];
function profileHash(v){let r=2166136261;for(let i=0;i<v.length;i++){r^=v.charCodeAt(i);r=Math.imul(r,16777619)}return r>>>0}
function profileRng(seed){let v=profileHash(seed)||1;return()=>{v+=0x6d2b79f5;let r=v;r=Math.imul(r^(r>>>15),r|1);r^=r+Math.imul(r^(r>>>7),r|61);return((r^(r>>>14))>>>0)/4294967296}}
function buildMpBotProfiles(){let gi=0,u=0;return LEADER_BOT_NAMES.map((name,i)=>{while(gi<BOT_GROUPS.length-1&&u>=BOT_GROUPS[gi][1]){gi++;u=0}const g=BOT_GROUPS[gi];u++;const r=profileRng('demo-profile:'+i+':'+name.replace(/\d+$/,''));return{id:'demo-'+String(i+1).padStart(3,'0'),leaderName:name,alias:MP_BOT_ALIASES[i],skill:g[0],min:g[2],max:g[3],base:g[4],daypart:Math.floor(r()*10),cons:.35+r()*.6,bias:r()}})}
const MP_BOT_PROFILES=buildMpBotProfiles();
const MP_SKILL_ACCURACY={excellent:[.84,.94],veryGood:[.72,.86],average:[.53,.70],sufficient:[.40,.57],bad:[.25,.41],veryBad:[.13,.29]};
function mpBotAccuracy(p){const[a,b]=MP_SKILL_ACCURACY[p.skill]||[.45,.65],x=Math.max(0,Math.min(1,.58*p.cons+.42*p.bias));return a+(b-a)*x}
function mpBotDelay(p){const mid=(p.base[0]+p.base[1])/2,perQ=mid/30,speed=Math.max(0,Math.min(1,(perQ-8)/12)),center=6100+speed*3000,spread=260+(1-p.cons)*1050;return Math.max(6000,Math.min(9700,Math.round(center+(Math.random()-.5)*2*spread)))}
const supabaseClient=window.supabase&&typeof window.supabase.createClient==='function'?window.supabase.createClient(SB,KEY):null;
let state=null,pollTimer=null,tickTimer=null,botMode=false,bot=null,botQuestions=[],botPos=0,botMe=0,botScore=0,botHistory=[],botRoundTimer=null,botAnswerTimer=null,botStart=0,botMyChoice=null,botChoice=null,botMeAnswered=false,botOppAnswered=false,friendCode=null,botPreparing=false,botSessionId=null,historyRenderSignature='';const questionVotes=new Map();
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

function myName(){try{return localStorage.getItem('kviztogo_username')||localStorage.getItem('username')||localStorage.getItem('guestName')||localStorage.getItem('guest_name')||t('guest')}catch{return t('guest')}}
function uuid(){return crypto.randomUUID()}
function token(){let t=localStorage.getItem('kviztogo_mp_token_v3');if(!t||!/^[a-f0-9-]{36}\.[a-f0-9-]{36}$/.test(t)){t=uuid()+'.'+uuid();localStorage.setItem('kviztogo_mp_token_v3',t)}return t}
function recent(){try{let a=JSON.parse(localStorage.getItem(RECENT)||'[]');return Array.isArray(a)?a.slice(-2000):[]}catch{return[]}}
function remember(ids){try{localStorage.setItem(RECENT,JSON.stringify(recent().concat(ids).slice(-2000)))}catch{}}
async function api(action,payload={}){let r=await fetch(SB+'/rest/v1/rpc/multiplayer_v3',{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({p_token:token(),p_action:action,p_payload:payload})});if(!r.ok)throw new Error(await r.text());return r.json()}
function stopPoll(){clearInterval(pollTimer);pollTimer=null}
function startPoll(){stopPoll();pollTimer=setInterval(()=>refresh('poll').catch(()=>{}),500)}
function showLobby(){ $('game').classList.add('hidden');$('lobby').classList.remove('hidden') }
function showGame(){ $('lobby').classList.add('hidden');$('game').classList.remove('hidden');$('meGame').textContent=state?.me_name||myName();$('oppGame').textContent=state?.opponent_name||bot?.name||'Protivnik' }
function resetLobby(){stopPoll();clearInterval(tickTimer);clearTimeout(botRoundTimer);clearTimeout(botAnswerTimer);state=null;botMode=false;botPreparing=false;friendCode=null;botSessionId=null;historyRenderSignature='';showLobby();$('meMeta').textContent=t('meReady');$('oppName').textContent=t('opponentUnknown');$('oppMeta').textContent=t('opponentNotFound');$('search').innerHTML=esc(t('questionsReady'))+' <span class="ready-mark">✓</span>';$('find').textContent=t('findOpponent');$('find').disabled=false;$('find').onclick=findOpponent;$('friend').textContent=t('playFriends');$('friend').disabled=false;$('friend').onclick=createFriendInvite}

async function findOpponent(){
  if($('find').disabled)return;
  $('find').disabled=true;$('friend').disabled=true;$('find').textContent=t('searchButton');$('oppName').textContent=t('searching');$('oppMeta').textContent=t('checkingQueue');$('meMeta').textContent=t('queue');$('search').textContent=t('searching');
  try{state=await api('join',{name:myName(),recent:recent()});handle(state);startPoll()}
  catch(e){$('search').textContent=t('searchError');$('find').disabled=false;$('friend').disabled=false;$('find').textContent=t('findOpponent')}
}

async function createFriendInvite(){
  if($('friend').disabled)return;
  $('friend').disabled=true;$('find').disabled=true;$('friend').textContent=t('preparingInvite');$('oppName').textContent=t('waiting');$('oppMeta').textContent=t('friendNotJoined');$('meMeta').textContent=t('preparingInviteMeta');$('search').textContent=t('creatingPrivate');
  try{
    state=await api('create_invite',{name:myName(),recent:recent()});
    if(state.status!=='invite_waiting'||!state.invite_code)throw new Error('invite');
    friendCode=state.invite_code;handle(state);startPoll();await shareFriendInvite(friendCode)
  }catch(e){$('search').textContent=t('inviteError');$('find').disabled=false;$('friend').disabled=false;$('friend').textContent='Igraj s prijateljima'}
}

function inviteUrl(code){let u=new URL(location.href);u.search='';u.hash='';u.searchParams.set('invite',code);return u.toString()}
function inviteMessage(url){return t('inviteMessage',{url})}
function inviteCanvas(){
  const c=document.createElement('canvas');c.width=1080;c.height=1350;const x=c.getContext('2d');
  const g=x.createRadialGradient(760,260,30,760,260,760);g.addColorStop(0,'#153b74');g.addColorStop(.48,'#0f2038');g.addColorStop(1,'#0b1220');x.fillStyle=g;x.fillRect(0,0,c.width,c.height);
  x.fillStyle='rgba(22,34,53,.94)';x.strokeStyle='rgba(47,128,255,.65)';x.lineWidth=4;x.beginPath();x.roundRect(80,105,920,1140,48);x.fill();x.stroke();
  x.font='900 94px Arial';x.textBaseline='top';x.fillStyle='#fff';x.fillText('Kviz',150,165);let a=x.measureText('Kviz').width;x.fillStyle='#2f80ff';x.fillText('To',150+a,165);a+=x.measureText('To').width;x.fillStyle='#22c55e';x.fillText('Go',150+a,165);
  x.textAlign='center';x.fillStyle='#fff';x.font='900 92px Arial';x.fillText('1 NA 1',540,395);
  x.font='800 48px Arial';x.fillText(t('inviteCardCta'),540,535);
  x.fillStyle='#a8b3c7';x.font='700 35px Arial';x.fillText(t('inviteCardRules'),540,650);
  x.fillStyle='#facc15';x.font='900 54px Arial';x.fillText(t('inviteCardQuestion'),540,800);
  x.fillStyle='#2f80ff';x.beginPath();x.roundRect(220,965,640,112,56);x.fill();x.fillStyle='#fff';x.font='900 40px Arial';x.fillText(t('inviteCardButton'),540,995);
  x.fillStyle='#a8b3c7';x.font='600 28px Arial';x.fillText('KvizToGo Multiplayer',540,1155);x.textAlign='left';return c
}
function canvasBlob(c){return new Promise(r=>c.toBlob(r,'image/png',1))}
async function shareFriendInvite(code){
  const url=inviteUrl(code),msg=inviteMessage(url);
  try{
    const blob=await canvasBlob(inviteCanvas()),file=new File([blob],'KvizToGo-1-na-1.png',{type:'image/png'});
    if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({title:t('inviteTitle'),text:msg,files:[file]});return}
    if(navigator.share){await navigator.share({title:t('inviteTitle'),text:msg});return}
    await navigator.clipboard.writeText(msg);alert(t('inviteCopied'))
  }catch(e){}
}

async function joinFriendInvite(code){
  showLobby();$('find').disabled=true;$('friend').disabled=true;$('find').textContent=t('joining');$('oppName').textContent=t('findingFriend');$('oppMeta').textContent=t('checkingInvite');$('meMeta').textContent=t('joining');$('search').textContent=t('joiningQuiz');
  try{
    state=await api('join_invite',{code:String(code).toUpperCase(),name:myName(),recent:recent()});
    if(state.status==='invite_invalid'||state.status==='invite_self'){
      $('search').textContent=state.status==='invite_self'?t('ownInvite'):t('inviteExpired');
      history.replaceState({},'',location.pathname);$('find').disabled=false;$('friend').disabled=false;$('find').textContent=t('findOpponent');$('find').onclick=findOpponent;return
    }
    handle(state);startPoll()
  }catch(e){$('search').textContent=t('inviteOpenError');$('find').disabled=false;$('friend').disabled=false}
}

async function refresh(action='state'){state=await api(action,{});handle(state)}

function setupReadyLobby(s){
  showLobby();$('oppName').textContent=s.opponent_name||t('opponentFound');$('friend').disabled=true;
  if(s.opponent_disconnected){
    clearInterval(tickTimer);$('search').textContent=t('connectionLost');$('meMeta').textContent=s.me_ready?t('ready'):t('waitingYourStart');$('oppMeta').textContent=t('connectionLostMeta');$('find').textContent=t('waitingOpponent');$('find').disabled=true;return
  }
  $('meMeta').textContent=s.me_ready?t('ready'):t('waitingYourStart');
  $('oppMeta').textContent=s.opponent_ready?t('ready'):t('waitingOpponentStart');
  if(s.me_ready&&!s.opponent_ready){
    $('search').textContent=t('waitingOpponentClick');$('find').textContent=t('waitingOpponent');$('find').disabled=true
  }else{
    $('search').innerHTML=esc(t('opponentFound'))+' <span class="ready-mark">✓</span>';$('find').textContent=t('startQuiz');$('find').disabled=false
  }
  $('find').onclick=async()=>{if(state?.status!=='ready'||state.me_ready)return;$('find').disabled=true;state=await api('ready',{match_id:s.match_id});handle(state)}
}

function handle(s){
  if(!s)return;
  if(s.status==='waiting'){$('search').textContent=t('searching');$('meMeta').textContent=t('queue');return}
  if(s.status==='invite_waiting'){
    friendCode=s.invite_code||friendCode;showLobby();$('search').textContent=t('friendWaiting');$('oppName').textContent=t('waiting');$('oppMeta').textContent=t('friendNotJoined');$('meMeta').textContent=t('inviteActive');$('find').textContent=t('waitingFriend');$('find').disabled=true;$('friend').disabled=false;$('friend').textContent=t('shareAgain');$('friend').onclick=()=>shareFriendInvite(friendCode);return
  }
  if(s.status==='bot'){stopPoll();prepareBot();return}
  if(s.status==='idle'){resetLobby();return}
  if(s.match_id){
    botMode=false;$('oppName').textContent=s.opponent_name;$('oppMeta').textContent=s.opponent_ready?t('ready'):t('opponentFound');$('search').innerHTML=esc(t('opponentFound'))+' <span class="ready-mark">✓</span>';
    if(s.status==='ready'){setupReadyLobby(s);return}
    showGame();renderReal(s);return
  }
}

function renderReal(s){
  $('meScore').textContent=s.me_score||0;$('oppScore').textContent=s.opponent_score||0;$('round').textContent=(Number(s.round||0)+1)+' / 10';renderServerHistory(s);
  if(s.status==='finished'&&s.reason==='disconnect_forfeit'){
    stopPoll();clearInterval(tickTimer);$('timer').textContent='0';$('end').classList.remove('hidden');$('endScore').textContent=(s.me_score||0)+' : '+(s.opponent_score||0);
    if(s.departed!==s.slot){$('endTitle').textContent=t('win');$('endText').textContent=t('disconnectWin')}
    else{$('endTitle').textContent=t('duelFinished');$('endText').textContent=t('disconnectLoss')}
    return
  }
  if(s.opponent_disconnected&&['countdown','playing','reveal'].includes(s.status)){
    clearInterval(tickTimer);$('timer').textContent='⏸';$('status').textContent=t('connectionLost');document.querySelectorAll('.answer').forEach(b=>b.disabled=true);return
  }
  if(s.status==='countdown'){
    $('topic').textContent=t('multiplayer');$('answers').innerHTML='';$('status').textContent=t('bothReady');updateClock(s);return
  }
  if(s.status==='playing'||s.status==='reveal'){
    let q=s.question;if(!q)return;$('topic').textContent=q.topic||'KvizToGo';$('question').textContent=q.question||'';$('answers').innerHTML='';
    (q.answers||[]).forEach(a=>{let b=document.createElement('button');b.className='answer';b.innerHTML='<b>'+esc(a.key)+'.</b> '+esc(a.text);if(s.my_choice===a.key)b.classList.add(q.correctKey?(a.key===q.correctKey?'good':'bad'):'bad');if(s.status==='reveal'&&a.key===q.correctKey)b.classList.add('good');b.disabled=s.status!=='playing'||!!s.my_choice;b.onclick=()=>realAnswer(a.key,b);$('answers').appendChild(b)});
    if(s.status==='playing')$('status').textContent=s.my_choice?t('answerLocked'):(s.opponent_answered?t('opponentAnswered'):t('answerBeforeTime'));
    else $('status').textContent=t('correctAnswer')+' '+q.correctKey+'. '+answerText(q,q.correctKey);
    updateClock(s);return
  }
  if(s.status==='finished'){stopPoll();clearInterval(tickTimer);$('timer').textContent='0';showEnd(s.me_score,s.opponent_score,s.opponent_name);return}
  if(s.status==='cancelled'){stopPoll();clearInterval(tickTimer);$('status').textContent='Dvoboj je prekinut.';$('end').classList.remove('hidden');$('endTitle').textContent=t('duelInterrupted');$('endScore').textContent=(s.me_score||0)+' : '+(s.opponent_score||0);$('endText').textContent=s.reason==='left'?t('opponentLeft'):t('duelInactive')}
}

function updateClock(s){
  clearInterval(tickTimer);let offset=Date.now()-s.server_ms;
  const draw=()=>{
    if(s.status==='countdown'){let sec=Math.max(0,Math.ceil((s.starts_at-(Date.now()-offset))/1000));$('timer').textContent=String(sec);$('question').innerHTML='<span class="countdown">'+esc(t('questionIn',{sec}))+'</span>'}
    else if(s.status==='playing'){let sec=Math.max(0,Math.ceil((s.deadline-(Date.now()-offset))/1000));$('timer').textContent=String(sec)}
    else $('timer').textContent='0'
  };
  draw();if(s.status==='countdown'||s.status==='playing')tickTimer=setInterval(draw,200)
}
async function realAnswer(k,b){if(state?.status!=='playing'||state.my_choice)return;b.disabled=true;try{state=await api('answer',{match_id:state.match_id,round:String(state.round),choice:k});handle(state)}catch{b.disabled=false}}
function answerText(q,k){return(q.answers||[]).find(a=>a.key===k)?.text||''}
function renderServerHistory(s){let h=Array.isArray(s.history)?s.history:[],slot=s.slot,sig=JSON.stringify(h.map(x=>[x.q?.id,x.choice1,x.choice2]));if(sig!==historyRenderSignature){historyRenderSignature=sig;$('history').innerHTML=h.length?'':'<div class="meta" style="margin-top:.7rem">'+esc(t('historyEmpty'))+'</div>';h.slice().reverse().forEach((x,ri)=>{let q=x.q||{},mine=slot===1?x.choice1:x.choice2,theirs=slot===1?x.choice2:x.choice1;addHist(q,mine,theirs,h.length-ri,s.opponent_name)});remember(h.map(x=>x.q?.id).filter(Boolean))}updateHistoryActionButtons()}
function cls(ch,correct){return!ch?'miss':ch===correct?'ok':'badc'}
function label(ch,q){return ch?ch+' • '+answerText(q,ch):t('noAnswer')}
function addHist(q,mine,theirs,n,opp,prepend=false){let d=document.createElement('div');d.className='hist';let aa=(q.answers||[]).map(a=>'<div class="hista '+(a.key===q.correctKey?'correct':'')+'"><b>'+esc(a.key)+'.</b> '+esc(a.text)+(a.key===q.correctKey?'<span class="correct-tag">TOČAN ODGOVOR</span>':'')+'</div>').join('');d.innerHTML='<div class="histq">'+n+'. '+esc(q.question)+'</div>'+aa+'<div class="who"><div class="'+cls(mine,q.correctKey)+'"><b>'+esc(myName())+':</b> '+esc(label(mine,q))+'</div><div class="'+cls(theirs,q.correctKey)+'"><b>'+esc(opp)+':</b> '+esc(label(theirs,q))+'</div></div>';d.appendChild(buildQuestionActions(q));prepend?$('history').prepend(d):$('history').appendChild(d)}
function showEnd(a,b,opp){$('end').classList.remove('hidden');$('endScore').textContent=a+' : '+b;if(a>b){$('endTitle').textContent='🏆 Pobjeda!';$('endText').textContent='Pobijedio si '+opp+'.'}else if(a<b){$('endTitle').textContent='Protivnik pobjeđuje';$('endText').textContent=opp+' je ovaj put bio bolji.'}else{$('endTitle').textContent=t('draw');$('endText').textContent=t('drawText')}}
async function leave(){try{if(state?.match_id)await api('leave',{match_id:state.match_id});else await api('leave',{})}catch{}resetLobby()}

/* AI fallback tek nakon serverovih 5 sekundi traženja. Bot je prikazan kao spreman, a igrač potvrđuje Kreni s kvizom. */
async function prepareBot(){
  if(botPreparing||botMode)return;botPreparing=true;botMode=true;
  const profile=MP_BOT_PROFILES[Math.floor(Math.random()*MP_BOT_PROFILES.length)];bot={id:profile.id,name:profile.alias,leaderName:profile.leaderName,skill:profile.skill,cons:profile.cons,bias:profile.bias,base:profile.base,accuracy:mpBotAccuracy(profile),answerDelay:()=>mpBotDelay(profile)};
  $('oppName').textContent=bot.name;$('oppMeta').textContent='Spreman ✓';$('meMeta').textContent='Čeka tvoj start';$('search').innerHTML='Protivnik pronađen <span class="ready-mark">✓</span>';$('find').textContent=t('preparingQuestions');$('find').disabled=true;$('friend').disabled=true;
  botQuestions=await loadBotQuestions();botPreparing=false;
  if(botQuestions.length<10){$('search').textContent=t('questionsLoadError');return}
  $('find').textContent=t('startQuiz');$('find').disabled=false;$('find').onclick=beginBotMatch
}
async function loadBotQuestions(){
  const files=['AmerickiPredsjednici','AntickiRim','Film','FloraFauna','Gaming','Glazba','Knjizevnost','Moreplovci','Nogomet','Sport','Svastara','Zemljopis','Znanost','povijest','questions-blitz'];let all=[];
  for(let f of files){try{let r=await fetch('ABC%20pitanja/'+encodeURIComponent(f)+'.json',{cache:'no-store'}),j=await r.json(),a=Array.isArray(j)?j:(j.questions||[]);for(let x of a){if(x?.question&&x.answers&&!Array.isArray(x.answers)&&['A','B','C'].includes(String(x.correct_answer).toUpperCase()))all.push({id:hash((x.topic||f)+'|'+x.question),topic:x.topic||f,question:x.question,correctKey:String(x.correct_answer).toUpperCase(),answers:['A','B','C'].map(k=>({key:k,text:x.answers[k]}))})}}catch{}}
  let ban=new Set(recent()),eligible=shuffle(all.filter(q=>!ban.has(q.id)));return eligible.slice(0,10)
}
function hash(s){let h=2166136261;for(let ch of s.toLowerCase()){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return(h>>>0).toString(36)}
function shuffle(a){a=a.slice();for(let i=a.length-1;i;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function beginBotMatch(){
  botSessionId='multiplayer-bot:'+uuid();historyRenderSignature='';botPos=botMe=botScore=0;botHistory=[];$('history').innerHTML='';$('end').classList.add('hidden');showGame();$('meGame').textContent=myName();$('oppGame').textContent=bot.name;$('topic').textContent=t('multiplayer');$('answers').innerHTML='';$('status').textContent='Protivnik je spreman.';let end=Date.now()+5000;
  clearInterval(tickTimer);const draw=()=>{let sec=Math.max(0,Math.ceil((end-Date.now())/1000));$('timer').textContent=String(sec);$('question').innerHTML='<span class="countdown">'+esc(t('questionIn',{sec}))+'</span>';if(sec<=0){clearInterval(tickTimer);renderBot()}};
  draw();tickTimer=setInterval(draw,200)
}
function renderBot(){
  clearTimeout(botRoundTimer);clearTimeout(botAnswerTimer);botMyChoice=botChoice=null;botMeAnswered=botOppAnswered=false;let q=botQuestions[botPos];
  $('meScore').textContent=botMe;$('oppScore').textContent=botScore;$('round').textContent=(botPos+1)+' / 10';$('topic').textContent=q.topic;$('question').textContent=q.question;$('answers').innerHTML='';
  q.answers.forEach(a=>{let b=document.createElement('button');b.className='answer';b.innerHTML='<b>'+a.key+'.</b> '+esc(a.text);b.onclick=()=>botUserAnswer(a.key,b);$('answers').appendChild(b)});
  $('status').textContent=t('opponentThinking',{opponent:bot.name});botStart=performance.now();clearInterval(tickTimer);
  const draw=()=>{$('timer').textContent=String(Math.max(0,Math.ceil((10000-(performance.now()-botStart))/1000)))};draw();tickTimer=setInterval(draw,200);
  botAnswerTimer=setTimeout(()=>botAnswer(q),bot.answerDelay());botRoundTimer=setTimeout(()=>botClose(q),10000)
}
function botUserAnswer(k,b){if(botMeAnswered)return;botMeAnswered=true;botMyChoice=k;let q=botQuestions[botPos];if(k===q.correctKey){botMe++;b.classList.add('good');$('meScore').textContent=botMe;botClose(q)}else{b.classList.add('bad');b.disabled=true;$('status').textContent=t('wrongOpponentCan');if(botOppAnswered)botClose(q)}}
function botAnswer(q){if(botOppAnswered)return;botOppAnswered=true;let ok=Math.random()<bot.accuracy;botChoice=ok?q.correctKey:shuffle(q.answers.filter(a=>a.key!==q.correctKey))[0].key;if(ok){botScore++;$('oppScore').textContent=botScore;botClose(q)}else if(botMeAnswered)botClose(q);else $('status').textContent=t('opponentWrong',{opponent:bot.name})}
function botClose(q){clearTimeout(botRoundTimer);clearTimeout(botAnswerTimer);clearInterval(tickTimer);document.querySelectorAll('.answer').forEach((b,i)=>{b.disabled=true;if(q.answers[i].key===q.correctKey)b.classList.add('good')});$('timer').textContent='0';$('status').textContent=t('correctAnswer')+' '+q.correctKey+'. '+answerText(q,q.correctKey);botHistory.push({q,me:botMyChoice,opp:botChoice});$('history').innerHTML='';botHistory.slice().reverse().forEach((x,ri)=>addHist(x.q,x.me,x.opp,botHistory.length-ri,bot.name));remember([q.id]);updateHistoryActionButtons();setTimeout(()=>{botPos++;if(botPos>=10)showEnd(botMe,botScore,bot.name);else renderBot()},2000)}


function currentHistoryEntries(){
  if(botMode)return botHistory.map((x,i)=>({q:x.q,mine:x.me,theirs:x.opp,n:i+1,opp:bot?.name||'Protivnik'}));
  let h=Array.isArray(state?.history)?state.history:[],slot=state?.slot||1;
  return h.map((x,i)=>({q:x.q||{},mine:slot===1?x.choice1:x.choice2,theirs:slot===1?x.choice2:x.choice1,n:i+1,opp:state?.opponent_name||'Protivnik'}));
}
function currentVoteSessionId(){return state?.match_id?('multiplayer:'+state.match_id):(botSessionId||('multiplayer:'+token().slice(0,36)))}
function updateHistoryActionButtons(){let on=currentHistoryEntries().length>0;let a=$('mp-download-history'),b=$('mp-share-result');if(a)a.disabled=!on;if(b)b.disabled=!on}
function showMpToast(message){let el=$('mpToast');if(!el){el=document.createElement('div');el.id='mpToast';el.className='mp-toast';document.body.appendChild(el)}el.textContent=message;el.classList.add('on');clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('on'),2200)}

async function saveQuestionVote(q,vote){
  if(!supabaseClient||!q||!['like','dislike'].includes(vote))return false;
  try{
    const {data:authData}=await supabaseClient.auth.getSession();
    const userId=authData?.session?.user?.id||null;
    const {error}=await supabaseClient.from('quiz_question_votes').insert({
      quiz_play_id:null,
      session_id:currentVoteSessionId(),
      user_id:userId,
      question_id:q.id!=null?String(q.id):null,
      question_text:q.question||'',
      correct_answer:answerText(q,q.correctKey)||null,
      question_topic:q.topic||null,
      quiz_mode:'multiplayer',
      selected_theme:q.topic||null,
      vote,
      language:'hr'
    });
    if(error)throw error;
    return true
  }catch(e){console.warn('Ocjena multiplayer pitanja nije spremljena:',e);return false}
}
function buildQuestionActions(q){
  const actions=document.createElement('div');actions.className='history-actions';
  const row=document.createElement('div');row.className='history-action-row';
  const feedbackBtn=document.createElement('button');feedbackBtn.type='button';feedbackBtn.className='history-feedback-btn';feedbackBtn.textContent=t('feedback');
  const like=document.createElement('button');like.type='button';like.className='history-vote-btn';like.textContent='👍';like.title=t('likeTitle');
  const dislike=document.createElement('button');dislike.type='button';dislike.className='history-vote-btn';dislike.textContent='👎';dislike.title=t('dislikeTitle');
  const savedVote=questionVotes.get(String(q.id||q.question));
  if(savedVote){like.disabled=dislike.disabled=true;(savedVote==='like'?like:dislike).classList.add('selected')}
  const vote=async(v,b)=>{if(like.disabled||dislike.disabled)return;like.disabled=dislike.disabled=true;let ok=await saveQuestionVote(q,v);if(ok){questionVotes.set(String(q.id||q.question),v);b.classList.add('selected');showMpToast(t('voteSaved'))}else{like.disabled=dislike.disabled=false;showMpToast(t('voteError'))}};
  like.onclick=()=>vote('like',like);dislike.onclick=()=>vote('dislike',dislike);

  const fb=document.createElement('div');fb.className='history-feedback-box';
  const close=document.createElement('button');close.type='button';close.className='history-feedback-close';close.textContent='×';
  const title=document.createElement('div');title.className='history-feedback-title';title.textContent=t('feedbackTitle');
  const ta=document.createElement('textarea');ta.className='history-feedback-textarea';ta.placeholder=t('feedbackPlaceholder');ta.maxLength=2000;
  const send=document.createElement('button');send.type='button';send.className='history-feedback-send';send.textContent=t('send');
  const note=document.createElement('div');note.className='history-feedback-note';note.textContent=t('feedbackNote');
  close.onclick=()=>fb.classList.remove('open');
  feedbackBtn.onclick=()=>{document.querySelectorAll('.history-feedback-box.open').forEach(x=>{if(x!==fb)x.classList.remove('open')});fb.classList.toggle('open')};
  send.onclick=async()=>{
    const message=ta.value.trim();note.classList.remove('success','error');
    if(!message){note.classList.add('error');note.textContent=t('writeMessage');return}
    if(!supabaseClient){note.classList.add('error');note.textContent=t('supabaseUnavailable');return}
    send.disabled=true;note.textContent=t('sending');
    try{
      const {data,error}=await supabaseClient.functions.invoke('send-quiz-feedback',{body:{
        questionId:q.id||null,question:q.question||'',correctAnswer:answerText(q,q.correctKey)||null,
        topic:q.topic||null,questionType:'abc',message,language:'hr',pageUrl:window.location.href
      }});
      if(error)throw error;if(!data?.ok)throw new Error(data?.error||'Slanje nije potvrđeno.');
      ta.value='';note.classList.add('success');note.innerHTML='<strong>'+esc(t('feedbackThanks'))+'</strong><br>'+esc(t('feedbackReceived'));setTimeout(()=>fb.classList.remove('open'),2500)
    }catch(e){console.error(e);note.classList.add('error');note.textContent=t('feedbackError')}
    finally{send.disabled=false}
  };
  fb.append(close,title,ta,send,note);

  const shareBox=document.createElement('div');shareBox.className='history-share-box';
  const shareText=document.createElement('div');shareText.className='history-share-text';shareText.textContent=t('sharePrompt');
  const shareBtn=document.createElement('button');shareBtn.type='button';shareBtn.className='history-share-btn';shareBtn.textContent=t('sendQuestion');shareBtn.onclick=()=>shareQuestionAsImage(q);
  shareBox.append(shareText,shareBtn);

  row.append(feedbackBtn,like,dislike);actions.append(row,shareBox,fb);return actions
}
function roundRectPath(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
function wrapLines(ctx,text,maxWidth){let words=String(text||'').split(/\s+/),line='',out=[];for(const w of words){let n=line?line+' '+w:w;if(line&&ctx.measureText(n).width>maxWidth){out.push(line);line=w}else line=n}if(line)out.push(line);return out}
function drawBrand(ctx,x,y,size){ctx.textBaseline='alphabetic';ctx.font='950 '+size+'px Arial';ctx.fillStyle='#fff';ctx.fillText('Kviz',x,y);let w=ctx.measureText('Kviz').width;ctx.fillStyle='#2f80ff';ctx.fillText('To',x+w,y);w+=ctx.measureText('To').width;ctx.fillStyle='#22c55e';ctx.fillText('Go',x+w,y)}
function canvasBlob(canvas,quality=.95){return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Slika nije izrađena.')),'image/png',quality))}
function downloadBlob(blob,name){let u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1500)}
async function copyText(t){try{if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(t);return true}}catch{}return false}

async function createQuestionShareBlob(q){
  const c=document.createElement('canvas');c.width=1080;c.height=1350;const x=c.getContext('2d');
  const g=x.createLinearGradient(0,0,1080,1350);g.addColorStop(0,'#0b1220');g.addColorStop(.58,'#132138');g.addColorStop(1,'#0b1d19');x.fillStyle=g;x.fillRect(0,0,1080,1350);
  x.fillStyle='rgba(47,128,255,.13)';x.beginPath();x.arc(120,120,260,0,Math.PI*2);x.fill();x.fillStyle='rgba(34,197,94,.10)';x.beginPath();x.arc(980,1240,300,0,Math.PI*2);x.fill();
  drawBrand(x,74,118,62);x.fillStyle='#a8b3c7';x.font='800 26px Arial';x.fillText(t('challenge'),76,182);
  roundRectPath(x,62,225,956,870,34);x.fillStyle='rgba(16,27,45,.96)';x.fill();x.strokeStyle='rgba(47,128,255,.50)';x.lineWidth=3;x.stroke();
  x.fillStyle='#2f80ff';x.font='900 66px Arial';x.fillText('?',92,342);x.fillStyle='#fff';x.font='900 43px Arial';x.textBaseline='top';
  wrapLines(x,q.question||'',820).slice(0,11).forEach((line,i)=>x.fillText(line,120,390+i*58));
  x.textBaseline='alphabetic';x.fillStyle='#d8e8ff';x.font='800 28px Arial';x.fillText(t('questionShareFooter'),76,1190);
  x.fillStyle='#94a3b8';x.font='700 24px Arial';x.fillText('kviztogo.com/online-kviz',76,1250);
  return canvasBlob(c,.95)
}
async function shareQuestionAsImage(q){
  const message=t('questionShareText');
  try{
    const blob=await createQuestionShareBlob(q),file=new File([blob],'kviztogo-pitanje-'+(q.id||Date.now())+'.png',{type:'image/png'});
    if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){await navigator.share({title:'KvizToGo pitanje',text:message,files:[file]});showMpToast(t('questionReady'))}
    else{downloadBlob(blob,file.name);await copyText(message);showMpToast(t('questionSaved'))}
  }catch(e){if(e?.name!=='AbortError'){await copyText(message);showMpToast(t('quizLinkCopied'))}}
}

async function createHistoryBlob(){
  const items=currentHistoryEntries();if(!items.length)throw new Error(t('nothingPlayed'));
  const W=1080,pad=64,cardW=W-pad*2,cardH=510,gap=22,H=290+items.length*(cardH+gap)+110,c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');
  const g=x.createLinearGradient(0,0,W,H);g.addColorStop(0,'#0b1220');g.addColorStop(.55,'#101b2d');g.addColorStop(1,'#0b1818');x.fillStyle=g;x.fillRect(0,0,W,H);
  drawBrand(x,pad,110,58);x.fillStyle='#fff';x.font='900 42px Arial';x.fillText(t('historyImageTitle'),pad,174);
  x.fillStyle='#a8b3c7';x.font='700 24px Arial';x.fillText(t('playedAgainst',{me:myName(),opponent:items[0]?.opp||t('opponentFound')}),pad,224);
  let y=290;
  for(const item of items){
    const q=item.q||{};roundRectPath(x,pad,y,cardW,cardH,24);x.fillStyle='rgba(22,34,53,.97)';x.fill();x.strokeStyle=item.mine===q.correctKey?'rgba(34,197,94,.62)':'rgba(239,68,68,.58)';x.lineWidth=3;x.stroke();
    x.fillStyle='#fff';x.font='900 29px Arial';x.textBaseline='top';let qy=y+28;for(const line of wrapLines(x,item.n+'. '+(q.question||''),cardW-60).slice(0,4)){x.fillText(line,pad+30,qy);qy+=38}
    qy+=12;x.font='700 23px Arial';
    for(const a of (q.answers||[])){x.fillStyle=a.key===q.correctKey?'#80e9a4':'#dbe5f4';x.fillText(a.key+'. '+a.text,pad+42,qy);qy+=34}
    qy+=12;x.fillStyle=item.mine===q.correctKey?'#80e9a4':item.mine?'#fca5a5':'#a8b3c7';x.fillText(myName()+': '+label(item.mine,q),pad+42,qy);qy+=34;
    x.fillStyle=item.theirs===q.correctKey?'#80e9a4':item.theirs?'#fca5a5':'#a8b3c7';x.fillText(item.opp+': '+label(item.theirs,q),pad+42,qy);
    y+=cardH+gap
  }
  x.textBaseline='alphabetic';x.fillStyle='#94a3b8';x.font='700 22px Arial';x.fillText('kviztogo.com',pad,H-44);return canvasBlob(c,.93)
}
async function downloadFullHistory(){
  try{const blob=await createHistoryBlob(),d=new Date(),p=n=>String(n).padStart(2,'0'),stamp=d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+'_'+p(d.getHours())+'-'+p(d.getMinutes())+'-'+p(d.getSeconds());downloadBlob(blob,'kviztogo-multiplayer-povijest-'+stamp+'.png');showMpToast(t('historySaved'))}catch(e){showMpToast(e?.message||t('nothingPlayed'))}
}
async function createResultShareBlob(){
  const items=currentHistoryEntries();if(!items.length)throw new Error(t('nothingPlayed'));
  const meScore=botMode?botMe:(state?.me_score||0),oppScore=botMode?botScore:(state?.opponent_score||0),opp=botMode?bot.name:(state?.opponent_name||'Protivnik');
  const c=document.createElement('canvas');c.width=1080;c.height=1350;const x=c.getContext('2d'),g=x.createLinearGradient(0,0,1080,1350);g.addColorStop(0,'#0b1220');g.addColorStop(.58,'#132138');g.addColorStop(1,'#0b1d19');x.fillStyle=g;x.fillRect(0,0,1080,1350);
  x.fillStyle='rgba(47,128,255,.14)';x.beginPath();x.arc(120,120,280,0,Math.PI*2);x.fill();x.fillStyle='rgba(34,197,94,.12)';x.beginPath();x.arc(980,1240,330,0,Math.PI*2);x.fill();
  drawBrand(x,74,120,64);x.fillStyle='#a8b3c7';x.font='850 27px Arial';x.fillText(t('resultHeading'),76,190);
  roundRectPath(x,62,236,956,810,38);x.fillStyle='rgba(16,27,45,.96)';x.fill();x.strokeStyle='rgba(47,128,255,.52)';x.lineWidth=3;x.stroke();
  x.textAlign='center';x.fillStyle='#fff';x.font='950 160px Arial';x.fillText(meScore+' : '+oppScore,540,570);
  x.font='850 36px Arial';x.fillStyle='#d8e8ff';x.fillText(myName(),300,720);x.fillText(opp,780,720);
  x.fillStyle='#facc15';x.font='900 44px Arial';x.fillText(meScore>oppScore?t('resultWin'):meScore<oppScore?t('goodFight'):t('resultDraw'),540,865);
  x.fillStyle='#fff';x.font='850 32px Arial';wrapLines(x,t('resultCta'),760).forEach((line,i)=>x.fillText(line,540,950+i*44));
  x.textAlign='left';x.fillStyle='#94a3b8';x.font='700 25px Arial';x.fillText('kviztogo.com/multiplayer.html',76,1240);return canvasBlob(c,.95)
}
async function shareCurrentResult(){
  try{
    const meScore=botMode?botMe:(state?.me_score||0),oppScore=botMode?botScore:(state?.opponent_score||0),opp=botMode?bot.name:(state?.opponent_name||'Protivnik');
    const msg=t('resultShareText',{me:myName(),meScore,oppScore,opponent:opp});
    const blob=await createResultShareBlob(),file=new File([blob],'kviztogo-multiplayer-rezultat.png',{type:'image/png'});
    if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){await navigator.share({title:t('resultTitle'),text:msg,files:[file]});showMpToast(t('resultReady'))}
    else if(navigator.share){await navigator.share({title:t('resultTitle'),text:msg});showMpToast(t('resultReady'))}
    else{downloadBlob(blob,file.name);await copyText(msg);showMpToast(t('resultSaved'))}
  }catch(e){if(e?.name!=='AbortError')showMpToast(e?.message||t('resultShareError'))}
}

$('meName').textContent=myName();$('find').onclick=findOpponent;$('friend').onclick=createFriendInvite;const langBtn=$('language-cycle-btn');if(langBtn)langBtn.onclick=()=>applyLanguage(currentLang==='hr'?'en':'hr');applyLanguage(currentLang);
$('again').onclick=()=>{if(botMode)beginBotMatch();else leave().then(findOpponent)};
$('newOpp').onclick=()=>leave().then(findOpponent);$('mp-download-history').onclick=downloadFullHistory;$('mp-share-result').onclick=shareCurrentResult;updateHistoryActionButtons();
const inviteParam=new URLSearchParams(location.search).get('invite');if(inviteParam){joinFriendInvite(inviteParam)}else{api('state',{}).then(s=>{state=s;if(s?.match_id&&['ready','countdown','playing','reveal','finished'].includes(s.status)){handle(s);if(['ready','countdown','playing','reveal'].includes(s.status))startPoll()}else if(['waiting','invite_waiting','bot'].includes(s?.status)){api('leave',{}).catch(()=>{}).finally(()=>resetLobby())}else resetLobby()}).catch(()=>resetLobby())};
window.addEventListener('pagehide',()=>{if(!state?.match_id&&(state?.status==='invite_waiting'||state?.status==='waiting')){fetch(SB+'/rest/v1/rpc/multiplayer_v3',{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({p_token:token(),p_action:'leave',p_payload:{}}),keepalive:true}).catch(()=>{})}});