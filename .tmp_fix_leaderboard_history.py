from pathlib import Path

p = Path('leaderboards.js')
s = p.read_text(encoding='utf-8')
old = "function hasPreviousCompletePeriod(v,a){if(v==='week'){const prevStart=addDays(weekStart(a),-7),prevEnd=addDays(prevStart,6);return prevStart>=START&&prevEnd<today()}if(v==='month'){const prevStart=addMonths(monthStart(a),-1),prevEnd=periodEnd('month',prevStart);return prevStart>=START&&prevEnd<today()}return a>START}"
new = "function hasPreviousCompletePeriod(v,a){if(v==='week'){const prevStart=addDays(weekStart(a),-7),prevEnd=addDays(prevStart,6);return prevEnd>=START&&prevEnd<today()}if(v==='month'){const prevStart=addMonths(monthStart(a),-1),prevEnd=periodEnd('month',prevStart);return prevEnd>=START&&prevEnd<today()}return a>START}"
if s.count(old) != 1:
    raise SystemExit(f'leaderboards.js expected exactly 1 match, found {s.count(old)}')
p.write_text(s.replace(old,new), encoding='utf-8')

p = Path('online-kviz.html')
s = p.read_text(encoding='utf-8')
old = '<script src="leaderboards.js?v=20260830-1"></script>'
new = '<script src="leaderboards.js?v=20260831-1"></script>'
if s.count(old) != 1:
    raise SystemExit(f'online-kviz.html expected exactly 1 match, found {s.count(old)}')
p.write_text(s.replace(old,new), encoding='utf-8')
