import fs from 'node:fs';
const p='online-kviz.html';
let t=fs.readFileSync(p,'utf8');
const old='<summary class="themed-btn" style="list-style:none;cursor:pointer;user-select:none;">Scrollanjem do Znanja</summary>';
const neu='<summary class="themed-btn" style="list-style:none;cursor:pointer;user-select:none;display:inline-flex;align-items:center;gap:.42rem;"><span aria-hidden="true" style="width:8px;height:8px;flex:0 0 8px;display:inline-block;border:1.5px solid currentColor;border-radius:50%;"></span>Scrollanjem do Znanja</summary>';
if(t.includes(old)){t=t.replace(old,neu);fs.writeFileSync(p,t,'utf8');console.log('Krug dodan.')}else if(t.includes('Scrollanjem do Znanja')){console.log('Gumb je već izmijenjen ili format nije isti.')}else{throw new Error('Gumb nije pronađen.');}
