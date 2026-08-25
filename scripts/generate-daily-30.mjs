#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const outputDir = path.join(rootDir, "daily30");
const configPath = path.join(outputDir, "config.json");

const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const timeZone = config.timeZone || "Europe/Sarajevo";
const launchDate = config.launchDate;
const preparedThrough = config.preparedThrough || null;
const questionsPerDay = Math.max(1, Number(config.questionsPerDay) || 30);
const requestedDate = process.argv.find(arg => arg.startsWith("--date="))?.split("=")[1] || null;
const requestedFrom = process.argv.find(arg => arg.startsWith("--from="))?.split("=")[1] || launchDate;
const requestedThrough = process.argv.find(arg => arg.startsWith("--through="))?.split("=")[1] || preparedThrough;
const regenerate = process.argv.includes("--regenerate");
const backfill = process.argv.includes("--backfill");

function dateKeyInTimeZone(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function monthKey(dateKey) {
  return String(dateKey).slice(0, 7);
}

function addMonths(value, amount) {
  const [year, month] = monthKey(value).split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + amount, 1, 12));
  return date.toISOString().slice(0, 7);
}

function datesInMonth(value) {
  const key = monthKey(value);
  const [year, month] = key.split("-").map(Number);
  const dayCount = new Date(Date.UTC(year, month, 0, 12)).getUTCDate();
  return Array.from({ length: dayCount }, (_, index) => `${key}-${String(index + 1).padStart(2, "0")}`);
}

function monthsBetween(fromDate, throughDate) {
  if (!fromDate || !throughDate || monthKey(fromDate) > monthKey(throughDate)) return [];
  const months = [];
  for (let key = monthKey(fromDate); key <= monthKey(throughDate); key = addMonths(key, 1)) months.push(key);
  return months;
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function seedFromString(value) {
  let seed = 1779033703 ^ value.length;
  for (let index = 0; index < value.length; index += 1) {
    seed = Math.imul(seed ^ value.charCodeAt(index), 3432918353);
    seed = (seed << 13) | (seed >>> 19);
  }
  return () => {
    seed = Math.imul(seed ^ (seed >>> 16), 2246822507);
    seed = Math.imul(seed ^ (seed >>> 13), 3266489909);
    return (seed ^= seed >>> 16) >>> 0;
  };
}

function createRandom(seedText) {
  const seed = seedFromString(seedText)();
  let value = seed;
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

function looksLikeQuestionCollection(value) {
  return Array.isArray(value) && value.some(item =>
    item && typeof item === "object" && typeof item.question === "string" && Array.isArray(item.answers)
  );
}

function discoverQuestionFiles() {
  return fs.readdirSync(rootDir)
    .filter(fileName => fileName.toLowerCase().endsWith(".json"))
    .filter(fileName => {
      try {
        const value = JSON.parse(fs.readFileSync(path.join(rootDir, fileName), "utf8"));
        return looksLikeQuestionCollection(value);
      } catch {
        return false;
      }
    })
    .sort((left, right) => left.localeCompare(right, "hr"));
}

function loadQuestionPool(files) {
  const seenQuestions = new Set();
  const pool = [];

  files.forEach(fileName => {
    const source = path.basename(fileName, ".json");
    const data = JSON.parse(fs.readFileSync(path.join(rootDir, fileName), "utf8"));

    data.forEach((question, index) => {
      if (!question || typeof question.question !== "string" || !question.question.trim()) return;
      if (!Array.isArray(question.answers) || !question.answers.some(answer => String(answer || "").trim())) return;

      const normalizedText = question.question.toLocaleLowerCase("hr").replace(/\s+/g, " ").trim();
      if (seenQuestions.has(normalizedText)) return;
      seenQuestions.add(normalizedText);

      const sourceId = question.id ?? index;
      const topic = String(question.topic || source || "Ostalo").trim() || "Ostalo";
      pool.push({
        key: `${fileName}:${sourceId}:${hashString(normalizedText)}`,
        source: fileName,
        topic,
        question: {
          id: `daily-${hashString(`${fileName}:${sourceId}:${normalizedText}`)}`,
          type: question.type || "blitz",
          difficulty: Number.isFinite(Number(question.difficulty)) ? Number(question.difficulty) : 1,
          topic,
          question: question.question,
          answers: question.answers,
          image: question.image || null,
          ...(question.rarity ? { rarity: question.rarity } : {})
        }
      });
    });
  });

  return pool;
}

function selectMonthlyQuestions(pool, dates, excludedIds = new Set()) {
  const required = dates.length * questionsPerDay;
  const eligible = pool.filter(item => !excludedIds.has(item.question.id));
  if (eligible.length < required) {
    throw new Error(`Za ${dates[0]?.slice(0, 7)} treba ${required} novih pitanja, a dostupno ih je ${eligible.length}.`);
  }

  const byTopic = new Map();
  eligible.forEach(item => {
    if (!byTopic.has(item.topic)) byTopic.set(item.topic, []);
    byTopic.get(item.topic).push(item);
  });

  const scheduleKey = dates[0]?.slice(0, 7) || "unknown";
  const queues = new Map([...byTopic.entries()].map(([topic, items]) => [
    topic,
    shuffled(items, createRandom(`kviztogo-month:${scheduleKey}:${topic}`))
  ]));
  const positions = new Map([...queues.keys()].map(topic => [topic, 0]));
  const schedule = new Map();

  dates.forEach(dateKey => {
    const chosen = [];
    let round = 0;
    while (chosen.length < questionsPerDay) {
      const activeTopics = [...queues.keys()].filter(topic => positions.get(topic) < queues.get(topic).length);
      if (!activeTopics.length) break;
      const orderedTopics = shuffled(activeTopics, createRandom(`kviztogo-day-topics:${dateKey}:${round}`));
      orderedTopics.forEach(topic => {
        if (chosen.length >= questionsPerDay) return;
        const position = positions.get(topic);
        const item = queues.get(topic)[position];
        if (!item) return;
        positions.set(topic, position + 1);
        chosen.push(item);
      });
      round += 1;
    }

    if (chosen.length !== questionsPerDay) {
      throw new Error(`Za ${dateKey} pronađeno je samo ${chosen.length} valjanih pitanja.`);
    }
    schedule.set(dateKey, shuffled(chosen, createRandom(`kviztogo-day-order:${dateKey}`)));
  });

  return schedule;
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function readJson(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, "utf8")); }
  catch { return null; }
}

