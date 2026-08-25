(function () {
  "use strict";

  const previewState = { view: "daily30", anchor: null };
  const pageState = { view: "daily30", anchor: null };
  const DAILY_HISTORY_DAYS = 7;
  const DEMO_START_DATE = "2026-07-01";

  const DEMO_NAMES = [
    "Ivan", "Ana", "Marko", "Petra", "Luka", "Marta", "Nikola", "Ivana", "Matej", "Lucija",
    "Filip", "Ema", "Josip", "Sara", "Karlo", "Lea", "David", "Iva", "Lovro", "Nina",
    "Ivan Horvat", "Petra Marić", "Luka Kovač", "Ana Babić", "Marko Jurić", "Marta Novak", "Filip Radić", "Sara Perić", "Nikola Barišić", "Lucija Matić",
    "ČudniKljun", "SjenaSaŠanka", "TrećiPokušaj", "KaktusNaKvadrat", "BezGooglea", "KasniOdgovor", "PlaviToster", "MozakNaPauzi", "MaliOrakul", "KriviKontinent",
    "TihiAlarm", "ZadnjaKlupa", "PetaBrzina", "PolaBoda", "NoćnaSova", "KavaBezŠećera", "LijeviKlik", "ZeleniFenjer", "MorskiKrastavac", "NultiMeridijan",
    "PogrešanPlanet", "ŠestiOsjećaj", "DvaPromilaZnanja", "RezervniMozak", "SlučajniGenij", "KraljTipfelera", "ČetvrtiOdgovor", "PitajSusjeda", "BezPojmaAliBrzo", "TkoJeOvo",
    "KrumpirProfesor", "GospodinMožda", "AjdeC", "NisamUčio", "BurekLogika", "KvizniPuž", "PametniĆevap", "ČekajZnam", "MaloSutra", "JošJednoPaIdem",
    "NijeA", "SigurnoB", "MoždaC", "ProfesoricaKava", "TriSekundeKasnije", "KvizniJež", "ZaboravniLav", "PonedjeljakMozak", "SubotnjiGenije", "TetaWikipedia",
    "KvizMaster", "LovacNaBodove", "Mozgalo", "Kvizoman", "Znalac", "Pitanjolovac", "BrziPrst", "PubKvizVeteran", "Enciklopedist", "KvizNindža",
    "BodPoBod", "TridesetPitanja", "FinalniOdgovor", "BezDžokera", "LovacNaTrideset", "KvizKompas", "TihiZnalac", "MozakUTrećoj", "KvizRudar", "TočanOdgovor"
  ];

  const SKILL_GROUPS = [
    { key: "excellent", count: 8, minDays: 12, maxDays: 20, baseMinutes: [190, 390] },
    { key: "veryGood", count: 17, minDays: 10, maxDays: 19, baseMinutes: [210, 460] },
    { key: "average", count: 30, minDays: 7, maxDays: 17, baseMinutes: [240, 620] },
    { key: "sufficient", count: 20, minDays: 5, maxDays: 14, baseMinutes: [300, 760] },
    { key: "bad", count: 15, minDays: 3, maxDays: 10, baseMinutes: [340, 900] },
    { key: "veryBad", count: 10, minDays: 2, maxDays: 7, baseMinutes: [380, 1050] }
  ];

  const DAYPARTS = [
    [300, 420], [420, 570], [570, 690], [690, 810], [810, 960],
    [960, 1080], [1080, 1260], [1260, 1350], [1350, 1410], [1410, 1438]
  ];

  function lang() { return document.documentElement.lang === "en" ? "en" : "hr"; }
  function todayKey() { return window.KvizDaily30?.zonedDateKey?.() || new Date().toISOString().slice(0, 10); }
  function parseKey(key) {
    const [year, month, day] = String(key).split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day, 12));
  }
  function keyOf(date) { return date.toISOString().slice(0, 10); }
  function addDays(key, amount) { const date = parseKey(key); date.setUTCDate(date.getUTCDate() + amount); return keyOf(date); }
  function addMonths(key, amount) { const date = parseKey(key); date.setUTCDate(1); date.setUTCMonth(date.getUTCMonth() + amount); return keyOf(date); }
  function monthStart(key) { return `${String(key).slice(0, 7)}-01`; }

  function hash(value) {
    let result = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      result ^= value.charCodeAt(index);
      result = Math.imul(result, 16777619);
    }
    return result >>> 0;
  }

  function randomFor(seedText) {
    let value = hash(seedText) || 1;
    return () => {
      value += 0x6d2b79f5;
      let result = value;
      result = Math.imul(result ^ (result >>> 15), result | 1);
      result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
      return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
    };
  }

  function randomInt(random, min, max) {
    return min + Math.floor(random() * (max - min + 1));
  }

  function shuffled(items, random) {
    const copy = items.slice();
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }
    return copy;
  }

  function buildDemoProfiles() {
    let skillIndex = 0;
    let usedInGroup = 0;
    return DEMO_NAMES.map((name, index) => {
      while (skillIndex < SKILL_GROUPS.length - 1 && usedInGroup >= SKILL_GROUPS[skillIndex].count) {
        skillIndex += 1;
        usedInGroup = 0;
      }
      const group = SKILL_GROUPS[skillIndex];
      usedInGroup += 1;
      const random = randomFor(`demo-profile:${index}:${name}`);
      return {
        id: `demo-${String(index + 1).padStart(3, "0")}`,
        name,
        skill: group.key,
        minDays: group.minDays,
        maxDays: group.maxDays,
        baseMinutes: group.baseMinutes,
        daypart: Math.floor(random() * DAYPARTS.length),
        consistency: 0.35 + random() * 0.6,
        activityBias: random()
      };
    });
  }

  const DEMO_PROFILES = buildDemoProfiles();
  const monthlyScheduleCache = new Map();

  function daysInMonth(monthKey) {
    const [year, month] = String(monthKey).split("-").map(Number);
    return new Date(Date.UTC(year, month, 0, 12)).getUTCDate();
  }

  function scheduleForMonth(monthKey) {
    if (monthlyScheduleCache.has(monthKey)) return monthlyScheduleCache.get(monthKey);
    const dayCount = daysInMonth(monthKey);
    const map = new Map();

    DEMO_PROFILES.forEach(profile => {
      const random = randomFor(`demo-month:${monthKey}:${profile.id}`);
      const activitySpan = profile.maxDays - profile.minDays;
      let playCount = profile.minDays + Math.round(activitySpan * (0.25 * profile.activityBias + 0.75 * random()));
      playCount = Math.max(profile.minDays, Math.min(profile.maxDays, playCount, 20));
      const days = shuffled(Array.from({ length: dayCount }, (_, i) => i + 1), random).slice(0, playCount).sort((a, b) => a - b);
      days.forEach(day => {
        const dateKey = `${monthKey}-${String(day).padStart(2, "0")}`;
        if (!map.has(dateKey)) map.set(dateKey, []);
        map.get(dateKey).push(profile);
      });
    });

    // Spriječi prenatrpane dane. Reže samo najniži prioritet tog dana, nikad iznad 66 demo igrača.
    for (const [dateKey, profiles] of map.entries()) {
      if (profiles.length <= 66) continue;
      const random = randomFor(`demo-cap:${dateKey}`);
      map.set(dateKey, shuffled(profiles, random).slice(0, 66));
    }

    monthlyScheduleCache.set(monthKey, map);
    return map;
  }

  function scheduledDatesForProfile(profile, monthKey) {
    const schedule = scheduleForMonth(monthKey);
    return [...schedule.entries()].filter(([, profiles]) => profiles.some(item => item.id === profile.id)).map(([date]) => date).sort();
  }

  function scoreFor(profile, dateKey) {
    const monthKey = dateKey.slice(0, 7);
    const dates = scheduledDatesForProfile(profile, monthKey);
    const position = dates.indexOf(dateKey);
    const random = randomFor(`demo-score:${profile.id}:${dateKey}`);
    const peakOrder = shuffled(dates, randomFor(`demo-peaks:${profile.id}:${monthKey}`));
    const isPeak1 = peakOrder[0] === dateKey;
    const isPeak2 = peakOrder[1] === dateKey;
    let min = 0;
    let max = 10;

    if (profile.skill === "excellent") {
      if (isPeak1) { min = 25; max = 29; }
      else { min = 8; max = 19; }
    } else if (profile.skill === "veryGood") {
      if (isPeak1 || isPeak2) { min = 20; max = 25; }
      else { min = 6; max = 14; }
    } else if (profile.skill === "average") {
      min = 2; max = 20;
    } else if (profile.skill === "sufficient") {
      min = 2; max = 15;
    } else if (profile.skill === "bad") {
      min = 0; max = 10;
    } else {
      if (random() < 0.12) { min = 7; max = 10; }
      else { min = 0; max = 6; }
    }

    const centerPull = profile.consistency;
    const raw = random();
    const centered = 0.5 + (raw - 0.5) * (1.35 - centerPull);
    const score = Math.round(min + Math.max(0, Math.min(1, centered)) * (max - min));
    return Math.max(0, Math.min(30, score + ((position >= 0 && position % 9 === 0 && random() < 0.22) ? (random() < 0.5 ? -2 : 2) : 0)));
  }

  function durationFor(profile, dateKey, score) {
    const random = randomFor(`demo-time:${profile.id}:${dateKey}`);
    const [baseMin, baseMax] = profile.baseMinutes;
    const scoreFactor = Math.max(-70, Math.min(95, (14 - score) * 5.5));
    const jitter = randomInt(random, -65, 95);
    const personal = Math.round((random() - 0.5) * 90 * (1.2 - profile.consistency));
    return Math.max(180, Math.round(baseMin + random() * (baseMax - baseMin) + scoreFactor + jitter + personal));
  }

  function scheduledMinute(profile, dateKey) {
    const random = randomFor(`demo-clock:${profile.id}:${dateKey}`);
    let preferred = profile.daypart;
    if (random() < 0.34) preferred += random() < 0.5 ? -1 : 1;
    if (random() < 0.08) preferred += random() < 0.5 ? -2 : 2;
    preferred = Math.max(0, Math.min(DAYPARTS.length - 1, preferred));
    const [start, end] = DAYPARTS[preferred];
    return randomInt(random, start, end);
  }

  function currentSarajevoMinute() {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Sarajevo", hour: "2-digit", minute: "2-digit", hourCycle: "h23"
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return Number(values.hour || 0) * 60 + Number(values.minute || 0);
  }

  function demoResultFor(profile, dateKey) {
    const score = scoreFor(profile, dateKey);
    return {
      id: profile.id,
      name: profile.name,
      score,
      durationSeconds: durationFor(profile, dateKey, score),
      played: 1,
      isPlayer: false,
      demo: true,
      appearedMinute: scheduledMinute(profile, dateKey)
    };
  }

  function demoRowsForDay(dateKey) {
    if (dateKey < DEMO_START_DATE || dateKey > todayKey()) return [];
    const scheduled = scheduleForMonth(dateKey.slice(0, 7)).get(dateKey) || [];
    const today = todayKey();
    const nowMinute = dateKey === today ? currentSarajevoMinute() : 1440;
    return scheduled.map(profile => demoResultFor(profile, dateKey)).filter(row => row.appearedMinute <= nowMinute);
  }

  function datesBetween(start, end) {
    const dates = [];
    for (let key = start; key <= end; key = addDays(key, 1)) dates.push(key);
    return dates;
  }

  function aggregateDemoRows(view, anchor) {
    if (view === "daily30") return demoRowsForDay(anchor);
    let dates = [];
    const today = todayKey();
    if (view === "week") dates = datesBetween(anchor, addDays(anchor, 6)).filter(date => date <= today);
    else if (view === "month") {
      const count = daysInMonth(anchor.slice(0, 7));
      dates = Array.from({ length: count }, (_, i) => `${anchor.slice(0, 7)}-${String(i + 1).padStart(2, "0")}`).filter(date => date <= today && date >= DEMO_START_DATE);
    } else {
      dates = datesBetween(DEMO_START_DATE, today);
    }

    const totals = new Map();
    dates.forEach(dateKey => {
      demoRowsForDay(dateKey).forEach(row => {
        const current = totals.get(row.id) || { id: row.id, name: row.name, score: 0, durationSeconds: 0, played: 0, isPlayer: false, demo: true };
        current.score += row.score;
        current.durationSeconds += row.durationSeconds;
        current.played += 1;
        totals.set(row.id, current);
      });
    });
    return [...totals.values()];
  }

  function initials(name) {
    return String(name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase() || "").join("") || "?";
  }

  function startOfWeek(key) {
    const date = parseKey(key);
    const offset = (date.getUTCDay() + 6) % 7;
    date.setUTCDate(date.getUTCDate() - offset);
    return keyOf(date);
  }

  function currentPeriodAnchor(view) {
    const today = todayKey();
    if (view === "week") return startOfWeek(today);
    if (view === "month") return monthStart(today);
    return today;
  }

  function oldestDailyAnchor() { return addDays(todayKey(), -(DAILY_HISTORY_DAYS - 1)); }

  function clampDailyAnchor(anchor) {
    const today = todayKey();
    const oldest = oldestDailyAnchor();
    if (anchor > today) return today;
    if (anchor < oldest) return oldest;
    return anchor;
  }

  function periodLabel(view, anchor) {
    const locale = lang() === "en" ? "en-GB" : "hr-HR";
    const formatDay = key => new Intl.DateTimeFormat(locale, { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" }).format(parseKey(key));
    if (view === "daily30") return window.KvizDaily30?.formatFullDate?.(anchor) || formatDay(anchor);
    if (view === "week") return `${formatDay(anchor)} – ${formatDay(addDays(anchor, 6))}`;
    if (view === "month") {
      const value = new Intl.DateTimeFormat(locale, { timeZone: "UTC", month: "long", year: "numeric" }).format(parseKey(anchor));
      return value.charAt(0).toUpperCase() + value.slice(1);
    }
    return "";
  }

  function formatLeaderboardDuration(totalSeconds) {
    const seconds = Math.max(0, Math.round(Number(totalSeconds) || 0));
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const rest = seconds % 60;
    if (days > 0) return `${days}d ${hours}h ${minutes}min`;
    if (hours > 0) return `${hours}h ${minutes}m ${rest}s`;
    if (minutes > 0) return `${minutes}m ${rest}s`;
    return `${rest}s`;
  }

  function localRows(view, anchor) {
    const results = window.KvizDaily30?.getResults?.() || {};
    const name = window.KvizDaily30?.getPublicPlayerName?.() || (lang() === "en" ? "Your score" : "Tvoj rezultat");
    if (view === "daily30") {
      const result = results[anchor];
      return result?.official ? [{ id: "local-player", name, score: Number(result.score) || 0, durationSeconds: Number(result.durationSeconds) || 0, played: 1, isPlayer: true }] : [];
    }
    const dates = Object.keys(results).filter(date => {
      if (!results[date]?.official) return false;
      if (view === "week") return date >= anchor && date <= addDays(anchor, 6);
      if (view === "month") return date.startsWith(anchor.slice(0, 7));
      return true;
    });
    if (!dates.length) return [];
    return [{
      id: "local-player",
      name,
      score: dates.reduce((sum, date) => sum + (Number(results[date]?.score) || 0), 0),
      durationSeconds: dates.reduce((sum, date) => sum + (Number(results[date]?.durationSeconds) || 0), 0),
      played: dates.length,
      isPlayer: true
    }];
  }

  function rankedRows(view, anchor) {
    const rows = [...aggregateDemoRows(view, anchor), ...localRows(view, anchor)];
    rows.sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      if (left.durationSeconds !== right.durationSeconds) return left.durationSeconds - right.durationSeconds;
      return left.name.localeCompare(right.name, "hr");
    });
    return rows.map((row, index) => ({ ...row, rank: index + 1 }));
  }

  function valueText(row, view) {
    const duration = formatLeaderboardDuration(row.durationSeconds);
    if (view === "daily30") return `${row.score}/30 · ${duration}`;
    const correct = lang() === "en" ? "correct" : "točnih";
    return `${row.score} ${correct} · ${duration}`;
  }

  function rowHtml(row, view) {
    const medal = row.rank === 1 ? "🥇" : row.rank === 2 ? "🥈" : row.rank === 3 ? "🥉" : String(row.rank);
    const tone = row.rank === 1 ? " leaderboard-row--gold" : row.rank === 2 ? " leaderboard-row--silver" : row.rank === 3 ? " leaderboard-row--bronze" : "";
    const player = row.isPlayer ? " leaderboard-row--player" : "";
    return `<div class="leaderboard-row${tone}${player}" data-player="${row.isPlayer ? "true" : "false"}">
      <div class="leaderboard-rank${row.rank <= 3 ? " medal" : ""}">${medal}</div>
      <div class="leaderboard-avatar">${escapeHtml(initials(row.name))}</div>
      <div class="leaderboard-player-name">${escapeHtml(row.name)}</div>
      <div class="leaderboard-value">${escapeHtml(valueText(row, view))}</div>
    </div>`;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  function tabLabels() {
    return lang() === "en"
      ? { daily30: "Daily 30", week: "This week", month: "This month", all: "All time" }
      : { daily30: "Dnevnih 30", week: "Ovaj tjedan", month: "Ovaj mjesec", all: "Svih vremena" };
  }

  function syncTabs(root, view) {
    if (!root) return;
    const labels = tabLabels();
    root.querySelectorAll("[data-leaderboard-view]").forEach(button => {
      const buttonView = button.getAttribute("data-leaderboard-view");
      button.classList.toggle("active", buttonView === view);
      button.textContent = labels[buttonView] || buttonView;
    });
  }

  function renderPreview() {
    const root = document.getElementById("leaderboard-preview");
    const list = document.getElementById("leaderboard-preview-list");
    if (!root || !list) return;
    if (!previewState.anchor) previewState.anchor = currentPeriodAnchor(previewState.view);
    if (previewState.view === "daily30") previewState.anchor = clampDailyAnchor(previewState.anchor);
    syncTabs(root, previewState.view);
    const period = document.getElementById("leaderboard-preview-period");
    if (period) period.textContent = previewState.view === "all" ? "" : periodLabel(previewState.view, previewState.anchor);
    const rows = rankedRows(previewState.view, previewState.anchor);
    const top = rows.slice(0, 5);
    list.innerHTML = top.length ? top.map(row => rowHtml(row, previewState.view)).join("") : `<div class="leaderboard-empty">${lang() === "en" ? "No results yet." : "Još nema rezultata."}</div>`;
    const own = rows.find(row => row.isPlayer);
    const ownRoot = document.getElementById("leaderboard-preview-own");
    if (ownRoot) {
      const visible = Boolean(own && own.rank > 5);
      ownRoot.classList.toggle("visible", visible);
      ownRoot.innerHTML = visible ? rowHtml(own, previewState.view) : "";
    }
    const link = document.getElementById("leaderboard-more-link");
    if (link) {
      link.textContent = lang() === "en" ? "View full leaderboard" : "Prikaži cijelu ljestvicu";
      link.href = `ljestvice.html?view=${encodeURIComponent(previewState.view)}&date=${encodeURIComponent(previewState.anchor)}`;
    }
  }

  function renderPage() {
    const root = document.getElementById("leaderboard-page");
    const list = document.getElementById("leaderboard-full-list");
    if (!root || !list) return;
    if (!pageState.anchor) pageState.anchor = currentPeriodAnchor(pageState.view);
    if (pageState.view === "daily30") pageState.anchor = clampDailyAnchor(pageState.anchor);
    syncTabs(root, pageState.view);
    const periodRoot = document.getElementById("leaderboard-full-period");
    const periodLabelRoot = document.getElementById("leaderboard-full-period-label");
    periodRoot?.classList.toggle("is-all-time", pageState.view === "all");
    if (periodLabelRoot) periodLabelRoot.textContent = periodLabel(pageState.view, pageState.anchor);
    const rows = rankedRows(pageState.view, pageState.anchor);
    list.innerHTML = rows.length ? rows.map(row => rowHtml(row, pageState.view)).join("") : `<div class="leaderboard-empty">${lang() === "en" ? "No results yet." : "Još nema rezultata."}</div>`;
    const prev = document.getElementById("leaderboard-period-prev");
    const next = document.getElementById("leaderboard-period-next");
    if (prev) prev.disabled = pageState.view === "all" || (pageState.view === "daily30" && pageState.anchor <= oldestDailyAnchor());
    if (next) next.disabled = pageState.view === "all" || pageState.anchor >= currentPeriodAnchor(pageState.view);
  }

  function setView(targetState, view) {
    targetState.view = ["daily30", "week", "month", "all"].includes(view) ? view : "daily30";
    targetState.anchor = currentPeriodAnchor(targetState.view);
  }

  function shiftPagePeriod(direction) {
    if (pageState.view === "all") return;
    let next = pageState.anchor;
    if (pageState.view === "daily30") next = clampDailyAnchor(addDays(next, direction));
    if (pageState.view === "week") next = addDays(next, direction * 7);
    if (pageState.view === "month") next = addMonths(next, direction);
    if (direction > 0 && next > currentPeriodAnchor(pageState.view)) next = currentPeriodAnchor(pageState.view);
    pageState.anchor = next;
    renderPage();
  }

  function initPreview() {
    const root = document.getElementById("leaderboard-preview");
    if (!root) return;
    setView(previewState, "daily30");
    root.querySelectorAll("[data-leaderboard-view]").forEach(button => {
      button.addEventListener("click", () => {
        setView(previewState, button.getAttribute("data-leaderboard-view"));
        renderPreview();
      });
    });
    renderPreview();
  }

  function initPage() {
    const root = document.getElementById("leaderboard-page");
    if (!root) return;
    const params = new URLSearchParams(location.search);
    setView(pageState, params.get("view") || "daily30");
    const requestedDate = params.get("date");
    if (requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate) && pageState.view !== "all") {
      pageState.anchor = pageState.view === "week" ? startOfWeek(requestedDate) : pageState.view === "month" ? monthStart(requestedDate) : clampDailyAnchor(requestedDate);
    }
    root.querySelectorAll("[data-leaderboard-view]").forEach(button => {
      button.addEventListener("click", () => {
        setView(pageState, button.getAttribute("data-leaderboard-view"));
        renderPage();
      });
    });
    document.getElementById("leaderboard-period-prev")?.addEventListener("click", () => shiftPagePeriod(-1));
    document.getElementById("leaderboard-period-next")?.addEventListener("click", () => shiftPagePeriod(1));
    renderPage();
  }

  function refreshAll() { renderPreview(); renderPage(); }

  document.addEventListener("DOMContentLoaded", () => {
    initPreview();
    initPage();
    window.addEventListener("storage", event => {
      if (String(event.key || "").startsWith("kviztogo_daily30_results_v1")) refreshAll();
    });
    setInterval(refreshAll, 1000);
  });

  window.KvizLeaderboards = { refreshAll, renderPreview, renderPage, formatLeaderboardDuration };
})();
