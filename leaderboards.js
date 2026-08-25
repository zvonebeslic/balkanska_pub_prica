(function () {
  "use strict";

  const previewState = { view: "daily30", anchor: null };
  const pageState = { view: "daily30", anchor: null };
  const DAILY_HISTORY_DAYS = 7;

  function lang() { return document.documentElement.lang === "en" ? "en" : "hr"; }
  function todayKey() { return window.KvizDaily30?.zonedDateKey?.() || new Date().toISOString().slice(0, 10); }
  function parseKey(key) {
    const [year, month, day] = String(key).split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day, 12));
  }
  function keyOf(date) { return date.toISOString().slice(0, 10); }
  function addDays(key, amount) { const date = parseKey(key); date.setUTCDate(date.getUTCDate() + amount); return keyOf(date); }
  function addMonths(key, amount) { const date = parseKey(key); date.setUTCDate(1); date.setUTCMonth(date.getUTCMonth() + amount); return keyOf(date); }

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
      return result?.official ? [{
        id: "local-player",
        name,
        score: Number(result.score) || 0,
        durationSeconds: Number(result.durationSeconds) || 0,
        played: 1,
        isPlayer: true
      }] : [];
    }

    const dates = Object.keys(results).filter(date => {
      if (!results[date]?.official) return false;
      if (view === "week") return date >= anchor && date <= addDays(anchor, 6);
      if (view === "month") return date.startsWith(anchor.slice(0, 7));
      return true;
    });

    if (!dates.length) return [];

    const score = dates.reduce((sum, date) => sum + (Number(results[date]?.score) || 0), 0);
    const durationSeconds = dates.reduce((sum, date) => sum + (Number(results[date]?.durationSeconds) || 0), 0);

    return [{ id: "local-player", name, score, durationSeconds, played: dates.length, isPlayer: true }];
  }

  function rankedRows(view, anchor) {
    const rows = localRows(view, anchor);
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

    const ownRoot = document.getElementById("leaderboard-preview-own");
    if (ownRoot) {
      ownRoot.classList.remove("visible");
      ownRoot.innerHTML = "";
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
