import fs from 'node:fs';

let html=fs.readFileSync('scroll-znanje.html','utf8');

const correctFn="function correct(input,answers){const x=norm(input);return answers.some(a=>{const y=norm(a);return x===y||dist(x,y)<=allowed(y.length)})}";
if(!html.includes(correctFn)) throw new Error('correct funkcija nije pronađena');
const matchFn=correctFn+"\nfunction getMatchInfo(input,answers){const x=norm(input);let best=null;for(const a of answers||[]){const y=norm(a),d=dist(x,y),maxLen=Math.max(x.length,y.length,1),score=Math.max(0,Math.round((1-d/maxLen)*100)),exact=x===y;if(exact||d<=allowed(y.length)){if(!best||score>best.score)best={answer:String(a),score,exact,distance:d}}}return best}";
html=html.replace(correctFn,matchFn);

const oldCheck="function check(){if(!inp.value.trim())return;const good=correct(inp.value,q.answers);res.className='result '+(good?'good':'bad');res.textContent=good?tx('correct'):tx('wrong')+q.answers[0];inp.disabled=true;ok.disabled=true}";
if(!html.includes(oldCheck)) throw new Error('check funkcija nije pronađena');
const newCheck="function check(){if(!inp.value.trim())return;const match=getMatchInfo(inp.value,q.answers),good=!!match;res.className='result '+(good?'good':'bad');if(good){el.dataset.matchedAnswer=match.answer;el.dataset.matchScore=String(match.score);el.dataset.matchExact=match.exact?'true':'false';el.dataset.matchReason=match.exact?'exact':'tolerance';res.textContent=currentLang==='en'?('✓ Correct! '+match.score+'% match'+(match.exact?'':' · accepted with typo tolerance')):('✓ Točno! '+match.score+'% podudaranje'+(match.exact?'':' · priznato uz toleranciju greške'));}else{el.dataset.matchedAnswer='';el.dataset.matchScore='0';el.dataset.matchExact='false';el.dataset.matchReason='wrong';res.textContent=tx('wrong')+q.answers[0];}inp.disabled=true;ok.disabled=true}";
html=html.replace(oldCheck,newCheck);
html=html.replace('scroll-tracking.js?v=20260906-2','scroll-tracking.js?v=20260906-3');
fs.writeFileSync('scroll-znanje.html',html);

let js=fs.readFileSync('scroll-tracking.js','utf8');
const oldBlock="    let acceptedAnswers = [];\n    try { acceptedAnswers = JSON.parse(card.dataset.answers || '[]'); } catch (_) {}\n    const matchedAnswer = type === 'answered' && isCorrect ? findMatchedAnswer(input, acceptedAnswers) : null;";
if(!js.includes(oldBlock)) throw new Error('matched answer blok nije pronađen');
const newBlock="    let acceptedAnswers = [];\n    try { acceptedAnswers = JSON.parse(card.dataset.answers || '[]'); } catch (_) {}\n    const matchedAnswer = type === 'answered' && isCorrect ? (card.dataset.matchedAnswer || findMatchedAnswer(input, acceptedAnswers)) : null;\n    const isExact = type === 'answered' && isCorrect ? (card.dataset.matchExact === 'true' || normalizeAnswer(input) === normalizeAnswer(matchedAnswer)) : false;\n    const matchReason = type === 'scrolled' ? 'scrolled' : (isCorrect ? (card.dataset.matchReason || (isExact ? 'exact' : 'tolerance')) : 'wrong');";
js=js.replace(oldBlock,newBlock);
js=js.replace("matched_answer:matchedAnswer,is_correct:isCorrect,is_exact:false,was_skipped:false,was_scrolled:type==='scrolled',was_viewed:!!state.viewed,match_reason:type==='scrolled'?'scrolled':'scroll_answer'","matched_answer:matchedAnswer,is_correct:isCorrect,is_exact:isExact,was_skipped:false,was_scrolled:type==='scrolled',was_viewed:!!state.viewed,match_reason:matchReason");
fs.writeFileSync('scroll-tracking.js',js);
