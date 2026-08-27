from pathlib import Path
p=Path('profil.html')
s=p.read_text(encoding='utf-8')
old='''      const finishedAfterMs = 4 * 60 * 60 * 1000;
      const cancelledHistoryCutoff = now - 2 * 24 * 60 * 60 * 1000;

      // Kviz ide u povijest čim završi njegov 4-satni prikaz "UŽIVO".
      // Otkazani kviz ostaje kratko u aktivnom prikazu kako bi ga korisnik mogao ponovno objaviti.
      const isHistory = (q) => {
        if (q.status === "cancelled") {
          const cancelledAt = new Date(q.cancelled_at || q.updated_at || q.datetime).getTime();
          return Number.isFinite(cancelledAt) && cancelledAt < cancelledHistoryCutoff;
        }
        const start = new Date(q.datetime).getTime();
        return Number.isFinite(start) && now >= start + finishedAfterMs;
      };
'''
new='''      const finishedAfterMs = 4 * 60 * 60 * 1000;

      // Glavni prikaz: samo kvizovi koji dolaze ili su još u 4-satnom UŽIVO prozoru.
      // Povijest: samo kvizovi čiji je UŽIVO prozor završio.
      const isHistory = (q) => {
        const start = new Date(q.datetime).getTime();
        return Number.isFinite(start) && now >= start + finishedAfterMs;
      };
'''
if old not in s:
    raise SystemExit('history filter block not found')
s=s.replace(old,new,1)
# Force default state whenever list is freshly rendered/loaded.
old2='''      activeEl.innerHTML = active.length ? active.map(q => card(q)).join("") : '<p class="empty-state">Još niste objavili nijedan aktivan kviz.</p>';
      historyEl.innerHTML = history.length ? history.map(q => card(q, true)).join("") : "";
    }
'''
new2='''      activeEl.innerHTML = active.length ? active.map(q => card(q)).join("") : '<p class="empty-state">Trenutno nemate kvizova koji dolaze ili su uživo.</p>';
      historyEl.innerHTML = history.length ? history.map(q => card(q, true)).join("") : '<p class="empty-state">Još nema završenih kvizova.</p>';
      activeEl.hidden = false;
      historyEl.hidden = true;
      const historyButton = document.getElementById("history-toggle-btn");
      if (historyButton) historyButton.textContent = currentLang === "en" ? "My quiz history" : "Povijest mojih kvizova";
    }
'''
if old2 not in s:
    raise SystemExit('render tail not found')
s=s.replace(old2,new2,1)
p.write_text(s,encoding='utf-8')
