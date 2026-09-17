/* KvizToGo loader: zadrzava Dnevnih 30 i ABC integraciju prije glavnog online-kviz koda. */
document.write('<script src="daily30-core.js?v=20260917-1"><\/script><script src="abc-integration.js?v=20260917-1"><\/script>');

/* Kompatibilnost sa starim online-kviz kodom: updateBlitzPercentileNote koristi
   globalni note. Bez njega INIT puca prije loadQuestionsFromJson(). */
var note = document.getElementById('blitz-percentile-note');

/* Glavni online-kviz JS sam inicijalizira gumbe i ucitava JSON pitanja.
   Ovdje ne pozivamo njegove init funkcije drugi put jer bi se handleri duplirali. */

/* ABC UI: glavni kod ocekuje ovaj spremnik za A/B/C odgovore. */
(function ensureAbcAnswerOptions(){
  if (document.getElementById('abc-answer-options')) return;
  var answerRow = document.querySelector('.answer-wrap .answer-input-row');
  if (!answerRow) return;
  var container = document.createElement('div');
  container.className = 'abc-answer-options';
  container.id = 'abc-answer-options';
  answerRow.insertAdjacentElement('afterend', container);
})();
