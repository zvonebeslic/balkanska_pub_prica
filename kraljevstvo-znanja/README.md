# Kraljevstvo znanja — samostalni dio KvizToGo projekta

Ovo je zasebna podmapa unutar postojećeg repozitorija KvizToGo, **nije drugi hosting ni nova baza**.

## Ulaz u igru
- Web-stranica: [index.html](index.html), javna adresa `https://kviztogo.com/kraljevstvo-znanja/`.
- Glavna logika: [kraljevstvo-znanja.js](kraljevstvo-znanja.js).
- Stilovi: [kraljevstvo-znanja.css](kraljevstvo-znanja.css).
- Živi čuvari: `kz-castle-fleet.js`, `kz-iron-legion.js` i pripadajući CSS.
- Animirani atlasi: `kz-roaming-castle-atlas.js`, `kz-sir-zeljeznik-optical-40.js`.
- Povijesni, **neaktivni** prototipovi u [legacy/](legacy/); ne učitavati bez migracije na GPS i nova pravila.
- Dokumentacija u [docs/](docs/).


## Jedan katalog za sve likove (23. 11. 2026.)

- **Jedino mjesto za metapodatke i izvorne SVG ilustracije:** `kz-world-registry.js`. Tu su vrste, dimenzije kadrova, vrijeme animacije, granice prikaza, izvorni WebP atlasi i globalno pravilo rasporeda.
- **WebP atlasi ostaju zasebne generirane datoteke:** aktivni `kz-roaming-castle-atlas-80.js`, `kz-sir-zeljeznik-80.js` i `kz-small-world-80.js` (pet manjih likova). Katalog samo referencira te datoteke — svi primjerci jednog lika koriste isti WebP atlas, bez dupliciranja po svakom markeru. Izvorni 40-kadrovni atlasi sačuvani su kao izvor za ponovnu izgradnju, ali nisu učitani na aktivnoj stranici.
- **Jedan zajednički Canvas renderer:** `KZWorldRegistry.layout/frameAt/paint`. Dinamički prepoznaje izvorne atlase s 40 ili 80 **stvarnih** kadrova (u mreži poput 10 × 8 za 80). Kod dvorca i Željeznika više nema odvojenih postupaka za rezanje i crtanje kadrova.
- **Svih sedam aktivnih tipova grafike ima 80 različitih kadrova po vrsti:** hodajući dvorac i Sir Željeznik imaju 40 izvornih poza + 40 interpoliranih međukadrova s dvosmjernim optičkim tokom, uključujući prijelaz posljednjeg kadra u prvi. Zmaj, vitez, sova, čarobnjak i zastava imaju po 80 zasebno renderiranih SVG poza. Sve su složene u 10 × 8 transparentnih WebP atlasa; kadrovi nisu jednostavno duplicirani. Između međukadrova još uvijek može biti vizualnih artefakata optičkog toka, ovisno o izvornoj grafici.
- **Početni raspored po stvarnim kvadratima:** Svi likovi nalaze se u središtu jednog globalno poravnatog kvadrata 5 × 4 m, istog kakav igra koristi za teritorije. Nasumični uzorci uz minimalni razmak smanjuju gomilanje; nema vezanja za gradove. Početni X/Y ID kvadrata jedinstven je za svih 12 401 mogućih likova. Svi preglednici dobivaju iste početne koordinate.
- **Regionalne kvote Željeznika:** Balkan 5 000, ostatak Europe 2 000, Sjeverna Amerika 700, Južna Amerika 700, Afrika 700, Azija 700, Australija i Oceanija 700 te Antarktika 700 (ukupno 11 200). Prvih 201 dvoraca: 100 Balkan, 41 ostatak Europe, po 10 u ostalih šest regija. Dodatni dvorci raspoređuju se ponderiranim nasumičnim izborom regije.
- **Diskretne koordinate:** `X … · Y …` u donjem lijevom kutu karte pokazuje indeks kvadrata u središtu i mijenja se tijekom pomicanja. Na zumu 21 i više X/Y je slabo ispisan i u svakom prikazanom kvadratu (kada ih je dovoljno malo). Ovo su indeksi 5 × 4 m blokova, nisu GPS stupnjevi.
- **Nakon poraza:** stvarni borbeni RPC `kz_guardian_answer` poziva `kz_random_world_spawn(guardian_id)`, koji bira sasvim drugi nasumični sektor *unutar iste regije*, zatim ga poravnava na X/Y blok 5 × 4 m. Novi položaj sprema se u `kz_castle_state` i šalje svim igračima. Do 32 pokušaja izbjegava bliske prethodne lokacije i aktivne respawnove; indeks čuvara se obnavlja. I stariji `kz_castle_answer` povezan je na isti mehanizam.
- **Server i prikaz su sinkronizirani:** svih 12 401 polazišta (i smjerovi dvoraca) upisani su u postojeću tablicu `kz_guardian_catalog`, s dodatnim `region_id`. GPS provjera u `kz_guardian_position` koristi iste početne pozicije i putanje koje vidi preglednik.
- **Ograničenja:** kopnena maska je pojednostavljena, ne precizna geografska baza obala; rijetki rubni položaji mogu biti blizu mora. Globalna raspršenost smanjuje nakupine, ali uz konačan broj čuvara na velikom zumu uvijek mogu postojati prazna područja. Generiranje 40 među-kadrova optičkim tokom povećava vremensku rezoluciju animacije, ali ne može zamijeniti ručno izrađenih 80 novih umjetničkih poza.
- **Performanse:** Leaflet prikazuje samo dio čuvara u vidljivom kadru. Animacije su vezane uz `requestAnimationFrame`, a stvarno pomicanje dvorca prilagođeno zumu. Pet dodatnih manjih likova iscrtavaju se u zasebnom, neinteraktivnom sloju; njihov objedinjeni atlas učitava se **tek pri približavanju karte na zum 10–18**. Opcija „Živi svijet” isključuje sloj, a `prefers-reduced-motion` zaustavlja izmjenu kadrova.

