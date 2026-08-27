from pathlib import Path
p=Path('online-kviz.html')
s=p.read_text(encoding='utf-8')
old='''        <li class="hero-right-extra" data-i18n="how9">Nakon što utipkate odgovor, potvrđujete ga tako što kliknete na bijelu kvačicu sa zelenom pozadinom.</li>\n      </ul>\n\n      <p class="how-ai-note" data-i18n="howAiNote">'''
new='''        <li class="hero-right-extra" data-i18n="how9">Nakon što utipkate odgovor, potvrđujete ga tako što kliknete na bijelu kvačicu sa zelenom pozadinom.</li>\n        <li class="hero-right-extra" data-i18n="how10">Dnevnih 30 je vrsta kviza u kojoj svi igrači dobivaju ista pitanja istim redoslijedom. Ljestvica prikazuje rezultate svih igrača i rangira ih, a svoj rezultat po želji možete sakriti. U službeni rezultat i ljestvicu računa se samo kviz odigran na dan kada je aktualan, dok prošle kvizove možete igrati, ali se njihovi rezultati ne ubrajaju na ljestvicu.</li>\n      </ul>\n\n      <p class="how-ai-note" data-i18n="howAiNote">'''
if old not in s: raise SystemExit('HTML target not found')
s=s.replace(old,new,1)
old_hr='''      how9: "Nakon što utipkate odgovor, potvrđujete ga tako što kliknete na bijelu kvačicu sa zelenom pozadinom.",\n      howAiNote:'''
new_hr='''      how9: "Nakon što utipkate odgovor, potvrđujete ga tako što kliknete na bijelu kvačicu sa zelenom pozadinom.",\n      how10: "Dnevnih 30 je vrsta kviza u kojoj svi igrači dobivaju ista pitanja istim redoslijedom. Ljestvica prikazuje rezultate svih igrača i rangira ih, a svoj rezultat po želji možete sakriti. U službeni rezultat i ljestvicu računa se samo kviz odigran na dan kada je aktualan, dok prošle kvizove možete igrati, ali se njihovi rezultati ne ubrajaju na ljestvicu.",\n      howAiNote:'''
if old_hr not in s: raise SystemExit('HR i18n target not found')
s=s.replace(old_hr,new_hr,1)
# EN block has same keys; insert before EN howAiNote by matching the English how9 text if present.
needle='''      how9: "After typing your answer, confirm it by clicking the white check mark on the green background.",\n      howAiNote:'''
replacement='''      how9: "After typing your answer, confirm it by clicking the white check mark on the green background.",\n      how10: "Daily 30 is a quiz mode in which every player gets the same questions in the same order. The leaderboard shows and ranks players’ results, and you can hide your own result if you wish. Only the quiz played on the day it is currently active counts toward the official result and leaderboard; past quizzes remain playable, but their results do not count toward the leaderboard.",\n      howAiNote:'''
if needle in s:
    s=s.replace(needle,replacement,1)
else:
    print('EN exact target not found; Croatian change still applied')
p.write_text(s,encoding='utf-8')
