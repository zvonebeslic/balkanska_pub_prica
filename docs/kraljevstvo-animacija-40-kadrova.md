# Kraljevstvo znanja — standard animiranih ikona

Sve nove fantasy ikone izrađuju se s **točno 40 kadrova** po jednom liku. To vrijedi i za fiksne čuvare i za pokretne građevine.

- Priprema: 40 različitih poza s istim pogledom odozgo / izometrijski, dosljedna rasvjeta, bez susjednih likova u kadru.
- Atlas: 40 vodoravnih WebP kadrova s alfa-prozirnošću; bez bijele pozadine, crvenih halo-rubova i drugih ostataka generiranja.
- Sidrenje: donja sredina figure u istoj točki svih kadrova; geografski položaj određuje Leaflet marker, a ne pomicanje bitmapa.
- Pokretne figure: zemljopisna brzina i brzina ponavljanja koraka su **odvojene**. Trenutačni dvorac putuje 2 km/h, a koraci traju oko 2,8 s za 40 kadrova.
- Nepokretni čuvari: središte markera ostaje fiksno; smiju se animirati glava, ramena, zastavice, para, oči i svjetla.
- U pregledniku se animiraju samo vidljive ikone; zadržati ograničenje broja prikazanih primjeraka na mobitelu.
- Poštovati `prefers-reduced-motion`.

## Stanje dvaju početnih likova

- **Hodajući dvorac:** na GitHub je spremljen puni 40-kadrovni, 192×192 WebP atlas i odgovarajući player.
- **Sir Željeznik:** učitava se novi 40-kadrovni WebP atlas `kz-sir-zeljeznik-optical-40.js`, složen kao **8 stupaca × 5 redova** od 224×224 px. Svaki kadar se prikazuje samostalno, bez preklapanja dviju poluprozirnih slika (uzrok bljeskanja). Prijelazne poze dobivene su **optičkim deformiranjem iz postojećih 9 ključnih poza**, stoga nije riječ o 40 ručno ili 3D-renderiranih izvornika. Za konačnu animaciju lik treba rigirati i izrenderirati 40 stvarnih, dosljednih poza.

Za buduće likove ne koristiti privremenu interpolaciju kao konačan asset.
