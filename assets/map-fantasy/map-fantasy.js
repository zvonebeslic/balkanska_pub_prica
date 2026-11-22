/* KvizToGo – deset dekorativnih fantastičnih likova na Leaflet karti.
   Lagane SVG karikature; NE zamjenjuju kviz-markere i ne predstavljaju stvarne lokacije. */
(function () {
  "use strict";
  const GRADIENTS = [
    ['metal','#f9f9ea','#8798ae','#59687e'],
    ['gold','#fff2a9','#e4ac45','#9d5b25'],
    ['bronze','#fbe3a2','#c28a49','#78512d'],
    ['stone','#e6e7e1','#a4a9b1','#737887'],
    ['teal','#d5fff3','#4cb2b4','#23738b'],
    ['purple','#e9c8ff','#874faf','#4c2b76'],
    ['red','#ffb391','#db5547','#842b40'],
    ['fire','#ffeaa2','#ec8453','#be4344'],
    ['wood','#e6b777','#9b5a36','#583025'],
    ['leaves','#c9ed73','#79a84b','#3d6634'],
    ['glow','#fffcea','#49d6f4','#007aaf']
  ];
  function illustration(spec) {
    const defs = GRADIENTS.map(function (g) {
      const id = 'ktg-' + spec.id + '-' + g[0];
      return '<linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0" stop-color="' + g[1] + '"/>' +
        '<stop offset=".47" stop-color="' + g[2] + '"/>' +
        '<stop offset="1" stop-color="' + g[3] + '"/></linearGradient>';
    }).join('');
    const art = spec.art.replace(/url\(#([a-z]+)\)/g, function (_, name) {
      return 'url(#ktg-' + spec.id + '-' + name + ')';
    });
    return '<svg viewBox="-4 -8 140 143" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">' +
      '<defs>' + defs + '</defs>' +
      '<ellipse cx="65" cy="121" rx="43" ry="7" fill="rgba(6,15,26,.22)"/>' + art + '</svg>';
  }

  const characters = [{"id":"dvorac","name":"Hodajući dvorac","lat":44.3,"lng":17.85,"motion":"stomp","art":"\n<g fill=\"url(#bronze)\" stroke=\"#66431f\" stroke-width=\"2\" stroke-linejoin=\"round\">\n<path d=\"M30 80 18 97 15 110 31 111 39 89ZM90 80 106 97 111 110 94 111 84 89Z\"/>\n<ellipse cx=\"22\" cy=\"111\" rx=\"16\" ry=\"5\"/><ellipse cx=\"102\" cy=\"111\" rx=\"15\" ry=\"5\"/>\n<circle cx=\"37\" cy=\"88\" r=\"8\"/><circle cx=\"91\" cy=\"88\" r=\"8\"/>\n</g>\n<path d=\"M15 58 64 40 112 58 105 92 64 108 22 92Z\" fill=\"url(#stone)\" stroke=\"#4a4657\" stroke-width=\"3\"/>\n<path d=\"M15 58 64 74 64 108 22 92Z\" fill=\"#72798a\" opacity=\".75\"/><path d=\"M64 74 112 58 105 92 64 108Z\" fill=\"#525b6c\" opacity=\".82\"/>\n<path d=\"M9 58 63 37 117 58 64 79Z\" fill=\"#b8bac3\" stroke=\"#51576a\" stroke-width=\"3\"/>\n<g fill=\"#ded9ce\" stroke=\"#646172\" stroke-width=\"2\"><path d=\"M23 39V65L40 69V38Z\"/><path d=\"M48 20V64L70 71V20Z\"/><path d=\"M79 38V71L101 65V39Z\"/></g>\n<path d=\"M17 39 31 19 44 39Z\" fill=\"url(#red)\" stroke=\"#732e31\" stroke-width=\"2\"/><path d=\"M44 20 59 2 74 20Z\" fill=\"url(#red)\" stroke=\"#732e31\" stroke-width=\"2\"/><path d=\"M74 38 90 15 105 39Z\" fill=\"url(#red)\" stroke=\"#732e31\" stroke-width=\"2\"/>\n<g fill=\"#383745\"><rect x=\"27\" y=\"44\" width=\"6\" height=\"12\" rx=\"3\"/><rect x=\"55\" y=\"29\" width=\"8\" height=\"13\" rx=\"3\"/><rect x=\"89\" y=\"46\" width=\"6\" height=\"12\" rx=\"3\"/></g>\n<path d=\"M57 77q8-11 16 0v25l-16 4Z\" fill=\"#332c37\" stroke=\"#bd8b4e\" stroke-width=\"3\"/><path d=\"M13 67 2 68 2 76 26 74 33 70\" fill=\"url(#metal)\" stroke=\"#55576c\" stroke-width=\"3\"/><circle cx=\"4\" cy=\"72\" r=\"3\" fill=\"#242839\"/>\n<path d=\"M96 69 121 58 126 65 107 81Z\" fill=\"url(#metal)\" stroke=\"#4f5262\" stroke-width=\"3\"/><circle cx=\"122\" cy=\"61\" r=\"4\" fill=\"#333847\"/>\n<path d=\"M48 46H61V60H48Z\" fill=\"#ad3d3f\"/><path d=\"M62 43H75V58H62Z\" fill=\"#ad3d3f\"/>\n<g fill=\"#eac976\"><circle cx=\"36\" cy=\"88\" r=\"3\"/><circle cx=\"91\" cy=\"88\" r=\"3\"/><circle cx=\"65\" cy=\"86\" r=\"3\"/></g>"},{"id":"robot","name":"Parni robot","lat":45.45,"lng":19.25,"motion":"bounce","art":"\n<g fill=\"url(#bronze)\" stroke=\"#6d4f31\" stroke-width=\"3\">\n<path d=\"M40 83 33 108 54 111 58 90Z\"/><path d=\"M76 88 78 112 100 108 91 82Z\"/><ellipse cx=\"44\" cy=\"111\" rx=\"16\" ry=\"6\"/><ellipse cx=\"90\" cy=\"112\" rx=\"16\" ry=\"6\"/></g>\n<path d=\"M34 37 91 36 106 88 22 90Z\" fill=\"url(#teal)\" stroke=\"#77502f\" stroke-width=\"4\"/>\n<g fill=\"url(#bronze)\" stroke=\"#74532e\" stroke-width=\"3\"><circle cx=\"22\" cy=\"59\" r=\"13\"/><circle cx=\"106\" cy=\"59\" r=\"13\"/><path d=\"m15 68-11 17 17 11 12-17Z\"/><path d=\"m111 70 12 18-18 9-11-16Z\"/><ellipse cx=\"14\" cy=\"96\" rx=\"13\" ry=\"7\"/><ellipse cx=\"114\" cy=\"98\" rx=\"13\" ry=\"7\"/></g>\n<circle cx=\"64\" cy=\"63\" r=\"17\" fill=\"url(#gold)\" stroke=\"#835624\" stroke-width=\"3\"/><circle cx=\"64\" cy=\"63\" r=\"11\" fill=\"url(#glow)\" class=\"ktg-part-glow\"/>\n<path d=\"M35 39q-8-36 29-38 40 1 32 39Z\" fill=\"url(#teal)\" stroke=\"#79552e\" stroke-width=\"4\"/>\n<circle cx=\"48\" cy=\"25\" r=\"13\" fill=\"url(#gold)\" stroke=\"#77502c\" stroke-width=\"3\"/><circle cx=\"81\" cy=\"25\" r=\"13\" fill=\"url(#gold)\" stroke=\"#77502c\" stroke-width=\"3\"/>\n<circle cx=\"48\" cy=\"25\" r=\"8\" fill=\"url(#glow)\" class=\"ktg-part-glow\"/><circle cx=\"81\" cy=\"25\" r=\"8\" fill=\"url(#glow)\" class=\"ktg-part-glow\"/>\n<path d=\"M55 44h20l-3 7H58Z\" fill=\"#654123\"/><path d=\"M64 3V-1\" stroke=\"#d9aa54\" stroke-width=\"5\"/><circle cx=\"64\" cy=\"2\" r=\"6\" fill=\"#ffcf5a\"/>\n<g fill=\"#e9ba61\"><circle cx=\"34\" cy=\"54\" r=\"2.5\"/><circle cx=\"93\" cy=\"54\" r=\"2.5\"/><circle cx=\"34\" cy=\"81\" r=\"2.5\"/><circle cx=\"95\" cy=\"81\" r=\"2.5\"/></g>"},{"id":"carobnjak","name":"Čarobnjak","lat":43.98,"lng":21.3,"motion":"float","art":"\n<path d=\"M31 110Q15 67 49 48L83 50q29 34 19 60Z\" fill=\"url(#purple)\" stroke=\"#4c327e\" stroke-width=\"4\"/>\n<path d=\"M32 100q31 11 61 0\" fill=\"none\" stroke=\"#e2ae51\" stroke-width=\"5\"/><path d=\"M52 54 46 100M77 56 85 100\" stroke=\"#ad8cdc\" stroke-width=\"3\"/>\n<ellipse cx=\"64\" cy=\"48\" rx=\"24\" ry=\"22\" fill=\"#f2bd86\" stroke=\"#9d674d\" stroke-width=\"2\"/>\n<path d=\"M44 49q19 2 39 0l-2 29-16 20-19-20Z\" fill=\"#f9f2e4\" stroke=\"#b7b2ba\" stroke-width=\"2\"/>\n<path d=\"M49 53q-15 14-5 23l15-2-5-18ZM80 52q15 15 4 24l-14-1 4-20Z\" fill=\"#fff6ee\"/>\n<path d=\"M55 77q7 7 15 0\" fill=\"none\" stroke=\"#c4b9b4\" stroke-width=\"2\"/><circle cx=\"54\" cy=\"45\" r=\"3\" fill=\"#38577f\"/><circle cx=\"76\" cy=\"45\" r=\"3\" fill=\"#38577f\"/>\n<path d=\"M19 37Q34 6 68 2q11 14 16 33L93 42q-32 15-76 1Z\" fill=\"url(#purple)\" stroke=\"#6d4390\" stroke-width=\"4\"/>\n<path d=\"M48 8q22 7 26 31\" fill=\"none\" stroke=\"#c6a5ee\" stroke-width=\"4\"/><path d=\"M17 37q36 12 78 1l-4 10q-36 10-74-2Z\" fill=\"#6a3995\" stroke=\"#e3b25d\" stroke-width=\"3\"/>\n<path d=\"m72 18 4-8 4 8 9 2-8 5v9l-7-6-8 3 4-9-6-6Z\" fill=\"#ffdb79\"/>\n<g class=\"ktg-part-sway\"><path d=\"M105 110V35\" stroke=\"#855123\" stroke-width=\"6\"/><circle cx=\"105\" cy=\"26\" r=\"17\" fill=\"none\" stroke=\"#dfba65\" stroke-width=\"5\"/><circle cx=\"105\" cy=\"26\" r=\"11\" fill=\"url(#glow)\" class=\"ktg-part-glow\"/><path d=\"m105 9 4-8 4 8 8 3-8 3-4 8-4-8-8-3Z\" fill=\"#fff2c0\"/></g>"},{"id":"zmaj","name":"Mali zmaj","lat":46.45,"lng":15.55,"motion":"bounce","art":"\n<path d=\"M43 75Q4 88 15 111q13 8 28-8\" fill=\"none\" stroke=\"#9c3436\" stroke-width=\"17\" stroke-linecap=\"round\"/>\n<path class=\"ktg-part-wing\" d=\"M44 57Q10 17 7 57L28 49 31 77Z\" fill=\"url(#red)\" stroke=\"#8f3935\" stroke-width=\"4\"/>\n<path class=\"ktg-part-wing\" d=\"M74 56Q106 11 116 59l-23-9-12 27Z\" fill=\"url(#fire)\" stroke=\"#91393b\" stroke-width=\"4\"/>\n<path d=\"M40 76Q41 40 72 43q28 2 26 43l-14 24H48Z\" fill=\"url(#red)\" stroke=\"#8d3435\" stroke-width=\"4\"/>\n<path d=\"M65 60q-10 18 1 42l22-2q14-25-6-41Z\" fill=\"#ffc78d\"/>\n<path d=\"M65 31Q60 4 90 9q21 5 19 33l11 12q-12 18-39 12Q59 62 65 31Z\" fill=\"url(#red)\" stroke=\"#8e3535\" stroke-width=\"4\"/>\n<path d=\"m74 13-8-12-8 20M97 11l6-12 8 22\" fill=\"#e3bd76\" stroke=\"#98683e\" stroke-width=\"3\"/>\n<ellipse cx=\"93\" cy=\"37\" rx=\"12\" ry=\"13\" fill=\"#ffe19b\"/><ellipse cx=\"97\" cy=\"36\" rx=\"5\" ry=\"9\" fill=\"#3b2232\"/><circle cx=\"98\" cy=\"32\" r=\"2\" fill=\"white\"/>\n<path d=\"m108 55 7 1 5 8-16 3Z\" fill=\"#e9b26f\"/><path d=\"M85 54q12 14 25 0\" fill=\"none\" stroke=\"#733139\" stroke-width=\"3\"/>\n<path d=\"m45 91-19 10 3 12 21-3M89 91l17 11-4 12-21-5\" fill=\"url(#red)\" stroke=\"#8c3c3d\" stroke-width=\"4\"/>\n<g fill=\"#edcc87\"><path d=\"m33 109-3 9 11-5M44 109l-1 9 10-8M96 109l4 10-12-6\"/></g>"},{"id":"div","name":"Šumski div","lat":42.67,"lng":19.35,"motion":"sway","art":"\n<g fill=\"url(#stone)\" stroke=\"#535b54\" stroke-width=\"4\" stroke-linejoin=\"round\"><path d=\"M43 77 28 109l21 10 15-29Z\"/><path d=\"M83 76 70 96l20 23 18-10Z\"/><path d=\"M43 44 18 61 8 87 23 98 48 67Z\"/><path d=\"M86 43 114 55 125 88 106 99 81 68Z\"/></g>\n<path d=\"M39 34q24-21 48 0l13 51q-34 24-71 0Z\" fill=\"url(#stone)\" stroke=\"#526058\" stroke-width=\"4\"/>\n<path d=\"M39 56 22 43l9-26 23-8 22 14 24-12 15 24-11 28-18 1-15-16-17 15Z\" fill=\"url(#leaves)\" stroke=\"#486a39\" stroke-width=\"4\"/>\n<g class=\"ktg-part-sway\" fill=\"#7baf49\" stroke=\"#456e35\" stroke-width=\"2\"><circle cx=\"28\" cy=\"22\" r=\"17\"/><circle cx=\"52\" cy=\"15\" r=\"20\"/><circle cx=\"79\" cy=\"19\" r=\"22\"/><circle cx=\"105\" cy=\"30\" r=\"17\"/></g>\n<path d=\"M46 54q18-13 38 0l-4 25H50Z\" fill=\"#5c6a56\" stroke=\"#384f44\" stroke-width=\"3\"/>\n<circle cx=\"54\" cy=\"64\" r=\"6\" fill=\"url(#gold)\"/><circle cx=\"78\" cy=\"64\" r=\"6\" fill=\"url(#gold)\"/>\n<path d=\"m55 92 12-17 10 17-12 11Z\" fill=\"none\" stroke=\"#ddb562\" stroke-width=\"5\"/><circle cx=\"65\" cy=\"88\" r=\"4\" fill=\"#fde68a\"/>\n<g fill=\"#9ecd61\"><circle cx=\"18\" cy=\"46\" r=\"6\"/><circle cx=\"112\" cy=\"48\" r=\"6\"/><circle cx=\"94\" cy=\"11\" r=\"5\"/></g>"},{"id":"brod","name":"Leteći brod","lat":41.95,"lng":22.45,"motion":"float","art":"\n<path d=\"M15 46Q43 9 99 27q22 7 16 29Q88 77 31 71Z\" fill=\"url(#teal)\" stroke=\"#79542d\" stroke-width=\"4\"/>\n<path d=\"M42 50q16-15 40-12\" fill=\"none\" stroke=\"#a2e0d6\" stroke-width=\"5\"/><ellipse cx=\"96\" cy=\"45\" rx=\"11\" ry=\"10\" fill=\"url(#gold)\" stroke=\"#7e5733\" stroke-width=\"3\"/><ellipse cx=\"99\" cy=\"44\" rx=\"5\" ry=\"5\" fill=\"#3a6377\"/><path d=\"M10 52Q0 40 3 25l24 15Z\" fill=\"url(#fire)\" stroke=\"#8d6339\" stroke-width=\"3\"/>\n<path d=\"M19 60Q48 78 91 69L86 91 33 90Z\" fill=\"url(#wood)\" stroke=\"#714b2f\" stroke-width=\"4\"/>\n<path d=\"M31 88 85 88l-7 22-36 0Z\" fill=\"url(#bronze)\" stroke=\"#765030\" stroke-width=\"3\"/>\n<path d=\"M41 71V108M68 74V109\" stroke=\"#c4a16a\" stroke-width=\"3\"/><path d=\"M26 84q24 5 61 0\" fill=\"none\" stroke=\"#e7ca79\" stroke-width=\"3\"/>\n<g class=\"ktg-part-spin\"><circle cx=\"12\" cy=\"49\" r=\"6\" fill=\"#deb665\" stroke=\"#67412b\" stroke-width=\"3\"/><path d=\"M12 49Q-1 27 10 14q8 19 2 35M12 49Q-2 62 8 82q12-15 4-33M12 49q23-7 28 5-15 6-28-5\" fill=\"#d7b86f\" stroke=\"#8f7046\" stroke-width=\"2\"/></g>\n<path d=\"M64 20V5L90 19 87 39\" fill=\"none\" stroke=\"#82633b\" stroke-width=\"3\"/><path d=\"M65 6 88 18 86 35 67 25Z\" fill=\"#f4d6a2\" stroke=\"#987044\" stroke-width=\"2\"/>\n<g fill=\"#ffe18b\"><circle cx=\"47\" cy=\"96\" r=\"3\"/><circle cx=\"63\" cy=\"97\" r=\"3\"/><circle cx=\"77\" cy=\"95\" r=\"3\"/></g>"},{"id":"vitez","name":"Vitez","lat":45.2,"lng":16.3,"motion":"stomp","art":"\n<path d=\"M46 78 34 108l24 8 9-30ZM71 85l8 31 25-8-17-31Z\" fill=\"url(#metal)\" stroke=\"#6a7788\" stroke-width=\"4\"/>\n<path d=\"M43 53 86 52 95 92 37 92Z\" fill=\"url(#metal)\" stroke=\"#636c79\" stroke-width=\"4\"/>\n<path d=\"m37 58-21 22 17 12 21-22M91 58l21 22-17 12-21-22\" fill=\"url(#metal)\" stroke=\"#717d8e\" stroke-width=\"4\"/>\n<path d=\"M41 20q-13 21-4 36l19 13 35-11 2-32q-19-25-52-6Z\" fill=\"url(#metal)\" stroke=\"#636d7b\" stroke-width=\"4\"/>\n<path d=\"M39 36h52l-5 13H43Z\" fill=\"#48536b\"/><path d=\"M57 42h20\" stroke=\"#d6e2e3\" stroke-width=\"3\"/>\n<path d=\"M53 25Q45-1 75-3q32 19 12 28Z\" fill=\"url(#red)\" stroke=\"#912e40\" stroke-width=\"3\" class=\"ktg-part-sway\"/>\n<path d=\"M27 65Q2 54 6 87l20 24 22-18-3-27Z\" fill=\"url(#red)\" stroke=\"#e5b962\" stroke-width=\"5\"/>\n<path d=\"m25 70 4 25M16 80h24\" stroke=\"#f5d683\" stroke-width=\"5\"/>\n<path d=\"M106 26v76\" stroke=\"#9fb8c3\" stroke-width=\"5\"/><path d=\"M106 12 96 31h20Z\" fill=\"#c8e9ed\" stroke=\"#667c85\" stroke-width=\"3\"/><path d=\"M94 54h24\" stroke=\"#d6ad5a\" stroke-width=\"5\"/>\n<g fill=\"#ffefb8\"><circle cx=\"55\" cy=\"82\" r=\"3\"/><circle cx=\"81\" cy=\"82\" r=\"3\"/></g>"},{"id":"gusar","name":"Gusar","lat":42.62,"lng":17.45,"motion":"sway","art":"\n<path d=\"M41 63q-17 21-18 51h72q-2-36-20-52Z\" fill=\"#294f75\" stroke=\"#15283e\" stroke-width=\"4\"/>\n<path d=\"M52 68 51 112M80 68l-5 44\" stroke=\"#e6b269\" stroke-width=\"4\"/><path d=\"M49 90h38\" stroke=\"#ae3e36\" stroke-width=\"10\"/>\n<ellipse cx=\"62\" cy=\"52\" rx=\"24\" ry=\"24\" fill=\"#edb880\" stroke=\"#8f603a\" stroke-width=\"3\"/>\n<path d=\"M42 60q10 24 27 29 21-10 20-29l-20 6-9-5Z\" fill=\"#5c3832\"/>\n<path d=\"M51 53h15\" stroke=\"#2d2423\" stroke-width=\"5\"/><path d=\"M49 52q6-8 13 0\" stroke=\"#e0be91\" stroke-width=\"4\"/>\n<circle cx=\"76\" cy=\"53\" r=\"3\" fill=\"#3b2827\"/><path d=\"M61 68q8 5 15 0\" fill=\"none\" stroke=\"#f3e2c8\" stroke-width=\"3\"/>\n<path d=\"M20 38q30-46 78-4l-11 14H33Z\" fill=\"#262b39\" stroke=\"#d4ad65\" stroke-width=\"4\"/>\n<path d=\"M27 31Q64-6 94 29l8 11Q58 55 18 40Z\" fill=\"#252632\" stroke=\"#d4ad65\" stroke-width=\"4\"/>\n<path d=\"m56 21 12 10-12 0 12-10\" fill=\"none\" stroke=\"#f2eed6\" stroke-width=\"3\"/><circle cx=\"62\" cy=\"22\" r=\"4\" fill=\"#e9e5d5\"/>\n<g class=\"ktg-part-sway\"><path d=\"M87 70 121 27\" stroke=\"#98612c\" stroke-width=\"6\"/><path d=\"m111 23 12-14 6 8-11 15Z\" fill=\"url(#bronze)\" stroke=\"#71522c\" stroke-width=\"2\"/><circle cx=\"122\" cy=\"14\" r=\"3\" fill=\"#66bee6\"/></g>\n<path d=\"M38 99 27 117 49 119l9-15M76 104l13 15 22-4-18-21\" fill=\"url(#wood)\" stroke=\"#624030\" stroke-width=\"3\"/>"},{"id":"skrinja","name":"Živa škrinja","lat":43.48,"lng":23.62,"motion":"bounce","art":"\n<path d=\"M28 86 20 112h23l17-20M85 92l9 21h22L99 82\" fill=\"url(#wood)\" stroke=\"#6e4829\" stroke-width=\"4\"/>\n<path d=\"M19 56 62 38 114 56 105 99 56 112 17 99Z\" fill=\"url(#wood)\" stroke=\"#6d4627\" stroke-width=\"4\"/>\n<path d=\"M20 61 62 79 112 58M62 79l-5 29\" stroke=\"#c89b51\" stroke-width=\"8\" fill=\"none\"/>\n<path d=\"M13 56q1-42 49-46 51-2 58 44l-55 27Z\" fill=\"url(#wood)\" stroke=\"#d1a357\" stroke-width=\"6\"/>\n<path d=\"M23 47q35-15 84-1\" fill=\"none\" stroke=\"#f6d080\" stroke-width=\"6\"/><path d=\"M62 11v69\" stroke=\"#bc823c\" stroke-width=\"5\"/>\n<path d=\"M18 61 62 77 112 60 107 84 62 98 19 85Z\" fill=\"#3d1c2a\" stroke=\"#f0bf71\" stroke-width=\"4\"/>\n<g fill=\"#fff2cf\"><path d=\"m27 68 12 6-9 9ZM46 75l10 4-7 10ZM72 77l11-8-2 15ZM94 68l11-5-5 16Z\"/></g>\n<path class=\"ktg-part-tongue\" d=\"M70 84q30-10 24 17-5 22-19 10\" fill=\"#fc7a88\" stroke=\"#ad3a59\" stroke-width=\"3\"/>\n<path d=\"M45 54h40l-2 14H48Z\" fill=\"#b67a37\" stroke=\"#6e441d\" stroke-width=\"3\"/><path d=\"M58 56q2-13 13-4l-2 9-8 4Z\" fill=\"#ffdc7f\"/>\n<g fill=\"#edbc69\"><circle cx=\"27\" cy=\"48\" r=\"3\"/><circle cx=\"103\" cy=\"48\" r=\"3\"/><circle cx=\"25\" cy=\"95\" r=\"3\"/><circle cx=\"101\" cy=\"97\" r=\"3\"/></g>"},{"id":"pauk","name":"Kristalni pauk","lat":44.6,"lng":24.05,"motion":"stomp","art":"\n<g fill=\"none\" stroke=\"#b3874b\" stroke-width=\"8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"ktg-part-step\">\n<path d=\"M43 55 21 42 5 61M42 66 18 69 3 88M45 76 23 93 14 117M51 48 36 24 22 14\"/>\n<path d=\"M86 55 108 42 125 60M87 66 111 69 125 88M85 76 106 93 114 116M77 47 93 24 108 14\"/>\n</g>\n<g fill=\"none\" stroke=\"#5b6279\" stroke-width=\"3\"><path d=\"m21 42-16 19M18 69 3 88M23 93 14 117M108 42l17 18M111 69l14 19M106 93l8 23\"/></g>\n<path d=\"M35 58Q28 30 64 23q39 2 35 36l-12 36-46-1Z\" fill=\"url(#bronze)\" stroke=\"#76532f\" stroke-width=\"5\"/>\n<path d=\"m64 5 24 29-8 30H47L39 35Z\" fill=\"url(#glow)\" stroke=\"#98e9fd\" stroke-width=\"4\" class=\"ktg-part-glow\"/>\n<path d=\"M64 6 63 60M42 34l21 26 25-27\" stroke=\"#e2fcff\" stroke-width=\"3\" opacity=\".75\"/>\n<path d=\"M34 62q29-20 62 0l-7 27H40Z\" fill=\"url(#teal)\" stroke=\"#8e622e\" stroke-width=\"5\"/>\n<circle cx=\"51\" cy=\"72\" r=\"10\" fill=\"url(#gold)\" stroke=\"#74532f\" stroke-width=\"3\"/><circle cx=\"79\" cy=\"72\" r=\"10\" fill=\"url(#gold)\" stroke=\"#74532f\" stroke-width=\"3\"/><circle cx=\"51\" cy=\"72\" r=\"6\" fill=\"url(#glow)\" class=\"ktg-part-glow\"/><circle cx=\"79\" cy=\"72\" r=\"6\" fill=\"url(#glow)\" class=\"ktg-part-glow\"/>\n<path d=\"M56 89 65 100 74 89Z\" fill=\"#616a80\"/><g fill=\"#e9b769\"><circle cx=\"45\" cy=\"49\" r=\"3\"/><circle cx=\"87\" cy=\"49\" r=\"3\"/></g>"}];

  function initialize(map) {
    if (!map || !window.L || map.getPane('ktgFantasyPane')) return;
    const pane = map.createPane('ktgFantasyPane');
    pane.style.zIndex = '410'; // ispod stvarnih kviz markera (Leaflet markerPane: 600)
    pane.style.pointerEvents = 'none';

    const layer = L.layerGroup().addTo(map);
    const mobile = window.matchMedia('(max-width: 640px)').matches;
    const size = mobile ? 66 : 88;

    characters.forEach(function (spec) {
      const markup = '<div class="ktg-fantasy-character ktg-fantasy--' + spec.motion + '">' +
        illustration(spec) + '</div>';
      const icon = L.divIcon({
        className: 'ktg-fantasy-marker',
        html: markup,
        iconSize: [size, size],
        iconAnchor: [size / 2, size * .82]
      });
      L.marker([spec.lat, spec.lng], {
        pane: 'ktgFantasyPane',
        icon: icon,
        interactive: false,
        keyboard: false,
        bubblingMouseEvents: false,
        alt: spec.name
      }).addTo(layer);
    });

    const container = map.getContainer();
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'ktg-fantasy-toggle';
    toggle.setAttribute('aria-label', 'Prikaži ili sakrij ukrasne likove na karti');
    toggle.textContent = '✦ Likovi';
    container.appendChild(toggle);

    let enabled = true;
    try {
      enabled = window.localStorage.getItem('ktg_fantasy_characters') !== 'off';
    } catch (_) { /* privatni način rada može blokirati spremanje */ }

    function refresh() {
      const zoomVisible = map.getZoom() <= 8;
      const visible = enabled && zoomVisible;
      container.classList.toggle('ktg-fantasy-hidden', !visible);
      toggle.setAttribute('aria-pressed', String(enabled));
      toggle.title = enabled ? 'Sakrij likove na karti' : 'Prikaži likove na karti';
    }
    toggle.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      enabled = !enabled;
      try { window.localStorage.setItem('ktg_fantasy_characters', enabled ? 'on' : 'off'); }
      catch (_) { /* postavka ostaje samo za trenutnu stranicu */ }
      refresh();
    });
    map.on('zoomend', refresh);
    refresh();
  }
  window.KvizToGoFantasy = { init: initialize };
})();