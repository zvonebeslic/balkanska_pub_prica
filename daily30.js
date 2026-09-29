/* KvizToGo loader: Dnevnih 30. ABC integracija je ugrađena u online-kviz.html. */
document.write('<script src="daily30-core.js?v=20260917-1"><\/script>');
document.write('<script src="push-notifications.js?v=20260927-2"><\/script>');

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
    card.className='knowledge-feature-card knowledge-feature-card--collections';
    card.innerHTML='<div class="knowledge-feature-kicker">LEVEL PO LEVEL · USKORO</div><h2 class="knowledge-feature-title">Storytelling</h2><p class="knowledge-feature-copy">Kreni na put znanja. Svaki level donosi 5 pitanja, skupljaj zvjezdice i otključavaj nove postaje.</p><button class="knowledge-feature-btn" type="button" disabled>Uskoro</button>';
    roadmap.insertBefore(card,roadmap.firstChild);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run,{once:true}); else run();
})();
