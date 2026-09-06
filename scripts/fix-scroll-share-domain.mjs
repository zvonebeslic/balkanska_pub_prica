import fs from 'node:fs';
const path='scroll-znanje.html';
let s=fs.readFileSync(path,'utf8');
const from="const u=new URL(location.href);u.search='';u.searchParams.set('shared',q.question);";
const to="const u=new URL('https://kviztogo.com/scroll-znanje.html');u.searchParams.set('shared',q.question);";
if(!s.includes(from)) throw new Error('Share URL kod nije pronađen');
s=s.replace(from,to);
fs.writeFileSync(path,s);