function questionIdsForMonth(value) {
  const ids = new Set();
  datesInMonth(value).forEach(dateKey => {
    const saved = readJson(path.join(outputDir, `${dateKey}.json`));
    (Array.isArray(saved?.questions) ? saved.questions : []).forEach(question => {
      if (question?.id) ids.add(String(question.id));
    });
  });
  return ids;
}

function generateMonth(value, pool, files, { overwrite = false, excludedIds = new Set() } = {}) {
  const dates = datesInMonth(value);
  const targetDates = overwrite
    ? dates
    : dates.filter(dateKey => !fs.existsSync(path.join(outputDir, `${dateKey}.json`)));
  if (!targetDates.length) return { written: 0, questionIds: questionIdsForMonth(value) };

  const exclusions = new Set(excludedIds);
  if (!overwrite) questionIdsForMonth(value).forEach(id => exclusions.add(id));
  const schedule = selectMonthlyQuestions(pool, targetDates, exclusions);
  const generatedAt = new Date().toISOString();

  targetDates.forEach(dateKey => {
    const questions = schedule.get(dateKey).map(item => item.question);
    writeJson(path.join(outputDir, `${dateKey}.json`), {
      version: 2,
      date: dateKey,
      generatedAt,
      questionCount: questions.length,
      sourceFileCount: files.length,
      selectionPolicy: "unique-in-month-and-not-used-in-previous-month",
      questions
    });
  });

  return { written: targetDates.length, questionIds: questionIdsForMonth(value) };
}

function listGeneratedDates() {
  if (!fs.existsSync(outputDir)) return [];
  return fs.readdirSync(outputDir)
    .filter(fileName => /^\d{4}-\d{2}-\d{2}\.json$/.test(fileName))
    .map(fileName => fileName.slice(0, 10))
    .sort();
}

