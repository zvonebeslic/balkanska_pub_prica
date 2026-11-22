/* KvizToGo — 10 pre-renderiranih animiranih WebP bića uz Kraljevstvo Znanja.
 * PROTOTIP: borbe i 24 h čekanja čuvaju se isključivo u localStorageu.
 * Nema kupnje, obrade plaćanja ni promjena u Supabase bazi.
 * Atlas je trokadrovni WebP rasterski render, zapakiran u kz-sprite-atlas.js.
 */
(() => {
  "use strict";
  const CREATURES = [
    {id:"dvosova-nocnica",name:"Kraljevski vitez",type:"Oklopljeni vitez",max:120,area:50,dx:-120,dy:76},
    {id:"sir-zeljeznik",name:"Sir Željeznik",type:"Parni robot",max:180,area:70,dx:-64,dy:113},
    {id:"rogozmaj",name:"Rogozmaj",type:"Crveni zmaj",max:170,area:70,dx:28,dy:115},
    {id:"galoplam",name:"Kapetan Galoplam",type:"Gusarski kapetan",max:160,area:70,dx:116,dy:68},
    {id:"morskokril",name:"Kristalni pauk",type:"Mehanički pauk",max:110,area:50,dx:-122,dy:-19,water:true},
    {id:"neboperka",name:"Neboperka",type:"Leteći brod",max:100,area:50,dx:124,dy:-34,water:true},
    {id:"koracgrad",name:"Koračgrad",type:"Mehanički hodajući dvorac",max:320,area:150,dx:-61,dy:-112},
    {id:"mrakotrag",name:"Čarobnjak Mrakotrag",type:"Čarobnjak",max:140,area:50,dx:32,dy:-115},
    {id:"starokorijen",name:"Starokorijen",type:"Šumski div",max:260,area:100,dx:111,dy:-108},
    {id:"rumenpuf",name:"Proždrljiva škrinja",type:"Živa škrinja",max:90,area:50,dx:-9,dy:-47}
  ];
  const Q = [
    ["Koji planet zovemo Crvenim planetom?","Mars","Venera","Merkur",0],
    ["Koja je kemijska oznaka za zlato?","Ag","Au","Fe",1],
    ["Koji je najveći ocean na Zemlji?","Atlantski","Indijski","Tihi",2],
    ["Tko je napisao roman „Proces”?","Franz Kafka","Albert Camus","Thomas Mann",0],
    ["Koji je glavni grad Portugala?","Madrid","Lisabon","Porto",1],
    ["Koja je životinja simbol WWF-a?","Koala","Tigar","Velika panda",2],
    ["Koja je vrsta instrumenta oboa?","Puhački","Gudački","Udaraljkaški",0],
    ["Koji je kemijski simbol za kisik?","K","O","C",1],
    ["Koje se godine dogodilo prvo slijetanje čovjeka na Mjesec?","1961.","1975.","1969.",2],
    ["Tko je oslikao strop Sikstinske kapele?","Michelangelo","Rafael","Caravaggio",0],
    ["Koji je glavni grad Kanade?","Toronto","Ottawa","Vancouver",1],
    ["Koji je element pod rednim brojem 1?","Helij","Litij","Vodik",2],
    ["U kojoj se državi nalazi Machu Picchu?","Peru","Čile","Bolivija",0],
    ["Koji je skladatelj napisao operu „Turandot”?","Verdi","Puccini","Bizet",1],
    ["Kako se zove najveći prirodni satelit Saturna?","Europa","Ganimed","Titan",2],
    ["U kojem je gradu nastao Oktoberfest?","München","Berlin","Hamburg",0],
    ["Koji je kemijski simbol željeza?","Zn","Fe","Cu",1],
    ["Koji kontinent nema stalnih stanovnika?","Australija","Azija","Antarktika",2],
    ["Koji je poznati izmišljeni automobil Volkswagen Buba s brojem 53?","Herbie","KITT","Christine",0],
    ["Koliko bodova obično treba osvojiti za pobjedu u setu stolnog tenisa uz dva razlike?","21","11","15",1],
    ["Koja je najbliža zvijezda Zemlji?","Sirius","Polaris","Sunce",2],
    ["Kako se zove glavni grad Islanda?","Reykjavík","Oslo","Helsinki",0],
    ["Koja je rijeka najdulja u Europi?","Dunav","Volga","Rajna",1],
    ["Koji je glavni grad Australije?","Sydney","Melbourne","Canberra",2],
    ["Na kojem se planetu nalazi vulkan Olympus Mons?","Mars","Jupiter","Neptun",0],
    ["Koji se broj u rimskim brojevima označava slovom L?","100","50","500",1],
    ["Koja ptica ne može letjeti?","Sokol","Lastavica","Pingvin",2],
    ["U kojoj se državi nalazi grad Salzburg?","Austrija","Njemačka","Švicarska",0],
    ["Koja je kemijska formula vode?","CO₂","H₂O","NaCl",1],
    ["Koja je grčka božica mudrosti?","Hera","Artemida","Atena",2],
    ["Tko je napisao „Božanstvenu komediju”?","Dante Alighieri","Homer","Vergilije",0],
    ["Koje godine započinje Prvi svjetski rat?","1912.","1914.","1918.",1],
    ["Koja je životinja najviša na kopnu?","Slon","Deva","Žirafa",2],
    ["U kojem se gradu nalazi Kolosej?","Rim","Atena","Napulj",0],
    ["Koji je najveći planet Sunčeva sustava?","Saturn","Jupiter","Uran",1],
    ["U kojoj se europskoj državi nalazi Andora?","Španjolska","Francuska","Nijednoj — neovisna je država",2],
    ["U kojem je gradu muzej Prado?","Madrid","Pariz","Beč",0],
    ["Koliko igrača jedna nogometna momčad ima na terenu pri početku utakmice?","10","11","12",1],
    ["Koja je valuta Japana?","Won","Yuan","Jen",2],
    ["Koji je jezik izvorno govorio većinski dio stanovništva staroga Rima?","Latinski","Grčki","Etruščanski",0]
  ];
  const COOL=24*60*60*1000, LIMIT=20, R=6371007.181, K=Math.sqrt(3)/2;
  let map=null, layer=null, realms=[], owner=null, anchor=null, player="guest", point=null, watch=null, active=null;
  let art={}, frames={}, activeFrameLayers=[], frameIndex=0, frameTicker=null, graphicsReady=false, initialized=false, spriteFrameCount=3;
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const ll=(x,y)=>({lat:Math.asin(y*K/R)*180/Math.PI,lng:x/(R*K)*180/Math.PI});
  function offset(p,east,north){
    return {lat:p.lat+north/111320,lng:p.lng+east/(111320*Math.cos(p.lat*Math.PI/180))};
  }
  function bounds(p,area){
    const h=Math.sqrt(area)/2;
    const sw=offset(p,-h,-h),ne=offset(p,h,h);
    return [[sw.lat,sw.lng],[ne.lat,ne.lng]];
  }
  function meters(a,b){
    const k=Math.PI/180,dLat=(b.lat-a.lat)*k,dLon=(b.lng-a.lng)*k;
    const h=Math.sin(dLat/2)**2+Math.cos(a.lat*k)*Math.cos(b.lat*k)*Math.sin(dLon/2)**2;
    return 12742000*Math.asin(Math.min(1,Math.sqrt(h)));
  }
  function key(c){return "kz_creature_preview_v2:"+player+":"+c.id}
  function save(c,p){try{localStorage.setItem(key(c),JSON.stringify(p))}catch(_){}}
  function progress(c){
    let p={hp:c.max,used:0,until:0};
    try{p=Object.assign(p,JSON.parse(localStorage.getItem(key(c))||"{}"))}catch(_){}
    if(p.until&&Date.now()>=p.until){
      p.until=0;p.used=0;
      if(p.hp<=0)p.hp=c.max;
      save(c,p);
    }
    return p;
  }
  /* Iscrtavanje rasterskih kadrova iz kompaktno zapakiranog WebP atlasa.
     Samo pri pokretanju izreži sva 3 kadra za svako biće; animacija mijenja
     gotove slike bez 3D renderiranja ili izvođenja SVG-a. */
  function unpackArt(){
    const hasNine=Boolean(window.KZ_SPRITE_ATLAS_9);
    const source=window.KZ_SPRITE_ATLAS_9||window.KZ_SPRITE_ATLAS;
    if(!source){console.warn("Kraljevstvo: WebP atlas nije učitan.");return;}
    spriteFrameCount=hasNine?9:3;
    const image=new Image();
    image.onload=()=>{
      const cw=Math.floor(image.naturalWidth/(hasNine?10:15));
      const ch=Math.floor(image.naturalHeight/(hasNine?9:2));
      if(cw<1||ch<1)return;
      const indices={"koracgrad":0,"sir-zeljeznik":1,"mrakotrag":2,
        "rogozmaj":3,"starokorijen":4,"neboperka":5,
        "dvosova-nocnica":6,"galoplam":7,"rumenpuf":8,"morskokril":9};
      for(const c of CREATURES){
        const i=indices[c.id],col=i%5,row=Math.floor(i/5);
        frames[c.id]=[];
        for(let k=0;k<spriteFrameCount;k++){
          const cv=document.createElement("canvas");
          cv.width=cw;cv.height=ch;
          const context=cv.getContext("2d");
          const sx=hasNine?i*cw:(col*3+k)*cw;
          const sy=hasNine?k*ch:row*ch;
          context.drawImage(image,sx,sy,cw,ch,0,0,cw,ch);
          frames[c.id].push(cv.toDataURL("image/png"));
        }
        art[c.id]=frames[c.id][0];
      }
      graphicsReady=true;
      draw();
      if(!frameTicker && !window.matchMedia("(prefers-reduced-motion: reduce)").matches){
        frameTicker=window.setInterval(()=>{
          if(document.hidden||!activeFrameLayers.length)return;
          frameIndex=(frameIndex+1)%spriteFrameCount;
          for(const entry of activeFrameLayers){
            const node=entry.layer.getElement();
            if(node)node.src=frames[entry.id][frameIndex];
          }
        },hasNine?180:260);
      }
    };
    image.onerror=()=>console.warn("Kraljevstvo: WebP sprite atlas nije moguće prikazati.");
    image.src="data:image/webp;base64,"+source;
  }
  function mount(m){
    if(map||!window.L)return;
    map=m;
    // Most-forward Leaflet pane, above the grid, territories, labels and decorative sprites.
    const top=map.getPane("kzCreatureTopPane")||map.createPane("kzCreatureTopPane");
    top.style.zIndex="1450";
    top.style.pointerEvents="none"; // only the creatures themselves are clickable
    layer=L.layerGroup().addTo(map);
    map.on("zoomend",draw);
    panel();
    setAnchor();
  }
  function setAnchor(){
    if(!map)return;
    const mine=realms.find(r=>String(r.id)===String(owner)&&r.anchor_x!=null);
    const fallback=realms.find(r=>r.anchor_x!=null);
    const realm=mine||fallback;
    anchor=realm?ll(Number(realm.anchor_x),Number(realm.anchor_y)):null;
    draw();
  }
  function draw(){
    if(!map||!layer)return;
    layer.clearLayers();
    activeFrameLayers=[];
    if(!anchor||!graphicsReady||map.getZoom()<18)return;
    for(const c of CREATURES){
      c.pos=offset(anchor,c.dx,c.dy);
      const spriteLayer=L.imageOverlay(art[c.id],bounds(c.pos,c.area),{
        pane:"kzCreatureTopPane",interactive:true,alt:c.name,className:"kz-creature-image"
      }).on("click",e=>{L.DomEvent.stopPropagation(e);open(c)}).addTo(layer);
      activeFrameLayers.push({id:c.id,layer:spriteLayer});
      if(map.getZoom()>=19){
        const p=progress(c);
        const plate='<div class="kz-creature-name"><b>'+esc(c.name)+'</b><small>♥ '+p.hp+'/'+c.max+'</small></div>';
        L.marker([c.pos.lat,c.pos.lng],{pane:"kzCreatureTopPane",interactive:false,icon:L.divIcon({
          className:"kz-creature-label",html:plate,iconSize:[0,0],iconAnchor:[0,-5]
        })}).addTo(layer);
      }
      L.circleMarker([c.pos.lat,c.pos.lng],{radius:9,opacity:0,fillOpacity:0,weight:0,interactive:true})
        .on("click",e=>{L.DomEvent.stopPropagation(e);open(c)}).addTo(layer);
    }
  }
  function panel(){
    if($("kz-creature-dialog"))return;
    const el=document.createElement("div");
    el.id="kz-creature-dialog";el.hidden=true;
    el.innerHTML='<section class="kz-creature-card" role="dialog" aria-modal="true" aria-labelledby="kz-monster-title"><button type="button" id="kz-monster-close" aria-label="Zatvori">×</button><div id="kz-monster-body"></div></section>';
    document.body.append(el);
    $("kz-monster-close").onclick=close;
    el.addEventListener("click",e=>{if(e.target===el)close()});
    document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!el.hidden)close()});
  }
  function close(){$("kz-creature-dialog").hidden=true;active=null}
  function open(c){active=c;$("kz-creature-dialog").hidden=false;show(c)}
  function nextQ(c,p){return Q[(CREATURES.indexOf(c)*13+p.used*7)%Q.length]}
  function show(c){
    if(!active||active.id!==c.id)return;
    const p=progress(c), distance=point&&c.pos?Math.round(meters(point,c.pos)):null;
    const unlocked=distance!==null&&distance<=1000;
    const cd=Math.max(0,p.until-Date.now());
    const pct=Math.max(0,Math.round(100*p.hp/c.max));
    let out='<div class="kz-monster-head"><img src="'+art[c.id]+'" alt="'+esc(c.type)+'"><div>'+
      '<span class="kz-monster-sub">'+esc(c.type)+' · '+c.area+' m²</span><h2 id="kz-monster-title">'+esc(c.name)+'</h2>'+
      '<div class="kz-hp-bar"><span style="width:'+pct+'%"></span></div><strong>HP '+p.hp+' / '+c.max+'</strong></div></div>';
    out+='<p class="kz-desc">'+(unlocked?"✅ Borba je otključana.":distance===null?"📍 Odobri GPS lokaciju za otključavanje.":"🔒 Trenutna udaljenost: "+distance+" m. Priđi na 1 km ili manje.")+
      ' Preostalo pitanja: <b>'+Math.max(0,LIMIT-p.used)+'</b> / '+LIMIT+'.</p>';
    if(!unlocked)out+='<button type="button" class="kz-secondary" id="kz-request-gps">📍 Provjeri GPS blizinu</button>';
    else if(cd){
      const h=Math.floor(cd/3600000),min=String(Math.floor(cd%3600000/60000)).padStart(2,"0");
      out+='<p class="kz-cooldown">'+(p.hp<=0?"Pobijeđen! Povratak za ":"Potrošeno je 20 pitanja. Nova za ")+h+' h '+min+' min.</p>'+
        '<button class="kz-secondary" disabled>Novih 20 pitanja · 5 € (nije omogućeno)</button>';
    }else if(p.hp<=0)out+='<p>Stvorenje je poraženo.</p>';
    else{
      const q=nextQ(c,p);
      out+='<div class="kz-question"><span>PITANJE '+(p.used+1)+' / '+LIMIT+'</span><p>'+esc(q[0])+'</p>'+
        [0,1,2].map(j=>'<button class="kz-option" data-kz-choice="'+j+'">'+("ABC"[j])+') '+esc(q[j+1])+'</button>').join("")+
        '</div><p class="kz-help">Svaki točan odgovor oduzima 10 % početnog HP-a.</p>';
    }
    out+='<p class="kz-creature-demo-notice">🧪 Probna igra: napredak se čuva samo na ovom uređaju. Prava borba i plaćanja još nisu povezani s bazom.</p>';
    $("kz-monster-body").innerHTML=out;
    $("kz-request-gps")?.addEventListener("click",requestGPS);
    document.querySelectorAll("[data-kz-choice]").forEach(btn=>{
      btn.addEventListener("click",()=>answer(c,Number(btn.dataset.kzChoice)));
    });
  }
  function answer(c,choice){
    if(!active||active.id!==c.id||!point||meters(point,c.pos)>1000)return;
    const p=progress(c);
    if(p.until||p.used>=LIMIT||p.hp<=0)return;
    const q=nextQ(c,p);
    const correct=q[4]===choice;
    p.used++;
    if(correct)p.hp=Math.max(0,p.hp-c.max/10);
    if(p.used>=LIMIT||p.hp<=0)p.until=Date.now()+COOL;
    save(c,p);
    draw();show(c);
    const node=document.createElement("p");
    node.className="kz-result";
    node.textContent=correct?"✅ Točno! -10 % HP.":"❌ Netočno! Točan odgovor: "+q[q[4]+1];
    $("kz-monster-body").querySelector(".kz-question")?.before(node);
    if(!$("kz-monster-body").querySelector(".kz-question"))$("kz-monster-body").append(node);
  }
  function requestGPS(){
    if(!navigator.geolocation){alert("Ovaj uređaj nema GPS mogućnost.");return}
    if(!window.isSecureContext){alert("GPS zahtijeva HTTPS vezu.");return}
    if(watch!==null){if(active)show(active);return}
    watch=navigator.geolocation.watchPosition(p=>{
      if(p.coords.accuracy>1000)return;
      point={lat:p.coords.latitude,lng:p.coords.longitude};
      if(active)show(active);
    },e=>{watch=null;alert("GPS nije dostupan: "+e.message)},
    {enableHighAccuracy:true,maximumAge:15000,timeout:18000});
  }
  window.addEventListener("kz:map-ready",e=>mount(e.detail.map));
  window.addEventListener("kz:state",e=>{
    const s=e.detail?.state;
    if(s?.player?.id)player=String(s.player.id);
    owner=s?.kingdom?.id||null;
    setAnchor();
  });
  window.addEventListener("kz:kingdoms",e=>{realms=e.detail?.kingdoms||[];setAnchor()});
  unpackArt();
  window.KZCreaturesPreview={count:CREATURES.length,refresh:draw};
})();
