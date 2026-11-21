# Kraljevstvo Znanja — KvizToGo

Status: razvojna verzija igre, podstranica `kraljevstvo-znanja.html`.

## Pravila

- Svaki igrač dobiva **10 novih ABC pitanja**, iz jedinstvene kombinirane baze. `kz_seen` bilježi ID svakog dodijeljenog pitanja — nema ponavljanja pojedincu, ni pri prijelazu u drugo kraljevstvo.
- Točan odgovor donosi **20 m²** u zajednički saldo. Pri površini kraljevstva **najmanje 500 m²**, kralj dobiva **30**, vojvoda **25**, vojnik **22 m²**; po padu ispod praga vraća se 20.
- Odgovor na deseto pitanje postavlja sljedeću dostupnost na **4 sata nakon završetka**. Neizigrana pitanja se ne gomilaju, a prekinuta partija može se nastaviti.
- Maksimalno **5 članova**: kralj, jedan vojvoda i tri vojnika. Prvi prihvaćeni član automatski postaje vojvoda. Kralj može promijeniti vojvodu ili predati krunu.
- Kralj koristi zajednički saldo i jedini postavlja teritorij. **3–20 m²** po kliku na granicu uz trošak iste količine, na prvoj GPS lokaciji **20 m²**. Prije svakog osvajanja bira se **blok, traka, L-oblik ili cik-cak**, koji se računa kao točno odgovarajući broj povezanih ćelija. Oblik je isti za GPS uporišta, proširenje i napade.
- **Napad i obrana**: trošak 20 m² s konta, zauzima se 8 m² suparničkog teritorija (i oduzima 8 m² branitelju). Broje se stvarne 1 m² ćelije u globalnoj sfernoj ekvivalentnoj projekciji.
- Novo odvojeno uporište stvara se jedino pomoću geolokacije uređaja. Daljnje širenje radi se iz postojećeg teritorija bez preskakanja.
- Odabir boje je trajan; ime se bira iz kataloga od **2300 jedinstvenih i tematski raznolikih imena**. Planirana naplata promjene imena 20 € **nije implementirana**.
- Zahtjev za pridruživanjem šalje se klikom na kraljevstvo. Zahtjev vidi samo kralj na stranici igre; rezultat stiže članu i u zajednički KvizToGo sandučić.

## Implementacija

Stranica: `kraljevstvo-znanja.html`, `kraljevstvo-znanja.css`, `kraljevstvo-znanja.js`.
Poveznica je dodana na vrh `online-kviz.html`, a stranica u `sitemap.xml`.

Sve `kz_*` tablice i pristupne funkcije su odvojene. Za svaku partiju se zasebno spremaju i `duration_seconds` (sekunde igranja). Ne upisuju ništa u postojeće `quiz_plays`, `quiz_answers`, `daily30`, `player_progress` ili druge postojeće statistike. Autorizirani su Supabase Auth profili i gostujući ID plus 256-bitna tajna iz postojećeg `localStorage` identiteta. Sva promjena bodova/teritorija provodi se transakcijski, na PostgreSQL poslužitelju. Pravila ne smiju biti implementirana isključivo u frontend JavaScriptu.

Baza je inicijalno napunjena s **6844 deduplicirana ABC pitanja iz 17 datoteka**. Za naknadno dodavanje novih pitanja pokrenuti `scripts/sync-kvadrati-abc.mjs` s **tajnim SERVICE_ROLE ključem samo u sigurnom terminalu**; skripta čuva dodijeljene ID-jeve, povijest i sve odigrane partije.

## Sigurnost i ograničenja prije šire objave

1. Geolocation API provjerava da preglednik šalje aktualnu lokaciju s deklariranom preciznošću do 100 m. **Sâm preglednički GPS moguće je lažirati**; stvarna zaštita od lažiranja zahtijeva dodatne mjere protiv zlouporabe. Nikad nije dokaz fizičkog prisustva na kvadratu od 1 m².
2. Polja kraljevstava su **javna** na karti. GPS koordinata se zaokružuje na 1 m², no vidljivi su položaji korisnika koji stvore uporišta. Prikazati korisniku upozorenje i tražiti pristanak prije početnog postavljanja.
3. Uređaj bez profila može trajno izgubiti pristup ako obriše lokalnu pohranu. Profilna prijava veže postojeći gostujući identitet uz Supabase Auth. **Prethodno odvojeni računi ne spajaju se automatski**.
4. Prije omogućavanja masovnog javnog igranja obaviti pregled na mobitelu i računalu, testirati GPS dopuštenja, pozivnice, valjanost poziva i konkurentne napade. U ovoj implementaciji testirane su SQL/RPC transakcije, ali nije obavljen potpuni test preglednikom na objavljenom Hostingeru.
5. Mapa prikazuje najviše 8000 pojedinačnih ćelija u trenutačnom visoko uvećanom izrezu; na nižoj razini prikazuje nazive kraljevstava. Za veliko opterećenje planirati poslužiteljske agregirane geometrije ili vektorske pločice.
6. U PostgreSQL su pet migracija **već primijenjene** na projektu `hssfjguysejbosvholqu`; u spremištu su spremljene radi verzioniranja — ne pokretati ih bez provjere postojeće migracijske povijesti. Nema dodatnih naplatnih Supabase projekata.

