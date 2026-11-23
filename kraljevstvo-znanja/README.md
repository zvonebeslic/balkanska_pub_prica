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
