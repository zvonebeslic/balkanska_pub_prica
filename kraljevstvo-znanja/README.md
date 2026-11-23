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
- **WebP atlasi ostaju odvojene datoteke:** `kz-roaming-castle-atlas.js` i `kz-sir-zeljeznik-optical-40.js`; katalog ih referencira, ne kopira u svaki primjerak. Ovo smanjuje duplikate i omogućuje predmemoriranje.
- **Jedan zajednički Canvas renderer:** `KZWorldRegistry.layout/frameAt/paint`. Dinamički prepoznaje izvorne atlase s 40 ili 80 **stvarnih** kadrova (u mreži poput 10 × 8 za 80). Kod dvorca i Željeznika više nema odvojenih postupaka za rezanje i crtanje kadrova.
- **Trenutačno dostupna grafika i dalje ima 40 originalnih kadrova po vrsti**, bez lažnog dupliciranja ili bljeskajućeg alfa preklapanja. Za pravih 80 kadrova potrebno je pripremiti novi atlas svakog lika; nakon zamjene nema potrebe mijenjati logiku prikaza. Vremena animacija ostaju definirana u katalogu.
- **Početni raspored:** 31 498 približnih kopnenih sektora jednakih površina; algoritam odabire nasumično izmiješane različite sektore, bez klasteriranja oko gradova. Od 11 200 Željeznika svaki dobiva stabilnu jedinstvenu početnu točku. Dvorci dijele isti princip. Svi preglednici dobiju isti raspored.
- **Nakon poraza:** PostgreSQL na serveru odabire novi slučajni kopneni sektor, sprema `start_lat/start_lng` u `kz_castle_state` i vraća ga svim korisnicima. Do 16 pokušaja izbjegava bliske prethodne respawn točke; Željeznikov prostorni indeks se obnavlja kako bi se prikazao na novoj lokaciji.
- **Ograničenja:** kopnena maska je pojednostavljena, ne precizna geografska baza obala; rijetki rubni položaji mogu biti blizu mora. Globalna raspršenost smanjuje nakupine, ali uz konačan broj čuvara na velikom zumu uvijek mogu postojati prazna područja. Izvorna 40-kadrovna grafika još uvijek ne može biti potpuno glatka kao 80 pravih kadrova.
- **Performanse:** Leaflet prikazuje samo dio čuvara na aktualnom ekranu. Animacije su vezane uz `requestAnimationFrame`, a stvarno pomicanje dvorca prilagođeno zumu; na dalekoj karti ne osvježava se svaki nevidljiv subpiksel.

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
