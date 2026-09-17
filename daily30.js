/* KvizToGo loader: ucitava postojeci Dnevnih 30 kod. ABC integracija je sada izravno u online-kviz.html, pa je ovdje ne ucitavamo drugi put. */
document.write('<script src="daily30-core.js?v=20260917-1"><\/script>');

/* ABC UI safety fix: online-kviz JavaScript ocekuje #abc-answer-options.
   Ako ga HTML jos nema, dodaj ga uz postojeci unos odgovora prije pokretanja glavnog inline koda. */
(function ensureAbcAnswerOptions(){
  if (document.getElementById('abc-answer-options')) return;
  const answerRow = document.querySelector('.answer-wrap .answer-input-row');
  if (!answerRow) return;
  const container = document.createElement('div');
  container.className = 'abc-answer-options';
  container.id = 'abc-answer-options';
  answerRow.insertAdjacentElement('afterend', container);
})();
