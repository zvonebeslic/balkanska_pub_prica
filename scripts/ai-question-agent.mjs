// KvizToGo: neobjavljeni AI nacrti. Ne mijenja aktivne kvizove ni Supabase.
import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import { join, basename } from "node:path";
import { randomInt, randomUUID } from "node:crypto";

const ROOT = process.cwd();
const DIR = join(ROOT, "ai-pitanja");
const COLLECTION = join(DIR, "zbirka");
const secret = process.env.OPENAI_API_KEY || "";
const model = process.env.KVIZTOGO_AI_MODEL || "gpt-4.1-mini";
const dailyLimit = Math.min(96, Math.max(1, Number(process.env.AI_DAILY_LIMIT || 24)));
const today = new Date().toISOString().slice(0, 10);
const month = today.slice(0, 7);

async function json(path, fallback) {
  try { return JSON.parse(await readFile(path, "utf8")); }
  catch (e) { if (e.code === "ENOENT") return fallback; throw e; }
}
function normalize(v) {
  return String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
}
function tokens(v) { return new Set(normalize(v).split(" ").filter(w => w.length > 2)); }
function similarity(a, b) {
  let shared = 0;
  for (const w of a) if (b.has(w)) shared++;
  return shared / Math.max(1, a.size + b.size - shared);
}
const STOP = new Set(["koji","koja","koje","tko","kako","gdje","kada","kojeg","kojem","njih","koje","prema","godine","svijeta","poznat","poznata"]);
function significantTokens(text) {return new Set([...tokens(text)].filter(t => !STOP.has(t)));}

