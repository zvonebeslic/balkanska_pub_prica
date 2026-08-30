from pathlib import Path
p=Path('leaderboards.js')
s=p.read_text(encoding='utf-8')

def one(old,new,label):
    global s
    c=s.count(old)
    if c!=1: raise SystemExit(f'{label}: expected 1 match, got {c}')
    s=s.replace(old,new,1)

one("function currentAnchor(v){return today()}function oldest(){return START}function clamp(a){return a>today()?today():a<oldest()?oldest():a}function period(v,a){const loc=lang()==='en'?'en-GB':'hr-HR',f=k=>new Intl.DateTimeFormat(loc,{timeZone:'UTC',day:'numeric',month:'short',year:'numeric'}).format(parse(k));if(v==='daily30')return window.KvizDaily30?.formatFullDate?.(a)||f(a);if(v==='week')return`${f(weekStart(a))} – ${f(a)}`;if(v==='month'){const x=new Intl.DateTimeFormat(loc,{timeZone:'UTC',month:'long',year:'numeric'}).format(parse(a));return`${x[0].toUpperCase()+x.slice(1)} · ${lang()==='en'?'through':'do'} ${f(a)}`}return`${lang()==='en'?'As of':'Stanje na'} ${f(a)}`}","function currentAnchor(v){return today()}function oldest(){return START}function clamp(a){return a>today()?today():a<oldest()?oldest():a}function periodEnd(v,a){if(v==='week')return addDays(weekStart(a),6);if(v==='month'){const mk=monthStart(a);return mk.slice(0,7)+'-'+String(dim(mk.slice(0,7))).padStart(2,'0')}return a}function period(v,a){const loc=lang()==='en'?'en-GB':'hr-HR',f=k=>new Intl.DateTimeFormat(loc,{timeZone:'UTC',day:'numeric',month:'numeric',year:'numeric'}).format(parse(k));if(v==='daily30')return window.KvizDaily30?.formatFullDate?.(a)||f(a);if(v==='week')return`${f(weekStart(a))} – ${f(periodEnd('week',a))}`;if(v==='month')return`${f(monthStart(a))} – ${f(periodEnd('month',a))}`;return`${lang()==='en'?'As of':'Stanje na'} ${f(a)}`}",'period')
one("function shiftPreview(dir){previewState.anchor=clamp(addDays(previewState.anchor||today(),dir));const root=document.getElementById('leaderboard-preview');","function shiftPreview(dir){const a=previewState.anchor||today();previewState.anchor=clamp(previewState.view==='week'?addDays(weekStart(a),dir*7):previewState.view==='month'?addMonths(monthStart(a),dir):addDays(a,dir));const root=document.getElementById('leaderboard-preview');",'shiftPreview')
one("function shift(dir){pageState.anchor=clamp(addDays(pageState.anchor||today(),dir));previewState.anchor=pageState.anchor;renderPage();renderPreview()}","function shift(dir){const a=pageState.anchor||today();pageState.anchor=clamp(pageState.view==='week'?addDays(weekStart(a),dir*7):pageState.view==='month'?addMonths(monthStart(a),dir):addDays(a,dir));previewState.anchor=pageState.anchor;renderPage();renderPreview()}",'shift')
p.write_text(s,encoding='utf-8')
