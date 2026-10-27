# KvizToGo AI redakcija (bez Supabasea)

Ovdje su isključivo neobjavljeni prijedlozi pitanja. Nijedna datoteka iz ove mape ne učitava se u postojeće javne načine igre. Stvarni odabir za kviz ostaje ručan.

## Postavljanje agenta

1. Otvori https://github.com/zvonebeslic/balkanska_pub_prica/settings/secrets/actions
2. Klikni **New repository secret**.
3. Naziv: **OPENAI_API_KEY**. Kao vrijednost stavi vlastiti OpenAI API ključ iz https://platform.openai.com/api-keys. NIKAD ne stavljaj ključ u datoteku ili chat.
4. Otvori karticu **Actions > KvizToGo AI - novo pitanje** i klikni **Run workflow** za prvo pokretanje. Nakon toga se workflow pokreće svakog sata (u 17. minuti UTC).
5. Ako želiš drugi model, u **Settings > Secrets and variables > Actions > Variables** dodaj **KVIZTOGO_AI_MODEL**; zadani je gpt-4.1-mini. Model mora podržavati Responses API, web_search i JSON Schema.
6. Svaki uspješni poziv s provjerljivim izvorima doda jedno pitanje u mjesečni JSON unutar ai-pitanja/zbirka. Dnevni limit je 24. Neuspješni ili preslični prijedlozi odbacuju se. API pozivi naplaćuju se prema modelu i web pretraživanju.
7. GitHub Actions raspored nije real-time: zakazana izvođenja mogu kasniti ili biti preskočena.

## Urednička stranica

Na index.html gumb **AI pitanja** vodi na ai-pitanja.html. Stranica čita JSON datoteke izravno s GitHub main grane. Pregled i pretraga ne zahtijevaju prijavu.

Za **Prihvati**, **Odbij** i **Uredi** potreban je GitHub fine-grained token:
- Izdaj ga na https://github.com/settings/personal-access-tokens/new
- Repo: samo zvonebeslic/balkanska_pub_prica; dopuštenje **Contents: Read and Write**.
- Upiši ga u polje na stranici. Token je samo u memoriji te otvorene kartice, ne čuva se u localStorageu niti se šalje OpenAI-ju. Koristi samo vlastiti uređaj.
- Uredničke akcije neposredno spremaju promjene u istu mjesečnu JSON datoteku u GitHubu.
- **Izvezi prihvaćena pitanja** preuzima kompatibilan JSON, ali NE objavljuje ga u aktivnim kvizovima.

**Pozor:** repozitorij je javan. Pitanja u JSON datotekama iako su neobjavljena u kvizu javno su vidljiva na GitHubu. Postavka noindex nije pristupna zaštita.

Ako kviztogo.com servira datoteke s Hostinger hostinga bez automatske sinkronizacije s GitHubom, novu index.html i ai-pitanja.html moraš objaviti na hostingu. Jednom kada je stranica objavljena, nove nacrte sama dohvaća s GitHuba.

## Logika

- formulacije.json: točno 100 stilskih pristupa, izbor najmanje korištenog stila (ravnomjerno).
- teme.json: 41 područje znanja, 332 podteme; izbor najmanje korištenog područja.
- scripts/ai-question-agent.mjs: proučava pitanja iz svih korijenskih JSON baza, ABC pitanja i Dnevnih 30; ne prepisuje ih; odbacuje preslična pitanja i one bez provjerljivog izvora.
- index.json: brojači, mjesečni indeks i raspodjela težina 1-5.
- zbirka/GGGG-MM.json: pitanje, priznati odgovori, izvori, stil, tema, težina i status (novo, prihvaceno, odbijeno).
- .github/workflows/ai-pitanja.yml: zakazani posao; piše samo u ai-pitanja/ .

Provjera bez API ključa: node --check scripts/ai-question-agent.mjs; node scripts/ai-question-agent.mjs --dry-run.

## Granice i sigurnost

Agent generira uredničke nacrte, a ne zajamčeno točne kviz činjenice. Izvori su dodani kao trag za tvoju provjeru; modeli griješe. Potvrđuj ih prije uvoza u aktivnu bazu. Github API može povremeno vratiti konflikt ako istodobno radi cron; u tom slučaju osvježi stranicu i ponovi spremanje.

**Supabase se ne koristi i nije mijenjan.**
