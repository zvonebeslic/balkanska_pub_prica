from pathlib import Path
p=Path('daily30.js')
s=p.read_text(encoding='utf-8')
old='.mode-pill--daily{flex:0 1 calc(100% - .8rem);width:calc(100% - .8rem);margin:.12rem .4rem .28rem;'
new='.mode-pill--daily{flex:0 1 100%;width:100%;margin:.12rem 0 .28rem;'
if old not in s:
    raise SystemExit('desktop daily button rule not found')
s=s.replace(old,new,1)
old_mobile='@media(max-width:520px){.mode-pill--daily{width:calc(100% - .6rem);flex-basis:calc(100% - .6rem);margin-inline:.3rem;'
new_mobile='@media(max-width:520px){.mode-pill--daily{width:100%;flex-basis:100%;margin-inline:0;'
if old_mobile not in s:
    raise SystemExit('mobile daily button rule not found')
s=s.replace(old_mobile,new_mobile,1)
p.write_text(s,encoding='utf-8')
