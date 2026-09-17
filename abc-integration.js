(function(){
  "use strict";

  const isAbcModeName=(mode)=>mode==="abc_blitz"||mode==="abc_relax"||mode==="abc_themed"||mode==="abc";

  /* Svi ABC načini idu u postojeće Supabase tablice kao jedan quiz_mode='abc'. */
  const api=window.supabase;
  const previousCreateClient=api&&typeof api.createClient==="function"?api.createClient:null;
  if(previousCreateClient&&!previousCreateClient.__kviztogoAbcUnified){
    const wrapped=function(...args){
      const client=previousCreateClient.apply(this,args);
      if(!client||typeof client.from!=="function") return client;
      const previousFrom=client.from.bind(client);
      client.from=function(table){
        const builder=previousFrom(table);
        if((table!=="quiz_plays"&&table!=="quiz_answers")||!builder||typeof builder.insert!=="function") return builder;
        const previousInsert=builder.insert.bind(builder);
        builder.insert=function(values,options){
          const normalize=(row)=>{
            if(!row||typeof row!=="object"||Array.isArray(row)) return row;
            if(!isAbcModeName(row.quiz_mode)) return row;
            const next={...row,quiz_mode:"abc"};
            if(table==="quiz_answers"){
              const topic=String(next.question_topic||next.selected_theme||"Svaštara").trim()||"Svaštara";
              const raw=String(next.question_text||"").replace(/^ABC\s*·\s*[^·]+\s*·\s*/i,"").trim();
              next.question_type="abc";
              next.question_text=`ABC · ${topic} · ${raw}`;
            }
            return next;
          };
          return previousInsert(Array.isArray(values)?values.map(normalize):normalize(values),options);
        };
        return builder;
      };
      return client;
    };
    wrapped.__kviztogoAbcUnified=true;
    api.createClient=wrapped;
  }

  function activeAbcSignature(){
    const selected=document.querySelector('.abc-option.circle-selected,.abc-option.active');
    if(!selected) return "abc";
    return `abc:${selected.getAttribute('data-abc-mode')||''}:${selected.getAttribute('data-abc-topic')||''}`;
  }

  /* Ne mijenja A/B/C unutar pitanja. Mijenja samo redoslijed pitanja tako da isto
     točno slovo ne može doći tri puta zaredom. */
  function installQuestionOrderGuard(){
    if(typeof window.pickFromQueueRespectTopicCooldown!=="function"||window.pickFromQueueRespectTopicCooldown.__maxTwoAbcLetters) return;
    const original=window.pickFromQueueRespectTopicCooldown;
    let deferred=[];
    let lastKey=null;
    let streak=0;
    let signature=null;

    function accept(q){
      const key=q&&q.type==="abc"?String(q.correctAnswerKey||"").toUpperCase():"";
      if(!key){ lastKey=null; streak=0; return q; }
      if(key===lastKey) streak+=1; else { lastKey=key; streak=1; }
      return q;
    }
    function wouldMakeThree(q){
      const key=q&&q.type==="abc"?String(q.correctAnswerKey||"").toUpperCase():"";
      return Boolean(key&&key===lastKey&&streak>=2);
    }
    const guarded=function(){
      const nextSignature=activeAbcSignature();
      if(signature!==nextSignature){ deferred=[]; lastKey=null; streak=0; signature=nextSignature; }
      for(let i=0;i<deferred.length;i++){
        if(!wouldMakeThree(deferred[i])) return accept(deferred.splice(i,1)[0]);
      }
      for(let tries=0;tries<60;tries++){
        const q=original();
        if(!q){ return deferred.length?accept(deferred.shift()):q; }
        if(q.type!=="abc"){
          deferred=[]; lastKey=null; streak=0;
          return q;
        }
        if(!wouldMakeThree(q)) return accept(q);
        deferred.push(q);
      }
      return deferred.length?accept(deferred.shift()):original();
    };
    guarded.__maxTwoAbcLetters=true;
    window.pickFromQueueRespectTopicCooldown=guarded;
  }

  function emptyModeStats(){return {gamesPlayed:0,totalCorrect:0,totalWrong:0,bestScore:0,bestTotal:0,bestPercent:0,longestStreak:0};}
  function abcStorageKey(){
    try{
      const guest=JSON.parse(localStorage.getItem("kviztogo_guest_identity_v1")||"null");
      if(guest?.id) return `kviztogo_abc_stats_v1:guest:${guest.id}`;
    }catch(_){}
    return "kviztogo_abc_stats_v1:device";
  }
  function loadAbcStats(){
    try{return {...emptyModeStats(),...(JSON.parse(localStorage.getItem(abcStorageKey())||"null")||{})};}
    catch(_){return emptyModeStats();}
  }

  function addAbcProfileSection(){
    if(document.getElementById("profile-abc-section")) return;
    const themed=document.querySelector(".player-mode-section--themed");
    if(!themed) return;
    const section=document.createElement("section");
    section.id="profile-abc-section";
    section.className="player-mode-section player-mode-section--abc";
    section.innerHTML=`<div class="player-section-heading"><div><div class="player-section-title">ABC pitanja</div><div class="player-section-copy">Zasebna statistika svih ABC načina i tematika.</div></div><span class="player-section-chip">A/B/C</span></div><div class="player-mode-stats"><div class="player-mode-stat"><div class="player-mode-stat-label">Ukupni rezultat</div><div class="player-mode-stat-value" id="abc-total-result">0/0</div><div class="player-stat-sub" id="abc-total-percent">0% uspješnosti</div></div><div class="player-mode-stat"><div class="player-mode-stat-label">Najbolja partija</div><div class="player-mode-stat-value" id="abc-best-result">0/0</div><div class="player-stat-sub" id="abc-best-percent">0% uspješnosti</div></div><div class="player-mode-stat"><div class="player-mode-stat-label">Odigrano partija</div><div class="player-mode-stat-value" id="abc-games-played">0</div></div><div class="player-mode-stat"><div class="player-mode-stat-label">Najduži niz točnih</div><div class="player-mode-stat-value" id="abc-longest-streak">0</div></div></div>`;
    themed.insertAdjacentElement("afterend",section);
  }

  function renderAbcProfile(){
    addAbcProfileSection();
    const s=loadAbcStats();
    const correct=Number(s.totalCorrect)||0, wrong=Number(s.totalWrong)||0, total=correct+wrong;
    const percent=total?Math.round(correct*100/total):0;
    const bestScore=Number(s.bestScore)||0, bestTotal=Number(s.bestTotal)||0;
    const bestPercent=Number(s.bestPercent)||(bestTotal?Math.round(bestScore*100/bestTotal):0);
    const set=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value;};
    set("abc-total-result",`${correct}/${total}`); set("abc-total-percent",`${percent}% uspješnosti`);
    set("abc-best-result",`${bestScore}/${bestTotal}`); set("abc-best-percent",`${Math.round(bestPercent)}% uspješnosti`);
    set("abc-games-played",String(Number(s.gamesPlayed)||0)); set("abc-longest-streak",String(Number(s.longestStreak)||0));
  }

  function ensureHistoryVisible(){
    const list=document.getElementById("history-list");
    if(!list) return;
    const show=()=>{if(list.children.length){document.body.classList.add("quiz-results-visible");const sidebar=list.closest(".sidebar-card");if(sidebar)sidebar.style.display="flex";}};
    new MutationObserver(show).observe(list,{childList:true}); show();
  }

  function installAfterMainScript(){
    installQuestionOrderGuard(); addAbcProfileSection(); renderAbcProfile(); ensureHistoryVisible();
    const profile=document.getElementById("player-games-details");
    if(profile)new MutationObserver(renderAbcProfile).observe(profile,{childList:true,subtree:true,characterData:true});
    window.addEventListener("storage",renderAbcProfile);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(installAfterMainScript,0),{once:true});else setTimeout(installAfterMainScript,0);
})();
