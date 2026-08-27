from pathlib import Path
p=Path('profil.html')
s=p.read_text(encoding='utf-8')

# 1) Add Daily 30 block before collection upcoming card in played quizzes details
anchor='''        <section class="player-upcoming-card player-upcoming-card--collections"><div class="player-section-heading"><div><div class="player-section-title" id="profile-collection-title">Kviz kolekcije</div>'''
block='''        <section class="player-mode-section player-mode-section--daily30">
          <div class="player-section-heading"><div><div class="player-section-title" id="profile-daily30-title">Dnevnih 30</div><div class="player-section-copy" id="profile-daily30-copy">Statistika samo iz dnevnog kviza odigranog na dan kada je aktivan.</div></div><span class="player-section-chip">30</span></div>
          <div class="player-mode-stats">
            <div class="player-mode-stat"><div class="player-mode-stat-label" id="daily30-result-label">Ukupni rezultat</div><div class="player-mode-stat-value" id="daily30-total-result">0/0</div><div class="player-stat-sub" id="daily30-total-percent">0% uspješnosti</div></div>
            <div class="player-mode-stat"><div class="player-mode-stat-label" id="daily30-best-label">Najbolja partija</div><div class="player-mode-stat-value" id="daily30-best-result">0/0</div><div class="player-stat-sub" id="daily30-best-percent">0% uspješnosti</div></div>
            <div class="player-mode-stat"><div class="player-mode-stat-label" id="daily30-games-label">Odigrano dana</div><div class="player-mode-stat-value" id="daily30-games-played">0</div></div>
            <div class="player-mode-stat"><div class="player-mode-stat-label" id="daily30-streak-label">Najduži niz točnih</div><div class="player-mode-stat-value" id="daily30-longest-streak">0</div></div>
          </div>
        </section>
'''
if 'id="profile-daily30-title"' not in s:
    if anchor not in s: raise SystemExit('played quizzes anchor not found')
    s=s.replace(anchor,block+anchor,1)

# 2) Add visual styling near mode styles
style_anchor='''.player-mode-section--themed {
  border-color: rgba(148, 163, 184, 0.28);
}
'''
style_add='''.player-mode-section--themed {
  border-color: rgba(148, 163, 184, 0.28);
}

.player-mode-section--daily30 {
  border-color: rgba(250, 204, 21, 0.38);
  background:
    radial-gradient(circle at top right, rgba(250, 204, 21, 0.10), transparent 42%),
    rgba(255, 255, 255, 0.045);
}
'''
if '.player-mode-section--daily30' not in s:
    if style_anchor not in s: raise SystemExit('mode style anchor not found')
    s=s.replace(style_anchor,style_add,1)

# 3) Add helper functions before renderProfileDashboard
render_anchor='''    function renderProfileDashboard(){if(!profileProgressReady)return;'''
helper='''    function profileDaily30StorageKey(){
      if(currentUser?.id)return `kviztogo_daily30_results_v1:user:${currentUser.id}`;
      return null;
    }
    function getProfileDaily30Stats(){
      const empty={gamesPlayed:0,totalCorrect:0,totalWrong:0,bestScore:0,bestTotal:0,bestPercent:0,longestStreak:0};
      const key=profileDaily30StorageKey();
      if(!key)return empty;
      let results={};
      try{const parsed=JSON.parse(localStorage.getItem(key)||"null");if(parsed&&typeof parsed==="object")results=parsed;}catch(_){return empty;}
      const official=Object.values(results).filter(r=>r&&r.official===true&&/^\\d{4}-\\d{2}-\\d{2}$/.test(String(r.date||"")));
      if(!official.length)return empty;
      let totalCorrect=0,totalWrong=0,bestScore=0,bestTotal=0,bestPercent=0;
      official.forEach(r=>{const score=Math.max(0,Number(r.score)||0),total=Math.max(score,Number(r.total)||30),pct=total?Math.round(score/total*100):0;totalCorrect+=score;totalWrong+=Math.max(0,total-score);if(pct>bestPercent||(pct===bestPercent&&score>bestScore)){bestPercent=pct;bestScore=score;bestTotal=total;}});
      let longestStreak=0;
      try{const crowns=JSON.parse(localStorage.getItem("kviztogo_daily30_crowns_v1")||"null");longestStreak=Math.max(0,Number(crowns?.bestStreak)||0);}catch(_){}
      return {gamesPlayed:official.length,totalCorrect,totalWrong,bestScore,bestTotal,bestPercent,longestStreak};
    }

'''
if 'function getProfileDaily30Stats()' not in s:
    if render_anchor not in s: raise SystemExit('render dashboard anchor not found')
    s=s.replace(render_anchor,helper+render_anchor,1)

# 4) Render daily stats and translations in dashboard
old='''      mode("blitz",s.modeStats.blitz60);mode("relax",s.modeStats.relax);mode("themed",s.modeStats.themed);setProgressText("themed-topics-chip",playerProgressText(`${s.modeStats.themed.themesPlayed.length} tema`,`${s.modeStats.themed.themesPlayed.length} themes`));'''
new='''      mode("blitz",s.modeStats.blitz60);mode("relax",s.modeStats.relax);mode("themed",s.modeStats.themed);mode("daily30",getProfileDaily30Stats());setProgressText("themed-topics-chip",playerProgressText(`${s.modeStats.themed.themesPlayed.length} tema`,`${s.modeStats.themed.themesPlayed.length} themes`));'''
if old not in s: raise SystemExit('mode render line not found')
s=s.replace(old,new,1)

old2='''setProgressText("profile-themed-title",playerProgressText("Tematski kvizovi","Themed quizzes"));setProgressText("profile-themed-copy",playerProgressText("Tvoja privatna statistika kvizova po odabranim temama.","Your private themed-quiz statistics."));setProgressText("player-games-toggle-label",playerProgressText("Pregled odigranih kvizova","View played quizzes"));'''
new2='''setProgressText("profile-themed-title",playerProgressText("Tematski kvizovi","Themed quizzes"));setProgressText("profile-themed-copy",playerProgressText("Tvoja privatna statistika kvizova po odabranim temama.","Your private themed-quiz statistics."));setProgressText("profile-daily30-title",playerProgressText("Dnevnih 30","Daily 30"));setProgressText("profile-daily30-copy",playerProgressText("Broje se samo dnevni kvizovi odigrani na dan kada su aktivni.","Only Daily 30 quizzes played on their live day are counted."));setProgressText("daily30-result-label",playerProgressText("Ukupni rezultat","Total score"));setProgressText("daily30-best-label",playerProgressText("Najbolja partija","Best game"));setProgressText("daily30-games-label",playerProgressText("Odigrano dana","Days played"));setProgressText("daily30-streak-label",playerProgressText("Najduži niz točnih","Longest correct streak"));setProgressText("player-games-toggle-label",playerProgressText("Pregled odigranih kvizova","View played quizzes"));'''
if old2 not in s: raise SystemExit('translation render line not found')
s=s.replace(old2,new2,1)

p.write_text(s,encoding='utf-8')
