/* KvizToGo loader: Dnevnih 30. ABC integracija je ugrađena u online-kviz.html. */
document.write('<script src="daily30-core.js?v=20260917-1"><\/script>');

/* Kompatibilnost sa starim online-kviz kodom: updateBlitzPercentileNote koristi
   globalni note. Bez njega INIT puca prije loadQuestionsFromJson(). */
var note = document.getElementById('blitz-percentile-note');

/* Glavni online-kviz JS sam inicijalizira gumbe i ucitava JSON pitanja.
   Ovdje ne pozivamo njegove init funkcije drugi put jer bi se handleri duplirali. */

/* Storytelling: zaseban level-po-level način. Kartica se ubacuje iznad dvije
   postojeće "Uskoro" kartice bez diranja glavnog online-kviz HTML-a. */
(function addStorytellingEntry(){
  function run(){
    if(document.getElementById('storytelling-entry')) return;
    var roadmap=document.querySelector('.knowledge-roadmap');
    if(!roadmap) return;
    var card=document.createElement('article');
    card.id='storytelling-entry';
    card.className='knowledge-feature-card';
    card.style.gridColumn='1 / -1';
    card.style.borderColor='rgba(34,197,94,.48)';
    card.style.background='radial-gradient(circle at top right,rgba(34,197,94,.15),transparent 42%),radial-gradient(circle at bottom left,rgba(47,128,255,.15),transparent 44%),rgba(16,27,45,.96)';
    card.innerHTML='<div class="knowledge-feature-kicker" style="color:#8ff0b4">NOVO · LEVEL PO LEVEL</div><h2 class="knowledge-feature-title">Storytelling</h2><p class="knowledge-feature-copy">Kreni na put znanja. Svaki level donosi 5 pitanja, skupljaj zvjezdice i otključavaj nove postaje.</p><a class="knowledge-feature-btn" href="storytelling.html" style="text-decoration:none;display:inline-flex;align-items:center;justify-content:center;background:#22c55e;border-color:#22c55e;color:#fff">Kreni na put →</a>';
    roadmap.insertBefore(card,roadmap.firstChild);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run,{once:true}); else run();
})();
