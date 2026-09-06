(() => {
  const SUPABASE_URL = 'https://hssfjguysejbosvholqu.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_1wlZVov1csReXuZEgcuInA_7F7_gzIy';
  const client = window.supabase?.createClient?.(SUPABASE_URL, SUPABASE_KEY);
  if (!client) { console.warn('Scroll statistika: Supabase nije učitan.'); return; }

  let playId = null;
  let sessionId = null;
  let userId = null;
  let activeTopic = null;
  let activeSeconds = 0;
  let viewed = 0;
  let scrolled = 0;
  let correct = 0;
  let wrong = 0;
  let learnMore = 0;
  let shares = 0;
  let lastTick = performance.now();
  let running = false;
  const cardState = new WeakMap();

  function visitorId() {
    try {
      const saved = JSON.parse(localStorage.getItem('kviztogo_guest_identity_v1') || 'null');
      if (saved?.id) return String(saved.id);
    } catch (_) {}
    let id = localStorage.getItem('kviztogo_scroll_visitor_v1');
    if (!id) {
      id = 'scroll-' + crypto.randomUUID();
      try { localStorage.setItem('kviztogo_scroll_visitor_v1', id); } catch (_) {}
    }
    return id;
  }

  function isActive() { return document.visibilityState === 'visible' && document.hasFocus(); }
  function tick() { const now = performance.now(); if (running && isActive()) activeSeconds += Math.max(0, (now - lastTick) / 1000); lastTick = now; }

  async function flush() {
    tick(); if (!playId) return;
    try {
      await client.from('quiz_plays').update({duration_seconds:Math.floor(activeSeconds),correct_answers:correct,wrong_answers:wrong,viewed_questions:viewed,scrolled_questions:scrolled,learn_more_clicks:learnMore,share_clicks:shares}).eq('id', playId);
    } catch (e) { console.warn('Scroll statistika update:', e); }
  }

  async function finish(completed = false) {
    tick(); if (!playId) return; const id = playId; playId = null;
    try {
      await client.from('quiz_plays').update({finished_at:new Date().toISOString(),completed,duration_seconds:Math.floor(activeSeconds),correct_answers:correct,wrong_answers:wrong,viewed_questions:viewed,scrolled_questions:scrolled,learn_more_clicks:learnMore,share_clicks:shares}).eq('id', id);
    } catch (e) { console.warn('Scroll statistika finish:', e); }
  }

  async function start(topic, sharedEntry = false) {
    await finish(false);
    activeTopic = topic;
    sessionId = 'scroll-' + crypto.randomUUID();
    activeSeconds = viewed = scrolled = correct = wrong = learnMore = shares = 0;
    lastTick = performance.now(); running = true;
    try {
      const { data: userData } = await client.auth.getUser();
      userId = userData?.user?.id || null;
      const { data, error } = await client.from('quiz_plays').insert({user_id:userId,session_id:sessionId,visitor_id:visitorId(),quiz_mode:'scroll',topic,started_at:new Date().toISOString(),duration_seconds:0,correct_answers:0,wrong_answers:0,completed:false,viewed_questions:0,scrolled_questions:0,learn_more_clicks:0,share_clicks:0,shared_question_entry:sharedEntry}).select('id').single();
      if (error) throw error; playId = data?.id || null;
    } catch (e) { console.warn('Scroll statistika start:', e); }
  }

  function normalizeAnswer(value) {
    return String(value ?? '').toLocaleLowerCase('hr').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9čćđšž ]/gi, '').replace(/\s+/g, ' ').trim();
  }

  function answerDistance(a, b) {
    a = normalizeAnswer(a); b = normalizeAnswer(b);
    const row = Array(b.length + 1).fill(0).map((_, i) => i);
    for (let i = 1; i <= a.length; i += 1) {
      let prev = row[0]; row[0] = i;
      for (let j = 1; j <= b.length; j += 1) {
        const temp = row[j];
        row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
        prev = temp;
      }
    }
    return row[b.length];
  }

  function allowedDistance(length) {
    return length <= 3 ? 0 : length <= 4 ? 1 : length <= 7 ? 2 : length <= 11 ? 3 : length <= 15 ? 4 : 4 + Math.floor((length - 15) / 5);
  }

  function findMatchedAnswer(input, answers) {
    const normalizedInput = normalizeAnswer(input);
    for (const answer of Array.isArray(answers) ? answers : []) {
      const normalizedAnswer = normalizeAnswer(answer);
      if (normalizedInput === normalizedAnswer || answerDistance(normalizedInput, normalizedAnswer) <= allowedDistance(normalizedAnswer.length)) return String(answer);
    }
    return null;
  }

  async function saveQuestion(card, type) {
    if (!playId) return;
    const state = cardState.get(card) || {};
    const text = card.querySelector('.qt')?.textContent?.trim() || '';
    const input = card.querySelector('input')?.value?.trim() || null;
    const result = card.querySelector('.result');
    const isCorrect = type === 'answered' ? !!result?.classList.contains('good') : null;
    const questionTopic = card.dataset.topic || activeTopic;
    const correctAnswer = card.dataset.correctAnswer || null;
    let acceptedAnswers = [];
    try { acceptedAnswers = JSON.parse(card.dataset.answers || '[]'); } catch (_) {}
    const matchedAnswer = type === 'answered' && isCorrect ? findMatchedAnswer(input, acceptedAnswers) : null;
    const lang = document.documentElement.lang === 'en' ? 'en' : 'hr';
    try {
      await client.from('quiz_answers').insert({quiz_play_id:playId,session_id:sessionId,user_id:userId,question_id:null,question_text:text,question_topic:questionTopic,question_type:'scroll',quiz_mode:'scroll',selected_theme:activeTopic,user_answer:type==='answered'?input:null,correct_answer:correctAnswer,matched_answer:matchedAnswer,is_correct:isCorrect,is_exact:false,was_skipped:false,was_scrolled:type==='scrolled',was_viewed:!!state.viewed,match_reason:type==='scrolled'?'scrolled':'scroll_answer',language:lang,answered_at:new Date().toISOString()});
    } catch (e) { console.warn('Scroll pitanje statistika:', e); }
  }

  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const card = entry.target;
      const s = cardState.get(card) || {entered:false,viewed:false,answered:false,scrolled:false,timer:null};
      if (entry.intersectionRatio >= 0.6) {
        s.entered = true;
        if (!s.viewed && !s.timer) {
          s.timer = setTimeout(() => { if (document.body.contains(card) && !s.viewed) { s.viewed = true; viewed += 1; flush(); } s.timer = null; }, 1000);
        }
      } else {
        if (s.timer) { clearTimeout(s.timer); s.timer = null; }
        if (s.entered && !s.answered && !s.scrolled) { s.scrolled = true; scrolled += 1; saveQuestion(card, 'scrolled'); flush(); }
      }
      cardState.set(card, s);
    }
  }, { threshold:[0,0.6] });

  function observeCards() {
    document.querySelectorAll('.q').forEach(card => { if (!cardState.has(card)) { cardState.set(card,{entered:false,viewed:false,answered:false,scrolled:false,timer:null}); observer.observe(card); } });
  }
  new MutationObserver(observeCards).observe(document.getElementById('feed'), {childList:true}); observeCards();

  document.addEventListener('click', e => {
    const mode = e.target.closest('[data-mode]');
    const topic = e.target.closest('[data-file]');
    if (mode) start(mode.dataset.mode === '50' ? 'Nasumičnih 50' : 'Beskrajni niz');
    else if (topic) start(topic.dataset.trackingTopic || topic.dataset.file?.replace(/\.json$/i,'') || topic.textContent.trim());

    const card = e.target.closest('.q'); if (!card) return;
    if (e.target.closest('.more')) { learnMore += 1; flush(); }
    if (e.target.closest('.share')) { shares += 1; flush(); }
    if (e.target.closest('.ok')) setTimeout(() => { const s=cardState.get(card)||{}; if(s.answered)return; const result=card.querySelector('.result'); if(!result?.classList.contains('good')&&!result?.classList.contains('bad'))return; s.answered=true; cardState.set(card,s); if(result.classList.contains('good'))correct+=1; else wrong+=1; saveQuestion(card,'answered'); flush(); },0);
  }, true);

  document.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return; const card=e.target.closest?.('.q'); if(!card||!e.target.matches('input'))return;
    setTimeout(()=>{const s=cardState.get(card)||{};if(s.answered)return;const result=card.querySelector('.result');if(!result?.classList.contains('good')&&!result?.classList.contains('bad'))return;s.answered=true;cardState.set(card,s);if(result.classList.contains('good'))correct+=1;else wrong+=1;saveQuestion(card,'answered');flush();},0);
  });

  document.addEventListener('visibilitychange',()=>{tick();flush();});
  window.addEventListener('blur',()=>{tick();flush();});
  window.addEventListener('focus',()=>{lastTick=performance.now();});
  window.addEventListener('pagehide',()=>{tick();flush();});
  setInterval(()=>{if(playId)flush();},10000);

  const p=new URLSearchParams(location.search);
  if(p.get('mode')==='50')start('Nasumičnih 50');
  else if(p.get('mode')==='all')start('Beskrajni niz');
  else if(p.get('topic'))start(p.get('topic').replace(/\.json$/i,''));
  else if(p.get('q')||p.get('shared'))start('Podijeljeno pitanje', true);
})();