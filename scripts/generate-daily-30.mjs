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
const requestedDate = process.argv.find(arg => arg.startsWith("--date="))?.split("=")[1] || null;
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

function addDays(dateKey, amount) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + amount, 12));
  return date.toISOString().slice(0, 10);
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

function selectDailyQuestions(pool, dateKey, amount = 30) {
  const byTopic = new Map();
  pool.forEach(item => {
    if (!byTopic.has(item.topic)) byTopic.set(item.topic, []);
    byTopic.get(item.topic).push(item);
  });

  const topicRandom = createRandom(`kviztogo-daily-topics:${dateKey}`);
  const topics = shuffled([...byTopic.keys()], topicRandom);
  const queues = new Map(topics.map(topic => [
    topic,
    shuffled(byTopic.get(topic), createRandom(`kviztogo-daily:${dateKey}:${topic}`))
  ]));

  const chosen = [];
  let round = 0;
  while (chosen.length < amount && topics.some(topic => queues.get(topic).length > round)) {
    const roundTopics = shuffled(topics, createRandom(`kviztogo-round:${dateKey}:${round}`));
    roundTopics.forEach(topic => {
      if (chosen.length >= amount) return;
      const item = queues.get(topic)[round];
      if (item) chosen.push(item);
    });
    round += 1;
  }

  return shuffled(chosen, createRandom(`kviztogo-order:${dateKey}`)).map(item => item.question);
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function readJson(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, "utf8")); }
  catch { return null; }
}

function generateSet(dateKey, pool, files) {
  const filePath = path.join(outputDir, `${dateKey}.json`);
  if (fs.existsSync(filePath)) return false;

  const questions = selectDailyQuestions(pool, dateKey, 30);
  if (questions.length !== 30) {
    throw new Error(`Za ${dateKey} pronađeno je samo ${questions.length} valjanih pitanja.`);
  }

  writeJson(filePath, {
    version: 1,
    date: dateKey,
    generatedAt: new Date().toISOString(),
    questionCount: questions.length,
    sourceFileCount: files.length,
    questions
  });
  return true;
}

function listGeneratedDates() {
  if (!fs.existsSync(outputDir)) return [];
  return fs.readdirSync(outputDir)
    .filter(fileName => /^\d{4}-\d{2}-\d{2}\.json$/.test(fileName))
    .map(fileName => fileName.slice(0, 10))
    .sort();
}

const files = discoverQuestionFiles();
const pool = loadQuestionPool(files);
const currentDate = requestedDate || dateKeyInTimeZone();

if (!files.length || pool.length < 30) {
  throw new Error("Nije pronađena dovoljna baza kviz pitanja.");
}

const manifestPath = path.join(outputDir, "questions-manifest.json");
const previousManifest = readJson(manifestPath);
const sourceHash = hashString(JSON.stringify(pool.map(item => [item.key, item.topic, item.question])));
const manifestChanged = previousManifest?.sourceHash !== sourceHash;
writeJson(manifestPath, {
  version: 1,
  generatedAt: manifestChanged ? new Date().toISOString() : previousManifest.generatedAt,
  questionCount: pool.length,
  sourceHash,
  files
});

let created = 0;
if (backfill) {
  for (let dateKey = launchDate; dateKey <= currentDate; dateKey = addDays(dateKey, 1)) {
    if (generateSet(dateKey, pool, files)) created += 1;
  }
} else if (generateSet(currentDate, pool, files)) {
  created += 1;
}

const dates = listGeneratedDates();
const indexPath = path.join(outputDir, "index.json");
const previousIndex = readJson(indexPath);
const indexChanged = previousIndex?.timeZone !== timeZone ||
  previousIndex?.launchDate !== launchDate ||
  JSON.stringify(previousIndex?.dates || []) !== JSON.stringify(dates);
writeJson(indexPath, {
  version: 1,
  timeZone,
  launchDate,
  updatedAt: indexChanged ? new Date().toISOString() : previousIndex.updatedAt,
  latestDate: dates.at(-1) || null,
  dates
});

console.log(`Dnevnih 30: ${pool.length} jedinstvenih pitanja iz ${files.length} JSON datoteka.`);
console.log(`Novi setovi: ${created}. Dostupni datumi: ${dates.length}.`);
