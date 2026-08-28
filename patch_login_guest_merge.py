from pathlib import Path
import re

path = Path('login.html')
text = path.read_text(encoding='utf-8')
original = text

cdn = '  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>'
bridge = '  <script src="guest-profile-sync.js"></script>'
if bridge not in text:
    if cdn not in text:
        raise SystemExit('Supabase CDN marker not found')
    text = text.replace(cdn, cdn + '\n' + bridge, 1)

pattern = re.compile(r'    async function syncPendingDaily30AfterLogin\(session\) \{.*?\n    \}\n\n    async function goToProfile\(session\) \{', re.S)
replacement = '''    async function syncPendingDaily30AfterLogin(session) {
      try {
        if (window.KvizGuestProfileSync?.merge) {
          return await window.KvizGuestProfileSync.merge(session, supabaseClient);
        }
      } catch (error) {
        console.warn("Guest → profil sinkronizacija nakon prijave nije uspjela:", error);
      }
      return false;
    }

    async function goToProfile(session) {'''
text, count = pattern.subn(replacement, text, count=1)
if count != 1:
    raise SystemExit(f'Expected one sync function, replaced {count}')

if text == original:
    raise SystemExit('No changes made')

path.write_text(text, encoding='utf-8')
print('login.html patched')
