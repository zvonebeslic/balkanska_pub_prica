from pathlib import Path

# online-kviz.html: force Back button/link to absolute index route
p = Path('online-kviz.html')
s = p.read_text(encoding='utf-8')
old = '<a href="/" class="nav-btn nav-btn--secondary" data-i18n="backMap">← Natrag</a>'
new = '<a href="/index.html" class="nav-btn nav-btn--secondary" data-i18n="backMap">← Natrag</a>'
if old in s:
    s = s.replace(old, new, 1)
else:
    # tolerate already altered class/spacing by replacing the first back-map-row root href
    marker = '<div class="back-map-row">'
    i = s.find(marker)
    if i < 0:
        raise SystemExit('online back-map-row not found')
    j = s.find('</div>', i)
    block = s[i:j]
    if 'href="/"' in block:
        block2 = block.replace('href="/"', 'href="/index.html"', 1)
        s = s[:i] + block2 + s[j:]
    elif 'href="index.html"' not in block and 'href="/index.html"' not in block:
        raise SystemExit('online back link href not found')
p.write_text(s, encoding='utf-8')

# profil.html: never use browser history to leave profile; always go straight home
p = Path('profil.html')
s = p.read_text(encoding='utf-8')
s = s.replace('<a href="index.html" class="brand-logo" aria-label="KvizToGo početna">', '<a href="/index.html" class="brand-logo" aria-label="KvizToGo početna">', 1)
old_listener = '''    document.getElementById("back-btn").addEventListener("click", () => {\n      if (document.referrer && new URL(document.referrer).origin === window.location.origin) {\n        history.back();\n      } else {\n        window.location.href = "index.html";\n      }\n    });'''
new_listener = '''    document.getElementById("back-btn").addEventListener("click", () => {\n      localStorage.removeItem("kviztogo_after_login");\n      window.location.replace("/index.html");\n    });'''
if old_listener not in s:
    raise SystemExit('profile back listener not found')
s = s.replace(old_listener, new_listener, 1)

# Make the logo bypass any stale login-return intent too.
logo_hook = '''    document.querySelector(".brand-logo")?.addEventListener("click", (event) => {\n      event.preventDefault();\n      localStorage.removeItem("kviztogo_after_login");\n      window.location.replace("/index.html");\n    });\n\n'''
anchor = '    settingsBtn.addEventListener("click", (event) => {'
if logo_hook not in s:
    if anchor not in s:
        raise SystemExit('profile settings listener anchor not found')
    s = s.replace(anchor, logo_hook + anchor, 1)
p.write_text(s, encoding='utf-8')
