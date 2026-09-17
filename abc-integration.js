(function(){
  "use strict";
  const BASE="kviztogo_player_stats_v1";
  const isAbc=(m)=>m==="abc_blitz"||m==="abc_relax"||m==="abc_themed"||m==="abc";
  const empty=()=>({gamesPlayed:0,totalCorrect:0,totalWrong:0,bestScore:0,bestTotal:0,bestPercent:0,longestStreak:0});

  function statsKeys(){const a=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&(k===BASE||k.startsWith(BASE+":")))a.push(k);}return a;}
  function currentStats(){const keys=statsKeys();for(const k of keys){try{const s=JSON.parse(localStorage.getItem(k)||"null");if(s?.modeStats?.abc)return s;}catch(_){}}return {modeStats:{abc:empty()}};}

  /* Supabase: svi ABC nacini ostaju jedna zasebna kategorija "abc".
     Lokalnu statistiku NE prebrojavamo ovdje: online-kviz.html je vec upisuje
     u ukupnu statistiku i u modeStats.abc, pa bi dodatno brojanje dalo duplikate. */
  const api=window.supabase,prevCreate=api&&typeof api.createClient==="function"?api.createClient:null;
  if(prevCreate&&!prevCreate.__kviztogoAbcUnified){
    const create=function(...args){
      const client=prevCreate.apply(this,args);
      if(!client||typeof client.from!=="function")return client;
      const prevFrom=client.from.bind(client);
      client.from=function(table){
        const b=prevFrom(table);
        if(!b||((table!=="quiz_plays")&&(table!=="quiz_answers")))return b;
        if(typeof b.insert==="function"){
          const prevInsert=b.insert.bind(b);
          b.insert=function(values,options){
            const norm=(row)=>{
              if(!row||typeof row!=="object"||Array.isArray(row)||!isAbc(row.quiz_mode))return row;
              const n={...row,quiz_mode:"abc"};
              if(table==="quiz_answers"){
                const topic=String(n.question_topic||n.selected_theme||"Svaštara").trim()||"Svaštara";
                const raw=String(n.question_text||"").replace(/^ABC\s*·\s*[^·]+\s*·\s*/i,"").trim();
                n.question_type="abc";
                n.question_text=`ABC · ${topic} · ${raw}`;
              }
              return n;
            };
            return prevInsert(Array.isArray(values)?values.map(norm):norm(values),options);
          };
        }
        return b;
      };
      return client;
    };
    create.__kviztogoAbcUnified=true;
    api.createClient=create;
  }

  function signature(){const e=document.querySelector('.abc-option.circle-selected,.abc-option.active');return e?`abc:${e.getAttribute('data-abc-mode')||''}:${e.getAttribute('data-abc-topic')||''}`:"abc";}
  function installOrder(){
    const original=window.pickFromQueueRespectTopicCooldown;
    if(typeof original!=="function"||original.__maxTwoAbcLetters)return;
    let deferred=[],last=null,streak=0,sig=null;
    const key=q=>q&&q.type==="abc"?String(q.correctAnswerKey||"").toUpperCase():"";
    const bad=q=>{const k=key(q);return !!(k&&k===last&&streak>=2);};
    const take=q=>{const k=key(q);if(!k){last=null;streak=0;return q;}if(k===last)streak++;else{last=k;streak=1;}return q;};
    const wrapped=function(){const s=signature();if(s!==sig){deferred=[];last=null;streak=0;sig=s;}for(let i=0;i<deferred.length;i++)if(!bad(deferred[i]))return take(deferred.splice(i,1)[0]);for(let i=0;i<80;i++){const q=original();if(!q)return deferred.length?take(deferred.shift()):q;if(q.type!=="abc"){deferred=[];last=null;streak=0;return q;}if(!bad(q))return take(q);deferred.push(q);}return deferred.length?take(deferred.shift()):original();};
    wrapped.__maxTwoAbcLetters=true;
    window.pickFromQueueRespectTopicCooldown=wrapped;
  }

  function addSection(){
    if(document.getElementById("profile-abc-section"))return;
    const t=document.querySelector(".player-mode-section--themed");if(!t)return;
    const s=document.createElement("section");s.id="profile-abc-section";s.className="player-mode-section player-mode-section--abc";
    s.innerHTML=`<div class="player-section-heading"><div><div class="player-section-title">ABC pitanja</div><div class="player-section-copy">Zasebna statistika svih ABC načina i tematika.</div></div><span class="player-section-chip">A/B/C</span></div><div class="player-mode-stats"><div class="player-mode-stat"><div class="player-mode-stat-label">Ukupni rezultat</div><div class="player-mode-stat-value" id="abc-total-result">0/0</div><div class="player-stat-sub" id="abc-total-percent">0% uspješnosti</div></div><div class="player-mode-stat"><div class="player-mode-stat-label">Najbolja partija</div><div class="player-mode-stat-value" id="abc-best-result">0/0</div><div class="player-stat-sub" id="abc-best-percent">0% uspješnosti</div></div><div class="player-mode-stat"><div class="player-mode-stat-label">Odigrano partija</div><div class="player-mode-stat-value" id="abc-games-played">0</div></div><div class="player-mode-stat"><div class="player-mode-stat-label">Najduži niz točnih</div><div class="player-mode-stat-value" id="abc-longest-streak">0</div></div></div>`;
    t.insertAdjacentElement("afterend",s);
  }
  function renderProfile(){addSection();const a={...empty(),...(currentStats().modeStats.abc||{})},total=a.totalCorrect+a.totalWrong,p=total?Math.round(a.totalCorrect*100/total):0;const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};set("abc-total-result",`${a.totalCorrect}/${total}`);set("abc-total-percent",`${p}% uspješnosti`);set("abc-best-result",`${a.bestScore}/${a.bestTotal}`);set("abc-best-percent",`${Math.round(a.bestPercent||0)}% uspješnosti`);set("abc-games-played",String(a.gamesPlayed));set("abc-longest-streak",String(a.longestStreak));}

  /* Dodatne ABC krune idu U postojecu grupu "Odigrane ABC partije",
     istim karticama, SVG krunom i stilom kao sve ostale krune. */
  function mergeAbcCrowns(){
    const container=document.getElementById("achievement-groups");if(!container)return;
    const sections=[...container.querySelectorAll(".achievement-group")];
    const section=sections.find(s=>/Odigrane ABC partije|ABC games played/i.test(s.querySelector(".achievement-group-title span")?.textContent||""));
    if(!section)return;
    const grid=section.querySelector(".achievement-crown-grid");if(!grid)return;
    grid.querySelectorAll('[data-abc-extra-crown="1"]').forEach(e=>e.remove());
    const a={...empty(),...(currentStats().modeStats.abc||{})};
    const sample=grid.querySelector(".achievement-crown-card");
    const crownHtml=sample?.querySelector(".achievement-crown-wrap")?.innerHTML||"👑";
    const extras=[
      ["ABC 100","Skupi 100 točnih ABC odgovora",a.totalCorrect,100],
      ["ABC 500","Skupi 500 točnih ABC odgovora",a.totalCorrect,500],
      ["ABC niz 20","Pogodi 20 ABC pitanja zaredom",a.longestStreak,20]
    ];
    extras.forEach(([title,condition,current,target])=>{
      const unlocked=Number(current)>=target;
      const card=document.createElement("article");
      card.className=`achievement-crown-card ${unlocked?"unlocked":"locked"}`;
      card.dataset.abcExtraCrown="1";
      card.innerHTML=`<div class="achievement-crown-wrap">${crownHtml}</div><div class="achievement-crown-title">${title}</div><div class="achievement-crown-condition">${condition}</div><div class="achievement-crown-progress">${unlocked?"Otključano":`${Math.min(Number(current)||0,target)}/${target}`}</div>`;
      grid.appendChild(card);
    });
    const count=section.querySelector(".achievement-group-count");
    if(count){const cards=[...grid.querySelectorAll(".achievement-crown-card")];count.textContent=`${cards.filter(c=>c.classList.contains("unlocked")).length}/${cards.length}`;}
  }

  function history(){const l=document.getElementById('history-list');if(!l)return;const show=()=>{if(l.children.length){document.body.classList.add('quiz-results-visible');const s=l.closest('.sidebar-card');if(s)s.style.display='flex';}};new MutationObserver(show).observe(l,{childList:true});show();}
  function init(){installOrder();renderProfile();mergeAbcCrowns();history();const c=document.getElementById('achievement-groups');if(c)new MutationObserver(()=>{renderProfile();mergeAbcCrowns();}).observe(c,{childList:true,subtree:false});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,0),{once:true});else setTimeout(init,0);
})();
