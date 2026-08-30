from pathlib import Path
import re
p=Path('leaderboards.js')
s=p.read_text(encoding='utf-8')

# Allow browsing all leaderboard days since launch, not only the last 7 days.
s=s.replace("const previewState={view:'daily30',anchor:null},pageState={view:'daily30',anchor:null},HISTORY=7,START='2026-08-28';", "const previewState={view:'daily30',anchor:null},pageState={view:'daily30',anchor:null},HISTORY=7,START='2026-08-28';")

# Replace aggregation functions so anchor always means the selected snapshot day.
pat=r"function demoRows\(view,anchor\)\{.*?\}\nfunction ownVisible\(\)"
rep="""function demoRows(view,anchor){if(view==='daily30')return demoDay(anchor);let ds=view==='week'?between(weekStart(anchor),anchor):view==='month'?between(monthStart(anchor),anchor):between(START,anchor),m=new Map();ds.forEach(d=>demoDay(d).forEach(x=>{const c=m.get(x.id)||{id:x.id,name:x.name,score:0,durationSeconds:0,played:0,isPlayer:false};c.score+=x.score;c.durationSeconds+=x.durationSeconds;c.played++;m.set(x.id,c)}));return[...m.values()]}
function ownVisible()"""
s,n=re.subn(pat,rep,s,count=1,flags=re.S)
if n!=1: raise SystemExit(f'demoRows replace count {n}')

pat=r"function ownVisible\(\)\{.*?\}function localRows\(view,anchor\)\{.*?\}\nfunction remoteRows\(view,anchor\)\{.*?\}\nfunction ranked\(view,anchor\)"
m=re.search(pat,s,flags=re.S)
if not m: raise SystemExit('local/remote block not found')
rep="""function ownVisible(){return window.KvizDaily30?.getLeaderboardVisibility?.()!==false}function localRows(view,anchor){if(!ownVisible())return[];const r=window.KvizDaily30?.getResults?.()||{},name=window.KvizDaily30?.getPublicPlayerName?.()||(lang()==='en'?'Your score':'Tvoj rezultat');if(view==='daily30'){const x=r[anchor];return x?.official?[{id:'local-player',name,score:+x.score||0,durationSeconds:+x.durationSeconds||0,played:1,isPlayer:true}]:[]}const ds=Object.keys(r).filter(d=>r[d]?.official&&d<=anchor&&(view==='week'?d>=weekStart(anchor):view==='month'?d>=monthStart(anchor):d>=START));return ds.length?[{id:'local-player',name,score:ds.reduce((sum,d)=>sum+(+r[d].score||0),0),durationSeconds:ds.reduce((sum,d)=>sum+(+r[d].durationSeconds||0),0),played:ds.length,isPlayer:true}]:[]}
function remoteRows(view,anchor){const ownKey=window.KvizDaily30?.leaderboardPlayerKey?.();let rows=REMOTE.filter(x=>x.quiz_date>=START&&x.quiz_date<=anchor);if(!ownVisible()&&ownKey)rows=rows.filter(x=>x.player_key!==ownKey);if(view==='daily30')rows=rows.filter(x=>x.quiz_date===anchor);else if(view==='week')rows=rows.filter(x=>x.quiz_date>=weekStart(anchor));else if(view==='month')rows=rows.filter(x=>x.quiz_date>=monthStart(anchor));const m=new Map();rows.forEach(x=>{const id='real:'+x.player_key,c=m.get(id)||{id,name:x.player_name,score:0,durationSeconds:0,played:0,isPlayer:ownKey===x.player_key,playerKey:x.player_key};c.score+=+x.score||0;c.durationSeconds+=+x.duration_seconds||0;c.played++;c.name=x.player_name||c.name;m.set(id,c)});return[...m.values()]}
function ranked(view,anchor)"""
s=s[:m.start()]+rep+s[m.end():]

# Snapshot date formatting and bounds.
pat=r"function currentAnchor\(v\)\{.*?\}function oldest\(\)\{.*?\}function clamp\(a\)\{.*?\}function period\(v,a\)\{.*?\}function tabs"
rep="""function currentAnchor(v){return today()}function oldest(){return START}function clamp(a){return a>today()?today():a<oldest()?oldest():a}function period(v,a){const loc=lang()==='en'?'en-GB':'hr-HR',f=k=>new Intl.DateTimeFormat(loc,{timeZone:'UTC',day:'numeric',month:'short',year:'numeric'}).format(parse(k));if(v==='daily30')return window.KvizDaily30?.formatFullDate?.(a)||f(a);if(v==='week')return`${f(weekStart(a))} – ${f(a)}`;if(v==='month'){const x=new Intl.DateTimeFormat(loc,{timeZone:'UTC',month:'long',year:'numeric'}).format(parse(a));return`${x[0].toUpperCase()+x.slice(1)} · ${lang()==='en'?'through':'do'} ${f(a)}`}return`${lang()==='en'?'As of':'Stanje na'} ${f(a)}`}function tabs"""
s,n=re.subn(pat,rep,s,count=1,flags=re.S)
if n!=1: raise SystemExit(f'period block replace count {n}')

