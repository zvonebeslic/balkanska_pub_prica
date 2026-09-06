import fs from 'node:fs';

let html=fs.readFileSync('scroll-znanje.html','utf8');
const htmlNeedle="el.dataset.correctAnswer=q.answers[0]||'';";
if(!html.includes(htmlNeedle)) throw new Error('scroll-znanje card dataset marker nije pronađen');
html=html.replace(htmlNeedle, htmlNeedle+"el.dataset.answers=JSON.stringify(q.answers||[]);");
fs.writeFileSync('scroll-znanje.html',html);

let js=fs.readFileSync('scroll-tracking.js','utf8');
const saveMarker="  async function saveQuestion(card, type) {";
if(!js.includes(saveMarker)) throw new Error('saveQuestion marker nije pronađen');
const helpers=`  function normalizeAnswer(value) {\n    return String(value ?? '').toLocaleLowerCase('hr').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').replace(/[^a-z0-9čćđšž ]/gi, '').replace(/\\s+/g, ' ').trim();\n  }\n\n  function answerDistance(a, b) {\n    a = normalizeAnswer(a); b = normalizeAnswer(b);\n    const row = Array(b.length + 1).fill(0).map((_, i) => i);\n    for (let i = 1; i <= a.length; i += 1) {\n      let prev = row[0]; row[0] = i;\n      for (let j = 1; j <= b.length; j += 1) {\n        const temp = row[j];\n        row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));\n        prev = temp;\n      }\n    }\n    return row[b.length];\n  }\n\n  function allowedDistance(length) {\n    return length <= 3 ? 0 : length <= 4 ? 1 : length <= 7 ? 2 : length <= 11 ? 3 : length <= 15 ? 4 : 4 + Math.floor((length - 15) / 5);\n  }\n\n  function findMatchedAnswer(input, answers) {\n    const normalizedInput = normalizeAnswer(input);\n    for (const answer of Array.isArray(answers) ? answers : []) {\n      const normalizedAnswer = normalizeAnswer(answer);\n      if (normalizedInput === normalizedAnswer || answerDistance(normalizedInput, normalizedAnswer) <= allowedDistance(normalizedAnswer.length)) return String(answer);\n    }\n    return null;\n  }\n\n`;
js=js.replace(saveMarker,helpers+saveMarker);
const caNeedle="    const correctAnswer = card.dataset.correctAnswer || null;";
if(!js.includes(caNeedle)) throw new Error('correctAnswer marker nije pronađen');
js=js.replace(caNeedle, caNeedle+"\n    let acceptedAnswers = [];\n    try { acceptedAnswers = JSON.parse(card.dataset.answers || '[]'); } catch (_) {}\n    const matchedAnswer = type === 'answered' && isCorrect ? findMatchedAnswer(input, acceptedAnswers) : null;");
if(!js.includes('matched_answer:null')) throw new Error('matched_answer:null nije pronađen');
js=js.replace('matched_answer:null','matched_answer:matchedAnswer');
fs.writeFileSync('scroll-tracking.js',js);
