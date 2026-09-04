from pathlib import Path


def replace_once(path, old, new, label):
    p = Path(path)
    text = p.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly 1 match, found {count}")
    p.write_text(text.replace(old, new, 1), encoding="utf-8")


# index.html: legend
replace_once("index.html", '''                    <div class="legend-row-group">
                        <div class="legend-row"><span class="legend-dot legend-dot--green"></span><span data-i18n="legendGreen">danas - 7 dana</span></div>
                        <div class="legend-row"><span class="legend-dot legend-dot--yellow"></span><span data-i18n="legendYellow">8–14 dana</span></div>
                        <div class="legend-row"><span class="legend-dot legend-dot--red"></span><span data-i18n="legendRed">15–30 dana</span></div>
                        <div class="legend-row"><span class="legend-dot legend-dot--grey"></span><span data-i18n="legendGrey">nedavno završeni (do 2 dana)</span></div>
                        <div class="legend-row"><span class="legend-cancelled-x" aria-hidden="true">×</span><span data-i18n="legendCancelled">odgođeno</span></div>
                        <div class="legend-row"><span class="legend-dot legend-dot--black"></span><span data-i18n="legendBlack">tvoja lokacija</span></div>
                    </div>''', '''                    <div class="legend-row-group">
                        <div class="legend-row"><span class="legend-dot legend-dot--green"></span><span data-i18n="legendGreen">kviz</span></div>
                        <div class="legend-row"><span class="legend-cancelled-x" aria-hidden="true">×</span><span data-i18n="legendCancelled">odgođeno</span></div>
                        <div class="legend-row"><span class="legend-dot legend-dot--black"></span><span data-i18n="legendBlack">tvoja lokacija</span></div>
                    </div>''', "legend HTML")

replace_once("index.html", '''    legendTitle: "Legenda boja:",
    legendGreen: "danas - 7 dana",
    legendYellow: "8–14 dana",
    legendRed: "15–30 dana",
    legendGrey: "nedavno završeni (do 2 dana)",
    legendBlack: "tvoja lokacija",
    legendCancelled: "odgođeno",''', '''    legendTitle: "Legenda:",
    legendGreen: "kviz",
    legendBlack: "tvoja lokacija",
    legendCancelled: "odgođeno",''', "HR legend")

replace_once("index.html", '''  legendTitle: "Color legend:",
  legendGreen: "today - 7 days",
  legendYellow: "8–14 days",
  legendRed: "15–30 days",
  legendGrey: "recently finished (up to 2 days)",
  legendBlack: "your location",
  legendCancelled: "postponed",''', '''  legendTitle: "Legend:",
  legendGreen: "quiz",
  legendBlack: "your location",
  legendCancelled: "postponed",''', "EN legend")

# index.html: map time window and marker colors
replace_once("index.html", '''const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
const UPCOMING_WINDOW_MS = 30 * 86400000;      // ±30 dana
const FINISHED_VISIBLE_MS = 2 * 86400000;      // završeni vidljivi još 2 dana''', '''const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
const UPCOMING_WINDOW_MS = 30 * 86400000;      // nadolazeći do 30 dana''', "time constants")

replace_once("index.html", '''    // dopuštamo evente od prije max 2 dana do +30 dana
    return diff >= -FINISHED_VISIBLE_MS && diff <= UPCOMING_WINDOW_MS;''', '''    // Nadolazeći kvizovi i kvizovi koji su još u postojećem 4-satnom UŽIVO prozoru.
    return diff >= -FOUR_HOURS_MS && diff <= UPCOMING_WINDOW_MS;''', "initial time filter")

replace_once("index.html", '''function getMarkerColor(quiz) {
  const now = Date.now();
  const t = new Date(quiz.datetime).getTime();
  if (Number.isNaN(t)) return "grey";

  const diff = t - now;

  // finished but još vidljiv
  if (diff < 0 && diff >= -FINISHED_VISIBLE_MS) return "grey";

  const dayMs = 86400000;
  const daysAhead = diff / dayMs;
  if (daysAhead <= 7) return "green";
  if (daysAhead <= 14) return "yellow";
  if (daysAhead <= 30) return "red";
  return "grey";
}''', '''function getMarkerColor() {
  // Svi objavljeni kvizovi koriste isti zeleni marker.
  // Odgođeni kvizovi se i dalje crtaju zasebnim X markerom.
  return "green";
}''', "marker colors")

replace_once("index.html", '''      // vremenski prozor
      const diff = quiz._timeMs - now;
      return diff >= -FINISHED_VISIBLE_MS && diff <= UPCOMING_WINDOW_MS;''', '''      // Nadolazeći + trenutačno UŽIVO; završeni se odmah nakon LIVE prozora uklanjaju.
      const diff = quiz._timeMs - now;
      return diff >= -FOUR_HOURS_MS && diff <= UPCOMING_WINDOW_MS;''', "filtered time window")

# index.html: publish preview/form toggle
replace_once("index.html", '''    previewPanel.classList.add("visible");
    previewPanel.hidden = false;

    const header = document.querySelector(".site-header");''', '''    form.classList.add("hidden");
    previewPanel.classList.add("visible");
    previewPanel.hidden = false;

    const header = document.querySelector(".site-header");''', "hide form for preview")

replace_once("index.html", '''  previewEditBtn?.addEventListener("click", () => {
    previewPanel?.classList.remove("visible");
    const header = document.querySelector(".site-header");''', '''  previewEditBtn?.addEventListener("click", () => {
    previewPanel?.classList.remove("visible");
    if (previewPanel) {
      previewPanel.hidden = true;
      previewPanel.style.display = "";
    }
    form.classList.remove("hidden");
    const header = document.querySelector(".site-header");''', "edit preview toggle")

# profil.html: hidden attribute must actually hide inactive list
replace_once("profil.html", '''    .my-quizzes-list { display:grid; gap:.7rem; }
    .my-quiz-card { padding:.85rem; border:1px solid var(--border); border-radius:16px; background:var(--card-soft); display:grid; gap:.38rem; }''', '''    .my-quizzes-list { display:grid; gap:.7rem; }
    .my-quizzes-list[hidden] { display:none !important; }
    .my-quiz-card { padding:.85rem; border:1px solid var(--border); border-radius:16px; background:var(--card-soft); display:grid; gap:.38rem; }''', "profile hidden list")

replace_once("profil.html", '''        button.textContent = "Povijest mojih kvizova";
      } else {
        active.hidden = true;
        history.hidden = false;
        button.textContent = "Sakrij povijest";''', '''        button.textContent = currentLang === "en" ? "My quiz history" : "Povijest mojih kvizova";
      } else {
        active.hidden = true;
        history.hidden = false;
        button.textContent = currentLang === "en" ? "Hide history" : "Sakrij povijest";''', "history labels")

print("Requested KvizToGo fixes applied.")