function bankItems(value) {
  if (Array.isArray(value)) return value.filter(x => x && typeof x.question === "string");
  if (value && Array.isArray(value.questions)) return bankItems(value.questions);
  return [];
}
async function referenceBank() {
  const output = [];
  const roots = [
    {dir: ROOT, prefix: ""},
    {dir: join(ROOT,"ABC pitanja"), prefix: "ABC pitanja/"},
    {dir: join(ROOT,"daily30"), prefix: "daily30/"}
  ];
  for (const {dir,prefix} of roots) {
    let entries = [];
    try { entries = await readdir(dir); } catch { continue; }
    for (const file of entries) {
      if (!file.toLowerCase().endsWith(".json")) continue;
      if (prefix === "daily30/" && !/^\d{4}-\d{2}-\d{2}\.json$/.test(file)) continue;
      const parsed = await json(join(dir,file),[]);
      for (const item of bankItems(parsed)) {
        if (item.question.length < 15) continue;
        let answer = "";
        if (Array.isArray(item.answers)) answer = String(item.answers[0] || "");
        else if (item.answers && item.correct_answer) answer = String(item.answers[item.correct_answer] || "");
        output.push({question:item.question, answer, topic:item.topic || basename(file,".json"), file:prefix + file});
      }
    }
  }
  return output;
}
function randomFrom(items) { return items[randomInt(items.length)]; }
function pickLeast(items, counts) {
  const min = Math.min(...items.map(item => Number(counts[String(item)] || 0)));
  return randomFrom(items.filter(item => Number(counts[String(item)] || 0) === min));
}
function fewShot(bank, count = 18) {
  // Uzorci iz što više datoteka: AI imitira stil, a ne pojedinačno pitanje.
  const byFile = new Map();
  for (const q of bank) {
    if (!byFile.has(q.file)) byFile.set(q.file, []);
    byFile.get(q.file).push(q);
  }
  const files = [...byFile.keys()].filter(f => !f.startsWith("daily30/"));
  const selected = [];
  while (files.length && selected.length < count) {
    const i = randomInt(files.length);
    const file = files.splice(i,1)[0];
    const x = randomFrom(byFile.get(file));
    selected.push({tema:x.topic, pitanje:x.question.slice(0,550), odgovor:x.answer.slice(0,110)});
  }
  return selected;
}
function extractOutput(data) {
  if (typeof data.output_text === "string") return data.output_text;
  return (data.output || []).filter(x => x.type === "message")
    .flatMap(x => x.content || []).filter(x => x.type === "output_text")
    .map(x => x.text).join("\n");
}
function sourcesFromResult(data) {
  const urls = new Set();
  for (const output of (data.output || [])) {
    for (const content of (output.content || [])) {
      for (const ann of (content.annotations || [])) {
        if (ann.type === "url_citation" && /^https?:\/\//.test(ann.url || "")) urls.add(ann.url);
      }
    }
  }
  return [...urls];
}
async function makeQuestion(style, area, focus, difficulty, examples, lastQuestions) {
  const instructions = [
    "Ti si vrhunski hrvatski urednik pub-kvizova za KvizToGo.",
    "Pročitaj PRIMJERE koji odražavaju autorov stil: tečne rečenice, zanimljive točne činjenice, kreativni tragovi, jasan odgovor.",
    "Osmisli točno JEDNO potpuno novo pitanje na HRVATSKOM, ne prepisuj ni parafraziraj primjere.",
    "Svijet tema je praktički neograničen: znanost, religije, tehnika, politika kao povijesna činjenica, umjetnost, hrana, moda, narodne tradicije, more, sport, živi svijet, podrijetlo riječi itd.",
    "Obrazac formuliranja je specifična kreativna struktura pitanja. Primijeni ga prirodno na zadanu temu; nemoj prisilno miješati nespojive teme.",
    "Različite duljine, počeci i završeci; ne završavaj uvijek s 'kako se zove', 'tko je' ili 'o kojem je riječ'.",
    "Pitanje treba zahtijevati znanje ili zaključivanje, s jednim nedvosmislenim provjerljivim odgovorom.",
    "Bez izmišljanja podataka, osporavanih rekorda bez kriterija, lažnih citata, zastarjelih titula i informacija iz budućnosti.",
    "Ako govoriš o događaju iz nedavne prošlosti ili trenutnim činjenicama, provjeri datum i izvor.",
    "Upotrijebi dostupno web pretraživanje za provjeru ključne činjenice; u 'sources' uključi stvarne URL-ove izvora koje si vidio.",
    "Ako provjera nije moguća ili ima dvojbi, postavi factual_uncertainty na true. Nikad ne izmišljaj izvore.",
    "Pazi da se puni odgovor ne pojavljuje doslovno u pitanju; pitanje završi upitnikom.",
    "Vraćaš SAMO strukturirani JSON, bez objašnjenja izvan polja."
  ].join("\n");
  const input = JSON.stringify({
    formulacija: style, područje: area, uska_tema: focus, tezina_1_do_5: difficulty,
    primjer_stila_iz_stvarne_baze: examples,
    nedavna_neobjavljena_pitanja_koja_ne_smijes_ponoviti: lastQuestions
  });
  const schema = {
    type:"object", additionalProperties:false, required:["question","answer","alternatives","explanation","sources","factual_uncertainty"],
    properties:{
      question:{type:"string"}, answer:{type:"string"},
      alternatives:{type:"array",items:{type:"string"}},
      explanation:{type:"string"},
      sources:{type:"array",items:{type:"string"}},
      factual_uncertainty:{type:"boolean"}
    }
  };
  const response = await fetch("https://api.openai.com/v1/responses", {
    method:"POST",
    headers:{Authorization:"Bearer " + secret, "Content-Type":"application/json"},
    body:JSON.stringify({
      model, instructions, input, tools:[{type:"web_search"}], tool_choice:"auto",
      text:{format:{type:"json_schema",name:"kviztogo_question",schema,strict:true}},
      max_output_tokens:850
    })
  });
  if (!response.ok) throw Error("OpenAI API HTTP " + response.status + ": " + (await response.text()).slice(0,600));
  const payload = await response.json();
  const parsed = JSON.parse(extractOutput(payload));
  const citations = sourcesFromResult(payload);
  parsed.sources = [...new Set([...(parsed.sources || []), ...citations])].filter(v => /^https:\/\/[^ ]+\.[^ ]+/.test(v)).slice(0,5);
  return parsed;
}
function validate(q, bank, generated) {
  if (!q || typeof q.question !== "string" || typeof q.answer !== "string") return "nema pitanja/odgovora";
  const question = q.question.trim();
  const answer = q.answer.trim();
  if (question.length < 65 || question.length > 620 || !question.endsWith("?")) return "oblik ili duljina pitanja";
  if (answer.length < 1 || answer.length > 150) return "oblik odgovora";
  if (answer.length > 3 && (" " + normalize(question) + " ").includes(" " + normalize(answer) + " ")) return "odgovor je otkriven u pitanju";
  if (q.factual_uncertainty) return "AI nije uspio pouzdano potvrditi činjenicu";
  if (!Array.isArray(q.sources) || q.sources.length === 0) return "nedostaje provjerljivi izvor";
  const nq = normalize(question), tk = significantTokens(question);
  for (const item of [...bank, ...generated]) {
    const old = normalize(item.question);
    if (old === nq) return "isto pitanje već postoji";
    if (Math.min(old.length,nq.length) > 65 && (old.includes(nq) || nq.includes(old))) return "preslično postojećem pitanju";
    const overlap = similarity(tk, significantTokens(old));
    if (overlap > 0.76) return "previše slična formulacija";
    if (overlap > 0.53 && normalize(item.answer) === normalize(answer)) return "ponavlja već poznatu činjenicu";
  }
  return "";
}
async function main() {
  const styles = await json(join(DIR,"formulacije.json"),[]);
  if (styles.length !== 100 || new Set(styles.map(x=>x.id)).size !== 100) throw Error("Potrebno je tocno 100 razlicitih formulacija.");
  const topics = await json(join(DIR,"teme.json"),{});
  const index = await json(join(DIR,"index.json"),null);
  if (!index) throw Error("Nedostaje ai-pitanja/index.json");
  const archive = [];
  for (const key of index.months || []) {
    archive.push(...await json(join(COLLECTION,key + ".json"),[]));
  }
  const countToday = archive.filter(x => (x.createdAt || "").startsWith(today)).length;
  console.log("Stilovi:",styles.length, "podrucja:",Object.keys(topics).length,"dosad:",archive.length,"danas:",countToday);
  const existing = await referenceBank();
  console.log("Prouceno postojecih pitanja:",existing.length);
  if (process.argv.includes("--dry-run")) {
    console.log("Suha proba uspjela. Nema upisa u repozitorij.");
    return;
  }
  if (countToday >= dailyLimit) return console.log("Dosegnut dnevni limit:",dailyLimit);
  if (!secret) throw Error("Nije postavljen GitHub Actions secret OPENAI_API_KEY. Nista nije promijenjeno.");
  const style = styles.find(s => s.id === Number(pickLeast(styles.map(x => x.id),index.styleCounts || {})));
  const area = pickLeast(Object.keys(topics), index.topicCounts || {});
  const usedFocus = new Set(archive.slice(-75).map(x => x.focus));
  const available = topics[area].filter(t => !usedFocus.has(t));
  const focus = randomFrom(available.length ? available : topics[area]);
  const difficulty = Number(pickLeast([1,2,3,4,5],index.difficultyCounts || {}));
  const examples = fewShot(existing);
  const tail = archive.slice(-18).map(x => ({question:x.question,answer:x.answers?.[0]}));
  let q, reason = "";
  for (let attempt=1; attempt<=2; attempt++) {
    q = await makeQuestion(style,area,focus,difficulty,examples,tail);
    reason = validate(q, existing, archive);
    if (!reason) break;
    console.warn("Prijedlog odbijen: ", reason, "pokusaj",attempt);
    tail.push({question:q.question,answer:q.answer});
  }
  if (reason) throw Error("Nije spremljeno nepouzdano ili ponovljeno pitanje: " + reason);
  const item = {
    id:randomUUID(), createdAt:new Date().toISOString(), origin:"agent",
    status:"novo", type:"blitz", topic:area, focus,
    difficulty, styleId:style.id, styleDescription:style.opis,
    question:q.question.trim(),
    answers:[...new Set([q.answer,...q.alternatives].map(s=>String(s).trim()).filter(Boolean))].slice(0,12),
    explanation:q.explanation.trim(), sources:q.sources,
    image:null, updatedAt:null
  };
  await mkdir(COLLECTION,{recursive:true});
  const path=join(COLLECTION,month+".json");
  const current=await json(path,[]);
  current.push(item);
  await writeFile(path,JSON.stringify(current,null,2)+"\n");
  if (!index.months.includes(month)) index.months.push(month);
  index.months.sort();
  index.total=Number(index.total||0)+1;
  index.styleCounts[String(style.id)]=Number(index.styleCounts[String(style.id)]||0)+1;
  index.topicCounts[area]=Number(index.topicCounts[area]||0)+1;
  index.difficultyCounts[String(difficulty)]=Number(index.difficultyCounts[String(difficulty)]||0)+1;
  index.updatedAt=item.createdAt;
  await writeFile(join(DIR,"index.json"),JSON.stringify(index,null,2)+"\n");
  console.log("Spremljen nacrt:",item.id,area,focus,"stil",style.id,"tezina",difficulty);
}
main().catch(e => { console.error(e); process.exitCode=1; });
