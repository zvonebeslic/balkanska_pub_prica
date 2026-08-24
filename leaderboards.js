(function () {
  "use strict";

  const DEMO_PLAYERS = [
    "Kvizoman", "Lara", "Atlas", "Marko", "Marta", "Profesor", "Sova", "Radoznalac",
    "Una", "Leo", "Nikola", "Ena", "Lovro", "Klara", "Znalac", "Iva", "Noa", "Mia", "Nino", "Tena"
  ];

  const previewState = { view: "daily30", anchor: null };
  const pageState = { view: "daily30", anchor: null };

  function lang() { return document.documentElement.lang === "en" ? "en" : "hr"; }
  function todayKey() { return window.KvizDaily30?.zonedDateKey?.() || new Date().toISOString().slice(0, 10); }
  function parseKey(key) {
    const [year, month, day] = String(key).split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day, 12));
  }
  function keyOf(date) { return date.toISOString().slice(0, 10); }
  function addDays(key, amount) { const date = parseKey(key); date.setUTCDate(date.getUTCDate() + amount); return keyOf(date); }
  function addMonths(key, amount) { const date = parseKey(key); date.setUTCDate(1); date.setUTCMonth(date.getUTCMonth() + amount); return keyOf(date); }

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
      value ^= value << 13;
      value ^= value >>> 17;
      value ^= value << 5;
      return (value >>> 0) / 4294967296;
    };
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

  function monthStart(key) { return `${String(key).slice(0, 7)}-01`; }

  function currentPeriodAnchor(view) {
    const today = todayKey();
    if (view === "week") return startOfWeek(today);
    if (view === "month") return monthStart(today);
    return today;
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

  function demoRows(view, anchor) {
    return DEMO_PLAYERS.map((name, index) => {
      const random = randomFor(`${view}:${anchor}:${name}:${index}`);
      if (view === "daily30") {
        return { id: `demo-${index}`, name, score: 18 + Math.floor(random() * 13), durationSeconds: 175 + Math.floor(random() * 620), isPlayer: false };
      }
      const base = view === "week" ? 75 : view === "month" ? 260 : 2800;
      const range = view === "week" ? 260 : view === "month" ? 950 : 9000;
      return { id: `demo-${index}`, name, score: base + Math.floor(random() * range), durationSeconds: 0, isPlayer: false };
    });
  }

  function localRows(view, anchor) {
    const results = window.KvizDaily30?.getResults?.() || {};
    const name = window.KvizDaily30?.getPublicPlayerName?.() || (lang() === "en" ? "Your score" : "Tvoj rezultat");
    if (view === "daily30") {
      const result = results[anchor];
      return result?.official ? [{ id: "local-player", name, score: Number(result.score) || 0, durationSeconds: Number(result.durationSeconds) || 0, isPlayer: true }] : [];
    }

    const dates = Object.keys(results).filter(date => {
      if (!results[date]?.official) return false;
      if (view === "week") return date >= anchor && date <= addDays(anchor, 6);
      if (view === "month") return date.startsWith(anchor.slice(0, 7));
      return true;
    });
    if (!dates.length) return [];
    const score = dates.reduce((sum, date) => sum + (Number(results[date]?.score) || 0), 0);
    return [{ id: "local-player", name, score, durationSeconds: 0, isPlayer: true }];
  }

  function rankedRows(view, anchor) {
    const rows = [...demoRows(view, anchor), ...localRows(view, anchor)];
    rows.sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      if (view === "daily30" && left.durationSeconds !== right.durationSeconds) return left.durationSeconds - right.durationSeconds;
      return left.name.localeCompare(right.name, "hr");
    });
    return rows.map((row, index) => ({ ...row, rank: index + 1 }));
  }

  function valueText(row, view) {
    if (view === "daily30") return `${row.score}/30 · ${window.KvizDaily30?.formatDuration?.(row.durationSeconds) || row.durationSeconds + "s"}`;
    return lang() === "en" ? `${row.score} correct` : `${row.score} točnih`;
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
    syncTabs(root, previewState.view);
    const period = document.getElementById("leaderboard-preview-period");
    if (period) period.textContent = previewState.view === "all" ? "" : periodLabel(previewState.view, previewState.anchor);

    const rows = rankedRows(previewState.view, previewState.anchor);
    const top = rows.slice(0, 5);
    list.innerHTML = top.map(row => rowHtml(row, previewState.view)).join("");
    const own = rows.find(row => row.isPlayer);
    const ownRoot = document.getElementById("leaderboard-preview-own");
    if (ownRoot) {
      const visible = Boolean(own && own.rank > 5);
      ownRoot.classList.toggle("visible", visible);
      ownRoot.innerHTML = visible ? rowHtml(own, previewState.view) : "";
    }
    const link = document.getElementById("leaderboard-more-link");
    if (link) {
      const label = lang() === "en" ? "View full leaderboard" : "Prikaži cijelu ljestvicu";
      link.textContent = label;
      link.href = `ljestvice.html?view=${encodeURIComponent(previewState.view)}&date=${encodeURIComponent(previewState.anchor)}`;
    }
  }

  function renderPage() {
    const root = document.getElementById("leaderboard-page");
    const list = document.getElementById("leaderboard-full-list");
    if (!root || !list) return;
    if (!pageState.anchor) pageState.anchor = currentPeriodAnchor(pageState.view);
    syncTabs(root, pageState.view);
    const periodRoot = document.getElementById("leaderboard-full-period");
    const periodLabelRoot = document.getElementById("leaderboard-full-period-label");
    periodRoot?.classList.toggle("is-all-time", pageState.view === "all");
    if (periodLabelRoot) periodLabelRoot.textContent = periodLabel(pageState.view, pageState.anchor);

    const rows = rankedRows(pageState.view, pageState.anchor);
    list.innerHTML = rows.length ? rows.map(row => rowHtml(row, pageState.view)).join("") : `<div class="leaderboard-empty">${lang() === "en" ? "No results yet." : "Još nema rezultata."}</div>`;
    const next = document.getElementById("leaderboard-period-next");
    if (next) next.disabled = pageState.view === "all" || pageState.anchor >= currentPeriodAnchor(pageState.view);
  }

  function setView(targetState, view) {
    targetState.view = ["daily30", "week", "month", "all"].includes(view) ? view : "daily30";
    targetState.anchor = currentPeriodAnchor(targetState.view);
  }

  function shiftPagePeriod(direction) {
    if (pageState.view === "all") return;
    let next = pageState.anchor;
    if (pageState.view === "daily30") next = addDays(next, direction);
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
      pageState.anchor = pageState.view === "week" ? startOfWeek(requestedDate) : pageState.view === "month" ? monthStart(requestedDate) : requestedDate;
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
  });

  window.KvizLeaderboards = { refreshAll, renderPreview, renderPage };
})();
