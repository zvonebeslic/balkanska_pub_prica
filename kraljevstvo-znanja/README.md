# Kraljevstvo znanja — samostalni dio KvizToGo projekta

Ovo je zasebna podmapa unutar postojećeg repozitorija KvizToGo, **nije drugi hosting ni nova baza**.

## Ulaz u igru
- Web-stranica: [index.html](index.html), javna adresa `https://kviztogo.com/kraljevstvo-znanja/`.
- Glavna logika: [kraljevstvo-znanja.js](kraljevstvo-znanja.js).
- Stilovi: [kraljevstvo-znanja.css](kraljevstvo-znanja.css).
- Živi čuvari: `kz-castle-fleet.js`, `kz-iron-legion.js` i pripadajući CSS.
- Aktivni mediji su u [media/](media/): `hodajuci-dvorac-80.webp`, `sir-zeljezni-80.webp`, `carobna-suma-300m2.webm` i njezin `carobna-suma-300m2-poster.webp`.
- Povijesni, **neaktivni** prototipovi u [legacy/](legacy/); ne učitavati bez migracije na GPS i nova pravila.
- Dokumentacija u [docs/](docs/).


## Jedan katalog za sve likove (23. 11. 2026.)

- **Katalog dva preostala atlasna lika:** `kz-world-registry.js` sadrži samo `castle` i `iron`, njihove dimenzije, izvore, animaciju i zajedničku globalnu mrežu 5 × 4 m. Treća i jedina dodatna vrsta je Čarobna šuma u `kz-magic-forests.js`.
- **Aktivna su samo dva WebP atlasa:** `media/hodajuci-dvorac-80.webp` i `media/sir-zeljezni-80.webp`, svaki zajednički svim primjercima svoje vrste. Čarobna šuma koristi `media/carobna-suma-300m2.webm` i `media/carobna-suma-300m2-poster.webp`. Izvorni 40-kadrovski atlasi dvorca i Željeznika čuvaju se u glavnoj mapi igre kao ulazi za generator, ali se ne učitavaju na stranici. Stari 80-kadrovski `.js` atlasi nisu više potrebni niti su aktivni.
- **Jedan zajednički Canvas renderer:** `KZWorldRegistry.layout/frameAt/paint`. Dinamički prepoznaje izvorne atlase s 40 ili 80 **stvarnih** kadrova (u mreži poput 10 × 8 za 80). Kod dvorca i Željeznika više nema odvojenih postupaka za rezanje i crtanje kadrova.
- **Preostale su točno tri vrste objekata:** Hodajući dvorac, Sir Željezni i Čarobna šuma. Dvorac i Željezni imaju po 80 kadrova (40 originalnih + 40 interpoliranih) u zasebnim 10 × 8 WebP atlasima. Šuma koristi 4-sekundni animirani WebM. Uklonjeni su zmaj, vitez, sova, čarobnjak, zastava, njihove SVG definicije, CSS animacije, zasebni dekorativni sloj i zajednički atlas.
- **Početni raspored po stvarnim kvadratima:** Svi likovi nalaze se u središtu jednog globalno poravnatog kvadrata 5 × 4 m, istog kakav igra koristi za teritorije. Nasumični uzorci uz minimalni razmak smanjuju gomilanje; nema vezanja za gradove. Početni X/Y ID kvadrata jedinstven je za svih 12 401 mogućih likova. Svi preglednici dobivaju iste početne koordinate.
- **Regionalne kvote Željeznika:** Balkan 5 000, ostatak Europe 2 000, Sjeverna Amerika 700, Južna Amerika 700, Afrika 700, Azija 700, Australija i Oceanija 700 te Antarktika 700 (ukupno 11 200). Prvih 201 dvoraca: 100 Balkan, 41 ostatak Europe, po 10 u ostalih šest regija. Dodatni dvorci raspoređuju se ponderiranim nasumičnim izborom regije.
- **Diskretne koordinate:** `X … · Y …` u donjem lijevom kutu karte pokazuje indeks kvadrata u središtu i mijenja se tijekom pomicanja. Na zumu 21 i više X/Y je slabo ispisan i u svakom prikazanom kvadratu (kada ih je dovoljno malo). Ovo su indeksi 5 × 4 m blokova, nisu GPS stupnjevi.
- **Nakon poraza:** stvarni borbeni RPC `kz_guardian_answer` poziva `kz_random_world_spawn(guardian_id)`, koji bira sasvim drugi nasumični sektor *unutar iste regije*, zatim ga poravnava na X/Y blok 5 × 4 m. Novi položaj sprema se u `kz_castle_state` i šalje svim igračima. Do 32 pokušaja izbjegava bliske prethodne lokacije i aktivne respawnove; indeks čuvara se obnavlja. I stariji `kz_castle_answer` povezan je na isti mehanizam.
- **Server i prikaz su sinkronizirani:** svih 12 401 polazišta (i smjerovi dvoraca) upisani su u postojeću tablicu `kz_guardian_catalog`, s dodatnim `region_id`. GPS provjera u `kz_guardian_position` koristi iste početne pozicije i putanje koje vidi preglednik.
- **Ograničenja:** kopnena maska je pojednostavljena, ne precizna geografska baza obala; rijetki rubni položaji mogu biti blizu mora. Globalna raspršenost smanjuje nakupine, ali uz konačan broj čuvara na velikom zumu uvijek mogu postojati prazna područja. Generiranje 40 među-kadrova optičkim tokom povećava vremensku rezoluciju animacije, ali ne može zamijeniti ručno izrađenih 80 novih umjetničkih poza.
- **Performanse:** Leaflet prikazuje samo dio čuvara i šuma unutar kadra. Pokret dvorca i kadrovi dva rasterizirana čuvara prilagođeni su zumu; šume ograničavaju broj aktivnih video dekodera. Nekadašnji sloj pet malih vrsta i njihov veliki atlas više se ne učitavaju. Gumb „Živi svijet” upravlja preostalim trima vrstama.

