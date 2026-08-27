from pathlib import Path
p=Path('login.html')
s=p.read_text(encoding='utf-8')
old='const POST_LOGIN_DESTINATION = "profil.html";'
new='const POST_LOGIN_DESTINATION = new URL("profil.html", window.location.href).href;'
if old not in s:
    raise SystemExit('POST_LOGIN_DESTINATION not found')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')
