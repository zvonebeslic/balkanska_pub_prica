(function () {
  "use strict";

  const TIME_ZONE = "Europe/Sarajevo";
  const INDEX_URL = "daily30/index.json";
  const MANIFEST_URL = "daily30/questions-manifest.json";
  const RESULTS_BASE_KEY = "kviztogo_daily30_results_v1";
  const GUEST_IDENTITY_KEY = "kviztogo_guest_identity_v1";
  const PLAYER_CONTEXT_KEY = "kviztogo_daily30_player_context_v1";

  const state = {
    index: null,
    availableDates: new Set(),
    selectedDate: null,
    selectedView: "today",
    calendarMonth: null,
    activeDate: null,
    activeQuestions: [],
    playerContext: null,
    stopwatchStartedAt: null,
    stopwatchElapsedMs: 0,
    stopwatchInterval: null,
    countdownInterval: null,
    nextMidnightAt: null
  };

  const copy = {
    hr: {
      currentReady: "Današnji set od 30 pitanja spreman je za igru.",
      archiveReady: "Odaberi datum pa pokreni kviz u glavnom oblačiću.",
      notPlayed: "Nije odigrano",
      played: "Odigrano",
      loading: "Učitavam dnevni set…",
      unavailable: "Dnevni set trenutačno nije dostupan. Pokušaj ponovno za nekoliko trenutaka.",
      locked: "Zaključano do tog datuma",
      result: "Rezultat",
      time: "vrijeme"
    },
    en: {
      currentReady: "Today's set of 30 questions is ready to play.",
      archiveReady: "Choose a date, then start the quiz in the main card.",
      notPlayed: "Not played",
      played: "Played",
      loading: "Loading the daily set…",
      unavailable: "The daily set is currently unavailable. Please try again shortly.",
      locked: "Locked until this date",
      result: "Score",
      time: "time"
    }
  };

  function language() {
    try { return typeof currentLang !== "undefined" && currentLang === "en" ? "en" : "hr"; }
    catch { return document.documentElement.lang === "en" ? "en" : "hr"; }
  }

  function text(key) { return copy[language()]?.[key] || copy.hr[key] || key; }

  function zonedDateKey(date = new Date()) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  }

  function parseDateKey(dateKey) {
    const [year, month, day] = String(dateKey).split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day, 12));
  }

  function addDays(dateKey, amount) {
    const date = parseDateKey(dateKey);
    date.setUTCDate(date.getUTCDate() + amount);
    return date.toISOString().slice(0, 10);
  }

  function formatFullDate(dateKey) {
    return new Intl.DateTimeFormat(language() === "en" ? "en-GB" : "hr-HR", {
      timeZone: "UTC",
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(parseDateKey(dateKey));
  }

  function formatMonth(dateKey) {
    const value = new Intl.DateTimeFormat(language() === "en" ? "en-GB" : "hr-HR", {
      timeZone: "UTC",
      month: "long",
      year: "numeric"
    }).format(parseDateKey(dateKey));
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function formatDuration(totalSeconds) {
    const seconds = Math.max(0, Math.round(Number(totalSeconds) || 0));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const rest = seconds % 60;
    if (hours) return `${hours}:${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
    return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
  }

  function resultStorageKey() {
    const context = getPlayerContext();
    if (context && !context.isGuest && context.userId) return `${RESULTS_BASE_KEY}:user:${context.userId}`;
    if (context?.isGuest && context.guestId) return `${RESULTS_BASE_KEY}:guest:${context.guestId}`;
    try {
      if (typeof playerIdentity !== "undefined" && playerIdentity && !playerIdentity.isGuest && playerIdentity.userId) {
        return `${RESULTS_BASE_KEY}:user:${playerIdentity.userId}`;
      }
      if (typeof getOrCreateGuestIdentity === "function") {
        return `${RESULTS_BASE_KEY}:guest:${getOrCreateGuestIdentity().id}`;
      }
    } catch (_) {}
    return `${RESULTS_BASE_KEY}:device`;
  }

  function loadResults() {
    try {
      const value = JSON.parse(localStorage.getItem(resultStorageKey()) || "null");
      return value && typeof value === "object" ? value : {};
    } catch {
      return {};
    }
  }

  function saveResults(results) {
    try { localStorage.setItem(resultStorageKey(), JSON.stringify(results)); }
    catch (error) { console.warn("Dnevnih 30 rezultat nije spremljen:", error); }
  }

  function getCustomGuestName() {
    try {
      const identity = JSON.parse(localStorage.getItem(GUEST_IDENTITY_KEY) || "null");
      const name = String(identity?.displayName || "").trim();
      return name || null;
    } catch {
      return null;
    }
  }

  function getPublicPlayerName() {
    const context = getPlayerContext();
    if (context?.name) return context.name;
    try {
      if (typeof playerIdentity !== "undefined" && playerIdentity && !playerIdentity.isGuest) {
        return String(playerIdentity.name || "Kvizoman").trim() || "Kvizoman";
      }
    } catch (_) {}
    return getCustomGuestName() || (language() === "en" ? "Your score" : "Tvoj rezultat");
  }

  function getPlayerContext() {
    if (state.playerContext) return state.playerContext;
    try {
      const saved = JSON.parse(localStorage.getItem(PLAYER_CONTEXT_KEY) || "null");
      if (saved && typeof saved === "object") state.playerContext = saved;
    } catch (_) {}
    return state.playerContext;
  }

  function setPlayerContext(identity) {
    if (!identity || typeof identity !== "object") return;
    let guestId = null;
    if (identity.isGuest) {
      try {
        const saved = JSON.parse(localStorage.getItem(GUEST_IDENTITY_KEY) || "null");
        guestId = saved?.id || null;
      } catch (_) {}
    }
    state.playerContext = {
      isGuest: Boolean(identity.isGuest),
      userId: identity.userId || null,
      guestId,
      name: String(identity.isGuest ? (getCustomGuestName() || "") : (identity.name || "")).trim().slice(0, 40)
    };
    try { localStorage.setItem(PLAYER_CONTEXT_KEY, JSON.stringify(state.playerContext)); } catch (_) {}
  }

  function findNextMidnight(now = Date.now()) {
    const currentKey = zonedDateKey(new Date(now));
    let low = now;
    let high = now + 30 * 60 * 60 * 1000;
    for (let index = 0; index < 42; index += 1) {
      const middle = Math.floor((low + high) / 2);
      if (zonedDateKey(new Date(middle)) === currentKey) low = middle + 1;
      else high = middle;
    }
    return high;
  }

  function renderCountdown() {
    const element = document.getElementById("daily30-countdown");
    if (!element) return;
    const now = Date.now();
    if (!state.nextMidnightAt || now >= state.nextMidnightAt + 1000) {
      state.nextMidnightAt = findNextMidnight(now);
      const currentDate = zonedDateKey();
      if (state.selectedView === "today") state.selectedDate = currentDate;
      void loadIndex(true).then(() => {
        updateSelectionNote();
        renderCalendar();
        try { if (typeof updateModeLabel === "function") updateModeLabel(); } catch (_) {}
      });
    }
    const remaining = Math.max(0, Math.ceil((state.nextMidnightAt - now) / 1000));
    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    const seconds = remaining % 60;
    element.textContent = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  async function loadIndex(force = false) {
    if (state.index && !force) return state.index;
    try {
      const response = await fetch(`${INDEX_URL}${force ? `?v=${Date.now()}` : ""}`, { cache: force ? "no-store" : "default" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const value = await response.json();
      state.index = value;
      state.availableDates = new Set(Array.isArray(value.dates) ? value.dates : []);
      return value;
    } catch (error) {
      console.warn("Arhiva Dnevnih 30 nije učitana:", error);
      return state.index;
    }
  }

  function hashString(value) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }

  function createRandom(seedText) {
    let seed = 1779033703 ^ seedText.length;
    for (let index = 0; index < seedText.length; index += 1) {
      seed = Math.imul(seed ^ seedText.charCodeAt(index), 3432918353);
      seed = (seed << 13) | (seed >>> 19);
    }
    seed = Math.imul(seed ^ (seed >>> 16), 2246822507);
    seed = Math.imul(seed ^ (seed >>> 13), 3266489909);
    let value = (seed ^ (seed >>> 16)) >>> 0;
    return () => {
      value += 0x6d2b79f5;
      let result = value;
      result = Math.imul(result ^ (result >>> 15), result | 1);
      result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
      return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffled(items, random) {
    const copy = items.slice();
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }
    return copy;
  }

  async function generateFallbackSet(dateKey) {
    const manifestResponse = await fetch(MANIFEST_URL);
    if (!manifestResponse.ok) throw new Error("Manifest pitanja nije dostupan.");
    const manifest = await manifestResponse.json();
    const files = Array.isArray(manifest.files) ? manifest.files : [];
    const collections = await Promise.all(files.map(async fileName => {
      const response = await fetch(fileName);
      if (!response.ok) return [];
      const value = await response.json();
      return Array.isArray(value) ? value.map((question, index) => ({ fileName, question, index })) : [];
    }));

    const seen = new Set();
    const pool = [];
    collections.flat().forEach(({ fileName, question, index }) => {
      if (!question?.question || !Array.isArray(question.answers) || !question.answers.length) return;
      const normalized = String(question.question).toLocaleLowerCase("hr").replace(/\s+/g, " ").trim();
      if (!normalized || seen.has(normalized)) return;
      seen.add(normalized);
      const topic = String(question.topic || fileName.replace(/\.json$/i, "") || "Ostalo").trim();
      pool.push({
        topic,
        value: {
          ...question,
          id: `daily-${hashString(`${fileName}:${question.id ?? index}:${normalized}`)}`,
          type: question.type || "blitz",
          topic,
          image: question.image || null
        }
      });
    });

    const byTopic = new Map();
    pool.forEach(item => {
      if (!byTopic.has(item.topic)) byTopic.set(item.topic, []);
      byTopic.get(item.topic).push(item.value);
    });
    const topics = shuffled([...byTopic.keys()], createRandom(`kviztogo-daily-topics:${dateKey}`));
    const queues = new Map(topics.map(topic => [topic, shuffled(byTopic.get(topic), createRandom(`kviztogo-daily:${dateKey}:${topic}`))]));
    const chosen = [];
    let round = 0;
    while (chosen.length < 30 && topics.some(topic => queues.get(topic).length > round)) {
      shuffled(topics, createRandom(`kviztogo-round:${dateKey}:${round}`)).forEach(topic => {
        if (chosen.length >= 30) return;
        const question = queues.get(topic)[round];
        if (question) chosen.push(question);
      });
      round += 1;
    }
    return shuffled(chosen, createRandom(`kviztogo-order:${dateKey}`));
  }

  async function loadSet(dateKey) {
    try {
      const response = await fetch(`daily30/${dateKey}.json`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const value = await response.json();
      if (!Array.isArray(value.questions) || value.questions.length !== 30) throw new Error("Neispravan dnevni set.");
      return value.questions;
    } catch (error) {
      console.warn(`Spremljeni dnevni set ${dateKey} nije učitan; koristim determinističku rezervu.`, error);
      const questions = await generateFallbackSet(dateKey);
      if (questions.length !== 30) throw new Error("Nije moguće pripremiti 30 dnevnih pitanja.");
      return questions;
    }
  }

  async function prepareSelectedRound() {
    const note = document.getElementById("daily30-selection-note");
    if (note) note.textContent = text("loading");
    try {
      const dateKey = state.selectedDate || zonedDateKey();
      state.activeQuestions = await loadSet(dateKey);
      state.activeDate = dateKey;
      if (note) updateSelectionNote();
      return true;
    } catch (error) {
      console.error("Dnevnih 30 nije pripremljen:", error);
      if (note) note.textContent = text("unavailable");
      return false;
    }
  }

  function getActiveQuestions() { return state.activeQuestions.slice(); }
  function getActiveDate() { return state.activeDate || state.selectedDate || zonedDateKey(); }
  function getSelectedDate() { return state.selectedDate || zonedDateKey(); }

  function resetStopwatch() {
    stopStopwatch();
    state.stopwatchElapsedMs = 0;
    state.stopwatchStartedAt = null;
    renderStopwatch();
  }

  function startStopwatch() {
    resetStopwatch();
    state.stopwatchStartedAt = Date.now();
    state.stopwatchInterval = window.setInterval(renderStopwatch, 100);
    renderStopwatch();
  }

  function stopStopwatch() {
    if (state.stopwatchStartedAt) {
      state.stopwatchElapsedMs += Date.now() - state.stopwatchStartedAt;
      state.stopwatchStartedAt = null;
    }
    if (state.stopwatchInterval) {
      window.clearInterval(state.stopwatchInterval);
      state.stopwatchInterval = null;
    }
    renderStopwatch();
  }

  function elapsedMs() {
    return state.stopwatchElapsedMs + (state.stopwatchStartedAt ? Date.now() - state.stopwatchStartedAt : 0);
  }

  function renderStopwatch() {
    let modeIsDaily = false;
    try { modeIsDaily = typeof currentMode !== "undefined" && currentMode === "daily30"; } catch (_) {}
    if (!modeIsDaily) return;
    const element = document.getElementById("timer-value");
    const pill = document.getElementById("timer-pill");
    if (pill) pill.style.opacity = "1";
    if (!element) return;
    const tenths = Math.floor(elapsedMs() / 100);
    const minutes = Math.floor(tenths / 600);
    const seconds = Math.floor((tenths % 600) / 10);
    element.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${tenths % 10}`;
  }

  function complete(score, total) {
    stopStopwatch();
    const dateKey = getActiveDate();
    const today = zonedDateKey();
    const durationSeconds = Math.max(1, Math.round(elapsedMs() / 1000));
    const results = loadResults();
    const previous = results[dateKey] || null;
    const official = dateKey === today && !previous?.official;
    const candidate = {
      date: dateKey,
      score: Math.max(0, Number(score) || 0),
      total: Math.max(0, Number(total) || 30),
      durationSeconds,
      completedAt: new Date().toISOString(),
      official,
      attempts: Math.max(0, Number(previous?.attempts) || 0) + 1
    };

    if (previous?.official) {
      results[dateKey] = { ...previous, attempts: candidate.attempts, lastPractice: candidate };
    } else {
      const previousIsBetter = previous && (
        Number(previous.score) > candidate.score ||
        (Number(previous.score) === candidate.score && Number(previous.durationSeconds) <= candidate.durationSeconds)
      );
      results[dateKey] = previousIsBetter
        ? { ...previous, attempts: candidate.attempts, lastPractice: candidate }
        : candidate;
    }
    saveResults(results);
    renderCalendar();
    updateSelectionNote();
    showNameCardIfNeeded();
    window.KvizLeaderboards?.refreshAll?.();
    return results[dateKey];
  }

  function getResult(dateKey) { return loadResults()[dateKey] || null; }

  function updateSelectionNote() {
    const note = document.getElementById("daily30-selection-note");
    if (!note) return;
    const selectedDate = getSelectedDate();
    const result = getResult(selectedDate);
    if (result) {
      note.textContent = `${formatFullDate(selectedDate)} · ${text("played")}: ${result.score}/${result.total} · ${formatDuration(result.durationSeconds)}`;
      return;
    }
    note.textContent = state.selectedView === "today"
      ? text("currentReady")
      : `${formatFullDate(selectedDate)} · ${text("notPlayed")}`;
  }

  function showNameCardIfNeeded(force = false) {
    const card = document.getElementById("daily30-name-card");
    if (!card) return;
    let isGuest = true;
    try { isGuest = typeof playerIdentity === "undefined" || playerIdentity.isGuest; } catch (_) {}
    card.classList.toggle("open", Boolean(isGuest && (force || !getCustomGuestName())));
    const editButton = document.getElementById("daily30-name-edit");
    if (editButton) editButton.hidden = !isGuest;
    const input = document.getElementById("daily30-name-input");
    if (input && getCustomGuestName()) input.value = getCustomGuestName();
    if (force && isGuest) window.setTimeout(() => input?.focus(), 0);
  }

  function renderCalendar() {
    const daysRoot = document.getElementById("daily30-days");
    const monthLabel = document.getElementById("daily30-month-label");
    if (!daysRoot || !monthLabel) return;

    const currentDate = zonedDateKey();
    const monthKey = state.calendarMonth || getSelectedDate().slice(0, 7) + "-01";
    state.calendarMonth = monthKey;
    monthLabel.textContent = formatMonth(monthKey);
    daysRoot.innerHTML = "";

    const monthDate = parseDateKey(monthKey);
    const year = monthDate.getUTCFullYear();
    const month = monthDate.getUTCMonth();
    const firstDayMondayIndex = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const results = loadResults();

    for (let index = 0; index < firstDayMondayIndex; index += 1) {
      const spacer = document.createElement("div");
      spacer.className = "daily30-day-spacer";
      daysRoot.appendChild(spacer);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const available = state.availableDates.has(dateKey) || dateKey === currentDate;
      const locked = available && dateKey > currentDate;
      const result = results[dateKey];
      const button = document.createElement("button");
      button.type = "button";
      button.className = "daily30-day";
      button.disabled = !available || locked;
      button.classList.toggle("today", dateKey === currentDate);
      button.classList.toggle("selected", dateKey === getSelectedDate());
      button.classList.toggle("played", Boolean(result));
      button.classList.toggle("locked", locked);
      if (locked) {
        button.setAttribute("aria-label", `${formatFullDate(dateKey)} · ${text("locked")}`);
        button.title = text("locked");
      }
      button.innerHTML = `<span class="daily30-day-number">${day}</span>${locked ? `<span class="daily30-day-lock" aria-hidden="true">🔒</span>` : (result ? `<span class="daily30-day-result">${text("played")}</span><span class="daily30-day-time">${result.score}/${result.total} · ${formatDuration(result.durationSeconds)}</span>` : "")}`;
      if (!button.disabled) {
        button.addEventListener("click", () => {
          state.selectedDate = dateKey;
          state.selectedView = dateKey === currentDate ? "today" : "archive";
          syncChoiceButtons();
          renderCalendar();
          updateSelectionNote();
          state.activeQuestions = [];
          state.activeDate = null;
          try {
            if (typeof resetQuestionQueue === "function") resetQuestionQueue();
            if (typeof updateModeLabel === "function") updateModeLabel();
          } catch (_) {}
        });
      }
      daysRoot.appendChild(button);
    }

    const previousButton = document.getElementById("daily30-month-prev");
    const nextButton = document.getElementById("daily30-month-next");
    const launchMonth = String(state.index?.launchDate || "2026-07-01").slice(0, 7);
    const latestMonth = String(state.index?.latestDate || currentDate).slice(0, 7);
    if (previousButton) previousButton.disabled = monthKey.slice(0, 7) <= launchMonth;
    if (nextButton) nextButton.disabled = monthKey.slice(0, 7) >= latestMonth;
  }

  function shiftCalendarMonth(amount) {
    const date = parseDateKey(state.calendarMonth || `${zonedDateKey().slice(0, 7)}-01`);
    date.setUTCMonth(date.getUTCMonth() + amount);
    state.calendarMonth = date.toISOString().slice(0, 7) + "-01";
    renderCalendar();
  }

  function syncChoiceButtons() {
    const currentButton = document.getElementById("daily30-current-choice");
    const archiveButton = document.getElementById("daily30-archive-choice");
    const history = document.getElementById("daily30-history");
    const isArchive = state.selectedView === "archive";
    currentButton?.classList.toggle("active", !isArchive);
    archiveButton?.classList.toggle("active", isArchive);
    history?.classList.toggle("open", isArchive);
  }

  function selectToday() {
    const currentDate = zonedDateKey();
    state.selectedView = "today";
    state.selectedDate = currentDate;
    state.calendarMonth = `${currentDate.slice(0, 7)}-01`;
    state.activeQuestions = [];
    state.activeDate = null;
    syncChoiceButtons();
    renderCalendar();
    updateSelectionNote();
    try {
      if (typeof resetQuestionQueue === "function") resetQuestionQueue();
      if (typeof updateModeLabel === "function") updateModeLabel();
    } catch (_) {}
  }

  function selectArchive() {
    state.selectedView = "archive";
    const currentDate = zonedDateKey();
    if (!state.selectedDate || state.selectedDate === currentDate) {
      state.selectedDate = state.availableDates.has(addDays(currentDate, -1)) ? addDays(currentDate, -1) : currentDate;
    }
    state.calendarMonth = `${state.selectedDate.slice(0, 7)}-01`;
    state.activeQuestions = [];
    state.activeDate = null;
    syncChoiceButtons();
    renderCalendar();
    updateSelectionNote();
    try {
      if (typeof resetQuestionQueue === "function") resetQuestionQueue();
      if (typeof updateModeLabel === "function") updateModeLabel();
    } catch (_) {}
  }

  function onModeSelected() {
    document.getElementById("daily30-panel")?.classList.add("open");
    if (!state.selectedDate) selectToday();
    updateSelectionNote();
  }

  function onModeLeft() {
    document.getElementById("daily30-panel")?.classList.remove("open");
    stopStopwatch();
  }

  function afterLanguageChange() {
    updateSelectionNote();
    renderCalendar();
  }

  async function initOnline() {
    state.selectedDate = zonedDateKey();
    state.calendarMonth = `${state.selectedDate.slice(0, 7)}-01`;
    await loadIndex();

    document.getElementById("daily30-current-choice")?.addEventListener("click", selectToday);
    document.getElementById("daily30-archive-choice")?.addEventListener("click", selectArchive);
    document.getElementById("daily30-month-prev")?.addEventListener("click", () => shiftCalendarMonth(-1));
    document.getElementById("daily30-month-next")?.addEventListener("click", () => shiftCalendarMonth(1));
    document.getElementById("daily30-name-edit")?.addEventListener("click", () => showNameCardIfNeeded(true));
    document.getElementById("daily30-name-save")?.addEventListener("click", () => {
      const input = document.getElementById("daily30-name-input");
      const value = String(input?.value || "").trim();
      if (!value || typeof saveGuestLeaderboardName !== "function") return;
      if (saveGuestLeaderboardName(value)) {
        showNameCardIfNeeded(false);
        window.KvizLeaderboards?.refreshAll?.();
      }
    });

    renderCountdown();
    state.countdownInterval = window.setInterval(renderCountdown, 1000);
    syncChoiceButtons();
    renderCalendar();
    updateSelectionNote();
    showNameCardIfNeeded(false);
  }

  window.KvizDaily30 = {
    initOnline,
    onModeSelected,
    onModeLeft,
    afterLanguageChange,
    prepareSelectedRound,
    getActiveQuestions,
    getActiveDate,
    getSelectedDate,
    getResult,
    getResults: loadResults,
    getPublicPlayerName,
    setPlayerContext,
    formatDuration,
    formatFullDate,
    zonedDateKey,
    resetStopwatch,
    startStopwatch,
    stopStopwatch,
    renderStopwatch,
    elapsedSeconds: () => Math.max(0, Math.round(elapsedMs() / 1000)),
    complete,
    showNameCardIfNeeded,
    refreshCalendar: renderCalendar
  };
})();
