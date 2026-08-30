from pathlib import Path
p=Path('leaderboards.js')
s=p.read_text(encoding='utf-8')
old='.leaderboard-full-period.is-all-time{display:none}'
new='.leaderboard-full-period.is-all-time{display:flex}.leaderboard-full-period.is-all-time .leaderboard-period-nav{display:none}'
if s.count(old)!=1: raise SystemExit(f'css match {s.count(old)}')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')