## Automatska izrada 80 kadrova

Pokrenuti workflow `.github/workflows/kz-80-frame-atlases.yml` ili lokalno `python scripts/build-kz-80-frames.py` uz Pillow, numpy, OpenCV, CairoSVG i Node 20+. Workflow generira i provjerava stvarne dimenzije svakog atlasa te automatski sprema sva tri generirana JS resursa. Aktivna HTML stranica učitava samo nove 80-kadrovne atlase za dvorac i Željeznika, a malene učitava na zahtjev. Za regeneriranje izvornih SVG likova uređuju se `lifeSprites` unutar centralnog kataloga.

Prilikom dodavanja nove vrste lika: registrirati jednu vrstu i izvor grafike u katalogu; svi primjerci koriste isti atlas i zajednički renderer. Ne umnažati slike za svaki primjerak, niti unositi tisuće gradskih koordinata ručno.

## Veze s glavnim KvizToGo
- `/online-kviz.html` vodi u igru preko `/kraljevstvo-znanja/`.
- Stare adrese `/kraljevstvo-znanja.html` i `/kvadrati-znanja.html` ostaju kompatibilna preusmjeravanja.
- Nema `<base href="/">`: veze na glavne KvizToGo stranice i slike koriste `../`, tako da rade i na GitHub Pages repozitorijskoj putanji.
- Svi lokalni moduli igre učitavaju se relativno (`./naziv-datoteke`), bez pretpostavke o korijenu domene.
- Podaci ostaju u istom Supabase projektu; promjena putanje ne mijenja `localStorage` origin ni postojeće identifikatore.

## Baza podataka
Supabase migracije i sjeme čuvara **namjerno** ostaju u standardnim lokacijama
`../supabase/migrations/` i `../supabase/seeds/`, jer Supabase CLI odande čita promjene baze. Ne premještati ih bez promjene procesa migracija.

## Sigurno održavanje
Mijenjajte kod unutar ove mape. Korijenske datoteke ostatka KvizToGo ne treba dirati osim kad dodajete novu navigacijsku poveznicu. Provjerite navigaciju, JS i CSS, povratak na online kviz, GPS dijalog i Supabase povezivanje nakon objave na Hostingeru.