function verifyGeneratedSchedule(dates) {
  const monthlyQuestions = new Map();

  dates.forEach(dateKey => {
    const saved = readJson(path.join(outputDir, `${dateKey}.json`));
    const questions = Array.isArray(saved?.questions) ? saved.questions : [];
    if (questions.length !== questionsPerDay) {
      throw new Error(`${dateKey} nema točno ${questionsPerDay} pitanja.`);
    }

    const dailyKeys = new Set();
    const currentMonth = monthKey(dateKey);
    if (!monthlyQuestions.has(currentMonth)) monthlyQuestions.set(currentMonth, new Set());
    const monthQuestions = monthlyQuestions.get(currentMonth);

    questions.forEach(question => {
      const normalizedText = String(question?.question || "").toLocaleLowerCase("hr").replace(/\s+/g, " ").trim();
      if (!normalizedText) throw new Error(`${dateKey} sadrži prazno pitanje.`);
      if (dailyKeys.has(normalizedText)) throw new Error(`${dateKey} sadrži ponovljeno pitanje.`);
      if (monthQuestions.has(normalizedText)) throw new Error(`${currentMonth} sadrži pitanje više od jednom.`);
      dailyKeys.add(normalizedText);
      monthQuestions.add(normalizedText);
    });
  });

  const months = [...monthlyQuestions.keys()].sort();
  for (let index = 1; index < months.length; index += 1) {
    const previousMonth = months[index - 1];
    const currentMonth = months[index];
    if (addMonths(previousMonth, 1) !== currentMonth) continue;
    const previousQuestions = monthlyQuestions.get(previousMonth);
    const repeated = [...monthlyQuestions.get(currentMonth)].find(question => previousQuestions.has(question));
    if (repeated) throw new Error(`${currentMonth} ponavlja pitanje iz prethodnog mjeseca ${previousMonth}.`);
  }
}

const files = discoverQuestionFiles();
const pool = loadQuestionPool(files);
const currentDate = requestedDate || dateKeyInTimeZone();

if (!launchDate || !/^\d{4}-\d{2}-\d{2}$/.test(launchDate)) {
  throw new Error("daily30/config.json mora sadržavati ispravan launchDate.");
}
if (!files.length || pool.length < questionsPerDay) {
  throw new Error("Nije pronađena dovoljna baza kviz pitanja.");
}

const manifestPath = path.join(outputDir, "questions-manifest.json");
const previousManifest = readJson(manifestPath);
const sourceHash = hashString(JSON.stringify(pool.map(item => [item.key, item.topic, item.question])));
const manifestChanged = previousManifest?.version !== 2 ||
  previousManifest?.sourceHash !== sourceHash ||
  previousManifest?.questionsPerDay !== questionsPerDay;
writeJson(manifestPath, {
  version: 2,
  generatedAt: manifestChanged ? new Date().toISOString() : previousManifest.generatedAt,
  questionCount: pool.length,
  questionsPerDay,
  sourceHash,
  files
});

let written = 0;
if (regenerate) {
  const through = requestedThrough || currentDate;
  let previousMonthIds = questionIdsForMonth(addMonths(monthKey(requestedFrom), -1));

  monthsBetween(requestedFrom, through).forEach(value => {
    const result = generateMonth(value, pool, files, { overwrite: true, excludedIds: previousMonthIds });
    written += result.written;
    previousMonthIds = result.questionIds;
  });
} else {
  const monthsToEnsure = new Set();
  const configuredEnd = preparedThrough || (backfill ? currentDate : launchDate);
  monthsBetween(launchDate, configuredEnd).forEach(value => monthsToEnsure.add(value));
  if (monthKey(currentDate) >= monthKey(launchDate)) {
    monthsToEnsure.add(monthKey(currentDate));
    monthsToEnsure.add(addMonths(currentDate, 1));
  }

  [...monthsToEnsure].sort().forEach(value => {
    const previousMonthIds = questionIdsForMonth(addMonths(value, -1));
    const result = generateMonth(value, pool, files, { excludedIds: previousMonthIds });
    written += result.written;
  });
}

const dates = listGeneratedDates();
verifyGeneratedSchedule(dates);
const indexPath = path.join(outputDir, "index.json");
const previousIndex = readJson(indexPath);
const indexChanged = previousIndex?.version !== 2 ||
  previousIndex?.timeZone !== timeZone ||
  previousIndex?.launchDate !== launchDate ||
  previousIndex?.preparedThrough !== preparedThrough ||
  JSON.stringify(previousIndex?.dates || []) !== JSON.stringify(dates);
writeJson(indexPath, {
  version: 2,
  timeZone,
  launchDate,
  preparedThrough,
  updatedAt: indexChanged ? new Date().toISOString() : previousIndex.updatedAt,
  latestDate: dates.at(-1) || null,
  dates
});

console.log(`Dnevnih 30: ${pool.length} jedinstvenih pitanja iz ${files.length} JSON datoteka.`);
console.log(`Napisani setovi: ${written}. Dostupni datumi: ${dates.length}.`);
console.log("Provjera rasporeda: bez ponavljanja unutar mjeseca i između susjednih mjeseci.");
