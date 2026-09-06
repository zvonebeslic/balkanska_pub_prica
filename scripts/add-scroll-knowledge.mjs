import fs from 'node:fs';

const path = 'online-kviz.html';
let text = fs.readFileSync(path, 'utf8');
const marker = '      <!-- ✅ NOVO: Tematski kvizovi -->';

if (text.includes('id="scroll-knowledge-menu"')) {
  console.log('Scrollanjem do Znanja već postoji.');
  process.exit(0);
}

if (!text.includes(marker)) {
  throw new Error('Nije pronađeno sigurno mjesto prije Tematskih kvizova.');
}

const block = `      <!-- Scrollanjem do Znanja -->
      <div class="themed-row" id="scroll-knowledge-menu" style="display:block;">
        <details style="width:100%;">
          <summary class="themed-btn" style="list-style:none;cursor:pointer;user-select:none;">Scrollanjem do Znanja</summary>
          <div style="margin-top:.55rem;padding:.65rem;border:1px solid rgba(148,163,184,.22);border-radius:18px;background:rgba(16,27,45,.82);">
            <div class="themed-grid">
              <a class="themed-topic" style="text-decoration:none;" href="scroll-znanje.html?mode=all">Beskrajni niz</a>
              <a class="themed-topic" style="text-decoration:none;" href="scroll-znanje.html?mode=50">Nasumičnih 50</a>
              <a class="themed-topic" style="text-decoration:none;" href="scroll-znanje.html?topic=AmerickiPredsjednici.json">Američki predsjednici</a>
              <a class="themed-topic" style="text-decoration:none;" href="scroll-znanje.html?topic=AntickiRim.json">Antički Rim</a>
              <a class="themed-topic" style="text-decoration:none;" href="scroll-znanje.html?topic=Film.json">Film</a>
              <a class="themed-topic" style="text-decoration:none;" href="scroll-znanje.html?topic=FloraFauna.json">Flora i fauna</a>
              <a class="themed-topic" style="text-decoration:none;" href="scroll-znanje.html?topic=Gaming.json">Gaming</a>
              <a class="themed-topic" style="text-decoration:none;" href="scroll-znanje.html?topic=Glazba.json">Glazba</a>
              <a class="themed-topic" style="text-decoration:none;" href="scroll-znanje.html?topic=Knjizevnost.json">Književnost</a>
              <a class="themed-topic" style="text-decoration:none;" href="scroll-znanje.html?topic=Moreplovci.json">Moreplovci</a>
              <a class="themed-topic" style="text-decoration:none;" href="scroll-znanje.html?topic=Nogomet.json">Nogomet</a>
              <a class="themed-topic" style="text-decoration:none;" href="scroll-znanje.html?topic=Sport.json">Sport</a>
              <a class="themed-topic" style="text-decoration:none;" href="scroll-znanje.html?topic=Zemljopis.json">Zemljopis</a>
              <a class="themed-topic" style="text-decoration:none;" href="scroll-znanje.html?topic=Znanost.json">Znanost</a>
            </div>
          </div>
        </details>
      </div>

`;

text = text.replace(marker, block + marker);
fs.writeFileSync(path, text, 'utf8');
console.log('Scrollanjem do Znanja je dodan u online-kviz.html.');
