import fs from 'node:fs';
let html=fs.readFileSync('scroll-znanje.html','utf8');
html=html.replace('.hero h1{font-size:24px}.qt{font-size:17px}', '.hero h1{font-size:24px}');
html=html.replace(/scroll-tracking\.js\?v=[^\"']+/,'scroll-tracking.js?v=20260906-6');
fs.writeFileSync('scroll-znanje.html',html);

let js=fs.readFileSync('scroll-tracking.js','utf8');
js=js.replace(/if\(e\.target\.closest\('\.ok'\)\) setTimeout\(\(\) => \{ const s=cardState\.get\(card\)\|\|\{\}; if\(s\.answered\)return; const result=card\.querySelector\('\.result'\); if\(!result\?\.classList\.contains\('good'\)&&!result\?\.classList\.contains\('bad'\)\)return; s\.answered=true; cardState\.set\(card,s\); if\(result\.classList\.contains\('good'\)\)correct\+=1; else wrong\+=1; saveQuestion\(card,'answered'\); flush\(\); \},0\);/, "if(e.target.closest('.ok')) setTimeout(() => { const s=cardState.get(card)||{}; if(s.answered||!card.dataset.matchReason)return; s.answered=true; cardState.set(card,s); if(card.dataset.matchReason==='wrong')wrong+=1; else correct+=1; saveQuestion(card,'answered'); flush(); },0);");
fs.writeFileSync('scroll-tracking.js',js);
