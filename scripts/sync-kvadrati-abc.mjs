#!/usr/bin/env node
/**
 * Ručno osvježavanje ABC kataloga za Kvadrate znanja.
 *
 * NODE >=18; datoteke s pitanjima se čitaju samo lokalno, ne izvan projekta.
 * SUPABASE_URL=https://... SUPABASE_SERVICE_ROLE_KEY=... node scripts/sync-kvadrati-abc.mjs
 * Nikad ne stavljati SERVICE_ROLE_KEY u HTML, GitHub javne datoteke ili preglednik.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const directory = path.join(root, "ABC pitanja");
const base = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!base || !key || !/^https:\/\/.+\.supabase\.co$/.test(base)) {
  console.error("Postavi SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY na sigurnom računalu.");
  process.exit(1);
}
const files = (await fs.readdir(directory)).filter(f => f.endsWith(".json")).sort();
let imported = 0, skipped = 0;
for (const file of files) {
  const raw = JSON.parse(await fs.readFile(path.join(directory,file),"utf8"));
  if (!Array.isArray(raw)) { console.warn("Preskočena datoteka:",file);continue; }
  const rows = [];
  for (const q of raw) {
    if (typeof q?.question!=="string" || !q.question.trim() ||
        !["A","B","C"].every(a=>typeof q?.answers?.[a]==="string" && q.answers[a].trim()) ||
        !["A","B","C"].includes(String(q.correct_answer||"").toUpperCase())) {
      skipped++;continue;
    }
    const id = createHash("sha256").update(q.question.trim().toLowerCase(),"utf8").digest("hex");
    rows.push({ id,source:file,prompt:q.question,options:q.answers,
      correct_key:String(q.correct_answer).toUpperCase(),image:q.image||null });
  }
  for (let start=0;start<rows.length;start+=100) {
    const batch=rows.slice(start,start+100);
    const response=await fetch(base+"/rest/v1/kz_questions?on_conflict=id",{
      method:"POST",
      headers:{
        apikey:key,
        Authorization:"Bearer "+key,
        "Content-Type":"application/json",
        Prefer:"resolution=ignore-duplicates,return=minimal"
      },
      body:JSON.stringify(batch)
    });
    if (!response.ok) {
      throw Error(file+": "+response.status+" "+(await response.text()).slice(0,600));
    }
    imported+=batch.length;
  }
  console.log(file+": "+rows.length+" valjanih ABC pitanja");
}
console.log("Provjereno "+imported+" pitanja; preskočeno nevaljanih: "+skipped+
  ". Postojeći ID-jevi ne prepisuju se; povijest odigranih pitanja ostaje nepromijenjena.");
