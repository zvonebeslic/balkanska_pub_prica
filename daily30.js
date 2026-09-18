/* KvizToGo loader: Dnevnih 30. ABC integracija je ugrađena u online-kviz.html. */
document.write('<script src="daily30-core.js?v=20260917-1"><\/script>');

/* Kompatibilnost sa starim online-kviz kodom: updateBlitzPercentileNote koristi
   globalni note. Bez njega INIT puca prije loadQuestionsFromJson(). */
var note = document.getElementById('blitz-percentile-note');

/* Glavni online-kviz JS sam inicijalizira gumbe i ucitava JSON pitanja.
   Ovdje ne pozivamo njegove init funkcije drugi put jer bi se handleri duplirali. */