## Automatska izrada 80 kadrova

Pokrenuti workflow `../.github/workflows/kz-80-frame-atlases.yml` ili lokalno iz korijena repozitorija `python kraljevstvo-znanja/scripts/build-80-frame-atlases.py` uz Pillow, numpy i OpenCV. Workflow proizvodi i provjerava **samo dva aktivna atlasa**, za dvorac i Željeznika. Obnovu pet uklonjenih manjih vrsta automatizacija više ne izvodi.

Nove vrste ne aktivirati automatski: trenutačno su odobrene samo Čarobna šuma, Sir Željezni i Hodajući dvorac. Svi primjerci koriste zajedničke medijske resurse i globalnu mrežu, bez dupliciranja slika po lokaciji.


## Čarobne šume — stvarni animirani video (23. 11. 2026.)

- **Odobrena ilustracija i pokreti:** ista detaljna izometrijska šuma s druidom uz kotao, potokom, slapovima, životinjama i čarobnim svjetlima kao u korisničkom videopregledu. Ne zamjenjivati s emoji drvećem, proceduralno generiranim stablima ni nekim drugim motivom.
- **Medij:** `media/carobna-suma-300m2.webm` (zadržano izvorno ime datoteke radi kompatibilnosti; stvarna površina je sada 500 m²), transparentni VP9 s 4 s animacije, optimiziran na 400 × 346 px (20 fps) za prikaz na karti. `media/carobna-suma-300m2-poster.webp` izveden je iz prvog kadra tog istog videa; automatizirana izrada je u `.github/workflows/kz-forest-poster.yml`.
- **Količina:** 341 trajna položaja: Balkan 200; Njemačka 20; ostatak Europe 20; Azija 20; Afrika 20; Sjeverna Amerika 20; Južna Amerika 20; Australija/Oceanija 20; Antarktika 1. Za svaki položaj koristi se ista URL datoteka, bez kopija videa po lokaciji.
- **Mjerilo (ažurirano):** svaka šuma zauzima **5 × 5 globalnih kvadrata** po 20 m², tj. točno **500 m²** (25 × 20 m). Središte je izračunato iz granica svih 25 kvadrata, bez pomaka ikone u odnosu na X/Y mrežu. Položaj je deterministički odabran na kopnu; ne mijenja teritorij kraljevstava.
- **Prikaz:** na svim zumovima koristi se **jedan isti motiv** iz izvornog videa, bez zamjenskih stabala i bez prebacivanja na različitu grafiku pri povećavanju. Na daljini se vidi njegova minijatura, pri većem zumu ista animacija. Od zuma 20 prikaz i okvir slike slijede svih 5 × 5 stvarnih blokova; CSS više ne ograničava visinu na kratku traku (stari razlog za vizualni dojam svega devet kvadrata). Za stabilne performanse prikazuje se najviše 3 aktivna video-dekodera na mobitelu odnosno 6 na većem zaslonu, a ostali koriste poster iz prvoga kadra istog videa. Medij je utišan i ponavlja se u petlji.

## Veze s glavnim KvizToGo
- `/online-kviz.html` vodi u igru preko `/kraljevstvo-znanja/`.
- Stare adrese `/kraljevstvo-znanja.html` i `/kvadrati-znanja.html` ostaju **samo dva mala HTML preusmjeravanja** u korijenu. Sva aktivna programska logika, stilovi, slike, animacije i alati za Kraljevstvo nalaze se u `kraljevstvo-znanja/`.
- Nema `<base href="/">`: veze na glavne KvizToGo stranice i slike koriste `../`, tako da rade i na GitHub Pages repozitorijskoj putanji.
- Svi lokalni moduli igre učitavaju se relativno (`./naziv-datoteke`), bez pretpostavke o korijenu domene.
- Podaci ostaju u istom Supabase projektu; promjena putanje ne mijenja `localStorage` origin ni postojeće identifikatore.

## Baza podataka
Supabase migracije i sjeme čuvara **namjerno** ostaju u standardnim lokacijama
`../supabase/migrations/` i `../supabase/seeds/`, jer Supabase CLI odande čita promjene baze. Ne premještati ih bez promjene procesa migracija.

## Sigurno održavanje
Mijenjajte kod unutar ove mape. Korijenske datoteke ostatka KvizToGo ne treba dirati osim kad dodajete novu navigacijsku poveznicu. Provjerite navigaciju, JS i CSS, povratak na online kviz, GPS dijalog i Supabase povezivanje nakon objave na Hostingeru.
