/* Kraljevstvo znanja — oznake koordinata, zasebno od borbi i teritorija. */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char =>
    ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  let map = null, layer = null, kingdom = null, notes = [], currentLoad = 0, saving = false;

  const currentXY = () => window.KZWorldRegistry.blockFor(map.getCenter().lat, map.getCenter().lng);
  const pointAt = (x,y) => window.KZWorldRegistry.pointFromBlock({x,y});
  const api = (name,data={}) => {
    if (typeof window.KZCoordinateRPC !== "function") throw Error("Spremanje koordinata nije spremno.");
    return window.KZCoordinateRPC(name,data);
  };
  function notify(message) {
    const toast = $("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("on");
    clearTimeout(notify.timeout);
    notify.timeout = setTimeout(() => toast.classList.remove("on"), 4500);
  }
  function close() {
    $("dialog-backdrop").classList.add("hidden");
    $("dialog-body").replaceChildren();
  }
  function repaint() {
    if (!layer || !map) return;
    layer.clearLayers();
    for (const n of notes) {
      const x = Number(n.x), y = Number(n.y);
      if (!Number.isSafeInteger(x) || !Number.isSafeInteger(y)) continue;
      const html = '<div class="kz-saved-coord-glyph" aria-hidden="true">✦</div>';
      const icon = L.divIcon({className:"kz-saved-coord-icon",html,iconSize:[24,30],iconAnchor:[12,28]});
      const marker = L.marker(pointAt(x,y),{icon}).addTo(layer);
      marker.bindPopup('<div class="kz-note-popup"><b>'+escapeHtml(n.title)+'</b>'+
        '<small>X '+x+' · Y '+y+'</small>'+
        (n.description ? '<p>'+escapeHtml(n.description)+'</p>' : '')+'</div>',{maxWidth:250});
    }
  }
  async function loadNotes() {
    const id = kingdom?.id, revision = ++currentLoad;
    if (!id) {notes=[];repaint();renderList();return;}
    try {
      const received = await api("kz_coord_list");
      if (revision !== currentLoad || kingdom?.id !== id) return;
      notes = Array.isArray(received) ? received : [];
      repaint();
      renderList();
    } catch (error) {
      if (revision === currentLoad) notify("Lokacije nije moguće učitati: "+error.message);
    }
  }
  function xyFromInputs() {
    const xValue = $("kz-note-x")?.value.trim(), yValue = $("kz-note-y")?.value.trim();
    if (!xValue || !yValue || !/^-?\d+$/.test(xValue) || !/^-?\d+$/.test(yValue)) {
      throw Error("X i Y moraju biti cijeli brojevi.");
    }
    const x = Number(xValue), y = Number(yValue);
    if (!Number.isSafeInteger(x) || !Number.isSafeInteger(y) ||
      Math.abs(x) > 10000000000 || Math.abs(y) > 10000000000) {
      throw Error("Broj je prevelik za precizan prikaz karte.");
    }
    return {x,y};
  }
  function focusLocation(x,y) {
    const target=pointAt(x,y);
    const beyondEarth=Math.abs(target.lat)>85.0511287798066||Math.abs(target.lng)>180;
    // A direct coordinate jump must reset the pixel origin, not reuse an animated pan.
    // A fixed overview zoom keeps small discoveries such as Lotar visible in full.
    map.stop();
    map.setView([target.lat,target.lng],beyondEarth?13:Math.max(18,map.getZoom()),{animate:false,reset:true});
    const actual=currentXY();
    if(actual.x!==x||actual.y!==y){
      map.setView([target.lat,target.lng],20,{animate:false,reset:true});
      const retry=currentXY();
      if(retry.x!==x||retry.y!==y)throw Error("Karta nije dosegla unesene koordinate. Osvježi stranicu.");
    }
  }
  function renderList() {
    const box = $("kz-note-list");
    if (!box) return;
    box.innerHTML = !kingdom ? '<p class="kz-note-muted">Pridruži se kraljevstvu kako bi spremao i vidio njegove oznake.</p>' :
      !notes.length ? '<p class="kz-note-muted">Kraljevstvo još nema spremljenih lokacija.</p>' :
      notes.map(n => '<article class="kz-note-item">'+
        '<div class="kz-note-item-text"><b>'+escapeHtml(n.title)+'</b><small>X '+Number(n.x)+' · Y '+Number(n.y)+'</small>'+
        (n.description ? '<p>'+escapeHtml(n.description)+'</p>' : '')+'</div>'+
        '<div class="kz-note-item-actions"><button type="button" data-kz-go="'+escapeHtml(n.id)+'">Prikaži</button>'+
        (n.can_delete ? '<button type="button" data-kz-remove="'+escapeHtml(n.id)+'" class="kz-note-delete">Obriši</button>' : '')+
        '</div></article>').join("");
  }
  function showPanel() {
    if (!map || !window.KZWorldRegistry) return notify("Karta se još učitava.");
    const {x,y} = currentXY();
    $("dialog").classList.remove("kz-quiz-dialog");
    $("dialog-title").textContent = "⌖ Koordinate kraljevstva";
    $("dialog-body").innerHTML =
      '<div class="kz-note-panel"><p class="kz-note-muted">Križić je uvijek u središtu karte. X/Y pri dnu prikazuju upravo taj kvadrat (5 × 4 m).</p>'+
      '<form id="kz-note-form">'+
      '<div class="kz-note-fields">'+
      '<label>X koordinata<input id="kz-note-x" type="number" inputmode="numeric" step="1" required value="'+x+'"></label>'+
      '<label>Y koordinata<input id="kz-note-y" type="number" inputmode="numeric" step="1" required value="'+y+'"></label></div>'+
      '<div class="kz-note-shortcuts">'+
      '<button type="button" id="kz-note-center">⌖ Preuzmi iz križića</button>'+
      '<button type="button" id="kz-note-goto">Prikaži te koordinate</button></div>'+
      '<label>Što se nalazi na toj lokaciji?<input id="kz-note-title" type="text" maxlength="90" placeholder="Npr. stari dvorac, izvor, sastajalište" required></label>'+
      '<label>Opis ili napomena<textarea id="kz-note-description" maxlength="500" rows="3" placeholder="Upiši što je ovo mjesto i zašto je važno…"></textarea></label>'+
      '<button id="kz-note-save" class="primary" type="submit" '+(!kingdom?'disabled':'')+'>📌 Spremi u kraljevstvo</button>'+
      (!kingdom?'<p class="kz-note-muted">Spremanje je dostupno nakon učlanjenja u kraljevstvo.</p>':'')+
      '</form><div class="kz-note-heading"><h3>Spremljena mjesta'+(kingdom?' · '+notes.length:'')+'</h3><button type="button" id="kz-note-refresh">↻</button></div>'+
      '<div id="kz-note-list"></div></div>';
    $("dialog-backdrop").classList.remove("hidden");
    renderList();
    $("kz-note-center").onclick = () => {
      const c = currentXY();
      $("kz-note-x").value = c.x; $("kz-note-y").value = c.y;
    };
    $("kz-note-goto").onclick = () => {
      try { const {x,y} = xyFromInputs(); focusLocation(x,y); close(); notify("X "+x+" · Y "+y); }
      catch (error) { notify(error.message); }
    };
    $("kz-note-refresh").onclick = () => loadNotes();
    $("kz-note-list").onclick = async event => {
      const go = event.target.closest("[data-kz-go]");
      const del = event.target.closest("[data-kz-remove]");
      if (go) {
        const n = notes.find(n => n.id === go.dataset.kzGo);
        if (n) {focusLocation(Number(n.x),Number(n.y));close();notify("Prikazana lokacija: "+n.title);}
      }
      if (del && !saving) {
        const n = notes.find(n => n.id === del.dataset.kzRemove);
        if (!n || !n.can_delete || !confirm('Obrisati lokaciju „'+n.title+'”?')) return;
        saving = true;
        try {await api("kz_coord_delete",{p_id:n.id}); await loadNotes();notify("Lokacija je obrisana.");}
        catch (error) {notify("Brisanje nije uspjelo: "+error.message);}
        finally {saving = false;}
      }
    };
    $("kz-note-form").onsubmit = async event => {
      event.preventDefault();
      if (saving || !kingdom) return;
      try {
        const {x,y} = xyFromInputs();
        const title = $("kz-note-title").value.trim();
        const description = $("kz-note-description").value.trim();
        if (!title || title.length > 90 || description.length > 500) throw Error("Provjeri naziv i opis lokacije.");
        saving = true; $("kz-note-save").disabled = true;
        await api("kz_coord_save",{p_x:x,p_y:y,p_title:title,p_description:description});
        await loadNotes();
        focusLocation(x,y);
        $("kz-note-title").value = "";
        $("kz-note-description").value = "";
        notify("Koordinate su spremljene u tvoje kraljevstvo.");
      } catch (error) {notify("Spremanje nije uspjelo: "+error.message);}
      finally {saving = false; if ($("kz-note-save")) $("kz-note-save").disabled = !kingdom;}
    };
  }
  window.addEventListener("kz:map-ready", event => {
    map = event.detail.map;
    layer = L.layerGroup().addTo(map);
    repaint();
  });
  window.addEventListener("kz:state", event => {
    const next = event.detail?.state?.kingdom || null;
    if ((next?.id || null) !== (kingdom?.id || null)) {
      kingdom = next; loadNotes();
    } else {
      kingdom = next;
    }
  });
  $("kz-coordinate-bookmarks")?.addEventListener("click",showPanel);
})();