## Provjere

- RLS omogućen na svim novim tablicama, bez izravnog javnog SQL pristupa; pristup ide kroz ovlaštene RPC funkcije.
- U PostgreSQL `BEGIN … ROLLBACK` provjereno: osnivanje, pet točnih odgovora / saldo 100 m², cooldown nakon zadnjeg odgovora, prvi GPS teren 20 m², širenje za 3 m², napad 20→8 i odgovarajuće smanjenje braniteljeva teritorija, odobravanje članstva, vojvoda, izlazak.
- JavaScript parsiranje nove igre uspješno.

## Preimenovanje i kompatibilnost

Nova glavna adresa igre je `kraljevstvo-znanja.html`. Stara `kvadrati-znanja.html` zadržana je kao preusmjeravanje. Tehnički `kz_*` nazivi baze i stari migracijski zapisi namjerno su sačuvani zbog kompatibilnosti. Novi RPC `kz_place` prihvaća dodatni neobavezni argument `p_shape` (zadano `blok`).

## Pravila od 21. studenoga 2026. — joystick i blokovi

- **Dvostruke nagrade za buduće točne odgovore:** prije 500 m² svaki točan odgovor vrijedi **40 m²**, a uz boost kralj dobiva **60 m²**, vojvoda **50 m²**, vojnik **44 m²**. Prag boosta ostaje **500 m²**. Raniji rezultati nisu retroaktivno mijenjani.
- **Svjetska mreža od fiksnih blokova veličine 5 × 4 metra = 20 m².** U jednom potezu može se položiti samo **jedan puni blok**. Ispod karte nalaze se četiri strelice za pomicanje zelenkastog pregleda bloka u koracima od jednog bloka. Nema postavljanja izravnim dodirom karte: potvrda je zaseban gumb.
- **Zauzimanje slobodnog bloka** troši **20 m²** banke i dodaje **20 m²** teritorija. **Napad** na potpuno zauzet suparnički blok troši **40 m²** i prenosi **20 m²** protivniku. Djelomično zauzet stari blok ne može se napasti.
- Svaki novi kopneni blok (osim GPS uporišta) mora **rubom dodirivati** postojeću zemlju istog kraljevstva. Udaljeno uporište bira se stvarnim GPS pozicioniranjem, potom se potvrđuje.
- Raniji kvadrati 1 m², postojeća zemljišta, članstva, područja, saldi i statistike ostaju netaknuti. Novi poslužiteljski RPC je kz_place_block; stari javni kz_place zaključan je protiv zaobilaženja novih pravila.
- GPS preciznost preglednika ne dokazuje stvarnu fizičku lokaciju; prije ozbiljne javne igre ostaje potreban anti-spoofing.

## 21. studenoga 2026. — kviz kao Online kviz

- **10 novih, nikad prije dodijeljenih ABC pitanja po partiji**. Hlađenje počinje **4 sata nakon desetog odgovora**. Starije partije od pet pitanja ostaju u povijesti; eventualna nedovršena stara partija proširuje se s pet na deset novih pitanja.
- Izvor je **isti skup JSON datoteka ABC pitanja** koje koristi Online kviz, uvezen u tablicu `kz_questions`. Uvoz je snimka podataka; za novododana ili izmijenjena pitanja pokreće se `scripts/sync-kvadrati-abc.mjs` s povjerljivim ključem iz sigurnog terminala (nije automatska sinkronizacija).
- Prozor pitanja sada prikazuje ABC odgovore, redoslijed, rezultat, **povijest točnih i netočnih odgovora s označenim rješenjima**, ocjene **👍 / 👎**, obrazac **Pohvale/primjedbe**, rezultate, **PNG povijesti** i **dijeljenje** na podržanim uređajima.
- Ocjene se poslužiteljskom provjerom identiteta, odigranog pitanja i jedinstvenog glasa šalju u **istu tablicu `quiz_question_votes` kao Online kviz**, s oznakom `kraljevstvo_znanja`. Primjedbe se šalju kroz postojeću Supabase Edge Function `send-quiz-feedback`. Nema dvostrukog glasanja istog igrača za isto pitanje.
- Povijest zadnjih 12 završenih partija dostupna je kroz `kz_history`; u aktivnoj partiji točni odgovor skriven je do trenutka odgovaranja. Nakon potvrđenog odgovora povijest je čitljiva.
- Testirano u SQL transakciji s poništavanjem: 10 novih pitanja, odgovor 1–10, završetak tek na 10, dohvat povijesti i odbijanje dvostrukog glasa. Potpuni preglednički E2E još nije obavljen.