# Add date arrows around preview period and make all tabs preserve the selected snapshot date.
pat=r"function renderPreview\(\)\{.*?\}function renderPage\(\)"
m=re.search(pat,s,flags=re.S)
if not m: raise SystemExit('renderPreview block not found')
old=m.group(0)
# preserve function renderPage marker at end
new="""function ensurePreviewDateNav(){const root=document.getElementById('leaderboard-preview'),label=document.getElementById('leaderboard-preview-period');if(!root||!label)return null;let wrap=document.getElementById('leaderboard-preview-date-nav');if(!wrap){wrap=document.createElement('div');wrap.id='leaderboard-preview-date-nav';wrap.className='leaderboard-full-period';label.parentNode.insertBefore(wrap,label);wrap.appendChild(label);const prev=document.createElement('button');prev.type='button';prev.className='leaderboard-period-nav';prev.id='leaderboard-preview-prev';prev.textContent='‹';const next=document.createElement('button');next.type='button';next.className='leaderboard-period-nav';next.id='leaderboard-preview-next';next.textContent='›';wrap.insertBefore(prev,label);wrap.appendChild(next);prev.addEventListener('click',()=>shiftPreview(-1));next.addEventListener('click',()=>shiftPreview(1))}return wrap}
function shiftPreview(dir){previewState.anchor=clamp(addDays(previewState.anchor||today(),dir));rootResetExpanded();renderPreview();if(document.getElementById('leaderboard-page')?.classList.contains('open')){pageState.anchor=previewState.anchor;renderPage()}}
function rootResetExpanded(){const root=document.getElementById('leaderboard-preview');if(root)root.dataset.expanded='0'}
function renderPreview(){const root=document.getElementById('leaderboard-preview'),list=document.getElementById('leaderboard-preview-list');if(!root||!list)return;if(!previewState.anchor)previewState.anchor=today();previewState.anchor=clamp(previewState.anchor);tabs(root,previewState.view);ensurePreviewDateNav();const pr=document.getElementById('leaderboard-preview-period');if(pr)pr.textContent=period(previewState.view,previewState.anchor);const pp=document.getElementById('leaderboard-preview-prev'),pn=document.getElementById('leaderboard-preview-next');if(pp){pp.disabled=previewState.anchor<=oldest();pp.setAttribute('aria-label',lang()==='en'?'Previous day':'Prethodni dan')}if(pn){pn.disabled=previewState.anchor>=today();pn.setAttribute('aria-label',lang()==='en'?'Next day':'Sljedeći dan')}const rows=ranked(previewState.view,previewState.anchor),expanded=root.dataset.expanded==='1',shown=expanded?rows:rows.slice(0,5);list.innerHTML=shown.length?shown.map(x=>row(x,previewState.view)).join(''):`<div class=\"leaderboard-empty\">${lang()==='en'?'No results yet.':'Još nema rezultata.'}</div>`;const own=rows.find(x=>x.isPlayer),ownRoot=document.getElementById('leaderboard-preview-own');if(ownRoot){const show=!expanded&&!!(own&&own.rank>5);ownRoot.classList.toggle('visible',show);ownRoot.innerHTML=show?row(own,previewState.view):''}const link=document.getElementById('leaderboard-more-link');if(link){link.textContent=expanded?(lang()==='en'?'Show less':'Prikaži manje'):(lang()==='en'?'View full leaderboard':'Prikaži cijelu ljestvicu');link.href='#leaderboard-preview';link.onclick=e=>{e.preventDefault();root.dataset.expanded=expanded?'0':'1';renderPreview();if(!expanded)setTimeout(()=>root.scrollIntoView({behavior:'smooth',block:'start'}),0)}}}
function renderPage()"""
s=s[:m.start()]+new+s[m.end():]

# Full page: anchor is also a day snapshot; arrows move one day and all-time date row remains visible.
s=s.replace("document.getElementById('leaderboard-full-period')?.classList.toggle('is-all-time',pageState.view==='all');", "document.getElementById('leaderboard-full-period')?.classList.remove('is-all-time');")
pat=r"function shift\(dir\)\{.*?\}const ACH="
rep="""function shift(dir){pageState.anchor=clamp(addDays(pageState.anchor||today(),dir));previewState.anchor=pageState.anchor;renderPage();renderPreview()}const ACH="""
s,n=re.subn(pat,rep,s,count=1,flags=re.S)
if n!=1: raise SystemExit(f'shift replace count {n}')

# On tab changes preserve the selected date instead of jumping back to today.
s=s.replace("pageState.anchor=currentAnchor(pageState.view);renderPage()", "pageState.anchor=clamp(pageState.anchor||previewState.anchor||today());renderPage()")
s=s.replace("previewState.anchor=currentAnchor(previewState.view);root.dataset.expanded='0';", "previewState.anchor=clamp(previewState.anchor||today());root.dataset.expanded='0';")

# Full page prev/next disable logic now uses snapshot bounds for every tab.
s=s.replace("if(p)p.disabled=pageState.view==='all'||(pageState.view==='daily30'&&pageState.anchor<=oldest());if(n)n.disabled=pageState.view==='all'||pageState.anchor>=currentAnchor(pageState.view)", "if(p){p.disabled=pageState.anchor<=oldest();p.setAttribute('aria-label',lang()==='en'?'Previous day':'Prethodni dan')}if(n){n.disabled=pageState.anchor>=today();n.setAttribute('aria-label',lang()==='en'?'Next day':'Sljedeći dan')}")

p.write_text(s,encoding='utf-8')
