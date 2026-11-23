# Kraljevstvo Znanja — deset SVG bića (probna integracija)

Dodano na stvarnu Leaflet kartu igre `kraljevstvo-znanja.html` bez promjena pravila osvajanja m², postojećeg kviza, Supabase RPC funkcija ili naplate.

## Sadržaj
- `kz-creatures-art.js` — **10 originalnih detaljnih animiranih SVG ilustracija** zapakiranih bez gubitka u gzip/base64 JSON. 
- `kz-creatures.js` — raspored bića oko sidrišta kraljevstva, površina u m², prikaz po zoomu, GPS otključavanje i **demo** bitke.
- `kz-creatures.css` — oznake HP-a, dijalozi i responzivni prikaz.
- `kraljevstvo-znanja.html` i `kraljevstvo-znanja.js` — uključivanje modula i događaji `kz:map-ready`, `kz:state`, `kz:kingdoms`.

## Stvorenja
- Dvosova Noćnica — 50 m², 120 HP
- Sir Željeznik — 70 m², 180 HP
- Rogozmaj — 70 m², 170 HP
- Galoplam — 70 m², 160 HP
- Morskokril — 50 m², 110 HP
- Neboperka — 50 m², 100 HP
- Koračgrad — 150 m², 320 HP
- Mrakotrag — 50 m², 140 HP
- Starokorijen — 100 m², 260 HP
- Rumenpuf — 50 m², 90 HP

## Pravila probne igre
- Bića se prikazuju uz sidrište vlastitog kraljevstva. Ako korisnik nema kraljevstvo, služi prvo dostupno sidrište kao pregled.
- Realna površina: SVG ima geografski vezanu kvadratnu podlogu područja 50–150 m²; prikaz počinje pri zumiranju >=18. SVG nije fiksna pikselska ikona.
- GPS potvrda uz dopuštenje korisnika; borba je dostupna **unutar 1 km**.
- Po jednom biću po igraču do 20 pitanja; svaki točan odgovor skida 10 % **početnog** HP-a.
- 20 odgovora ili poraz pokreću 24-satno čekanje. Ako biće nije poraženo, preostali HP zadržava se pri obnovi pitanja.
- **5 € za dodatnih 20 pitanja nije omogućeno** i ne postoji naplata.

## Važna ograničenja
Ovo je **frontend prototip, ne produkcijski zaštićena igra**. Napredak se sprema u `localStorage`, korisnik ga može izmijeniti ili izgubiti; druge uređaje ne sinkronizira. Za pouzdane obračune i kupnje potrebno je dodati SQL/Supabase server-side funkcije i sustav plaćanja.

Za sad su Morskokril i Neboperka raspoređeni uz kraljevstvo; **automatsko raspoređivanje na morsku podlogu nije implementirano**. Lokacije nisu geografski potvrđene.

SVG-ovi su bez gubitka pohranjeni u `kz-creatures-art.js`. Preglednik ih učitava pomoću `DecompressionStream("gzip")`, stoga je potreban moderan preglednik. Izvorne pojedinačne SVG datoteke nalaze se i u korisničkom ZIP-u iz razvojne konverzacije.

Nisu obavljeni automatski E2E testovi GPS-a ili preglednika na živom Hostingeru. Dodavanje u GitHub **nije isto što i objava na Hostinger** — provjeriti postoji li automatska sinkronizacija.
