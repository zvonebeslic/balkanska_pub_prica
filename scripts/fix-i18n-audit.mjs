import fs from 'node:fs';

function mustReplace(text, from, to, label){
  if(!text.includes(from)) throw new Error('Nije pronađeno: '+label);
  return text.replace(from,to);
}

let online=fs.readFileSync('online-kviz.html','utf8');
online=mustReplace(online,'></span>Scrollanjem do Znanja</summary>','></span><span data-i18n="scrollModeLabel">Scrollanjem do Znanja</span></summary>','scroll naslov');
const links=[
['mode=all','Beskrajni niz','scrollAll'],['mode=50','Nasumičnih 50','scroll50'],
['topic=AmerickiPredsjednici.json','Američki predsjednici','scrollUsPresidents'],['topic=AntickiRim.json','Antički Rim','scrollRome'],['topic=Film.json','Film','scrollFilm'],['topic=FloraFauna.json','Flora i fauna','scrollFlora'],['topic=Gaming.json','Gaming','scrollGaming'],['topic=Glazba.json','Glazba','scrollMusic'],['topic=Knjizevnost.json','Književnost','scrollLiterature'],['topic=Moreplovci.json','Moreplovci','scrollSeafarers'],['topic=Nogomet.json','Nogomet','scrollFootball'],['topic=Sport.json','Sport','scrollSport'],['topic=Zemljopis.json','Zemljopis','scrollGeography'],['topic=Znanost.json','Znanost','scrollScience']
];
for(const [q,label,key] of links){
 const from=`href="scroll-znanje.html?${q}">${label}</a>`;
 const to=`href="scroll-znanje.html?${q}" data-i18n="${key}">${label}</a>`;
 online=mustReplace(online,from,to,'scroll link '+key);
}
online=mustReplace(online,'modeRelaxDesc: "Nasumična pitanja (igraj do besvijesti)",\n      themedBtn:',`modeRelaxDesc: "Nasumična pitanja (igraj do besvijesti)",\n      scrollModeLabel: "Scrollanjem do Znanja", scrollAll: "Beskrajni niz", scroll50: "Nasumičnih 50", scrollUsPresidents: "Američki predsjednici", scrollRome: "Antički Rim", scrollFilm: "Film", scrollFlora: "Flora i fauna", scrollGaming: "Gaming", scrollMusic: "Glazba", scrollLiterature: "Književnost", scrollSeafarers: "Moreplovci", scrollFootball: "Nogomet", scrollSport: "Sport", scrollGeography: "Zemljopis", scrollScience: "Znanost",\n      themedBtn:`,'HR i18n scroll');
online=mustReplace(online,'modeRelaxDesc: "Random questions (play as long as you want)",\n      themedBtn:',`modeRelaxDesc: "Random questions (play as long as you want)",\n      scrollModeLabel: "Scroll to Knowledge", scrollAll: "Endless stream", scroll50: "Random 50", scrollUsPresidents: "U.S. Presidents", scrollRome: "Ancient Rome", scrollFilm: "Film", scrollFlora: "Flora & Fauna", scrollGaming: "Gaming", scrollMusic: "Music", scrollLiterature: "Literature", scrollSeafarers: "Seafarers", scrollFootball: "Football", scrollSport: "Sport", scrollGeography: "Geography", scrollScience: "Science",\n      themedBtn:`,'EN i18n scroll');
fs.writeFileSync('online-kviz.html',online);

let profil=fs.readFileSync('profil.html','utf8');
profil=mustReplace(profil,`activeEl.innerHTML = active.length ? active.map(q => card(q)).join("") : '<p class="empty-state">Trenutno nemate kvizova koji dolaze ili su uživo.</p>';`,`activeEl.innerHTML = active.length ? active.map(q => card(q)).join("") : '<p class="empty-state">'+(currentLang === "en" ? "You currently have no upcoming or live quizzes." : "Trenutno nemate kvizova koji dolaze ili su uživo.")+'</p>';`,'profil active empty');
profil=mustReplace(profil,`historyEl.innerHTML = history.length ? history.map(q => card(q, true)).join("") : '<p class="empty-state">Još nema završenih kvizova.</p>';`,`historyEl.innerHTML = history.length ? history.map(q => card(q, true)).join("") : '<p class="empty-state">'+(currentLang === "en" ? "There are no finished quizzes yet." : "Još nema završenih kvizova.")+'</p>';`,'profil history empty');
fs.writeFileSync('profil.html',profil);

let sitemap=fs.readFileSync('sitemap.xml','utf8');
if(!sitemap.includes('/scroll-znanje.html')) sitemap=sitemap.replace('  <url><loc>https://kviztogo.com/podrska.html</loc>','  <url><loc>https://kviztogo.com/scroll-znanje.html</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>\n  <url><loc>https://kviztogo.com/podrska.html</loc>');
fs.writeFileSync('sitemap.xml',sitemap);
