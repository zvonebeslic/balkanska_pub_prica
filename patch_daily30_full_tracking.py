from pathlib import Path
p=Path('online-kviz.html')
s=p.read_text(encoding='utf-8')
old='''    /* GitHub prototip Dnevnih 30 je namjerno potpuno lokalan dok ne uvedemo novu baznu strukturu. */
    if (currentMode === "daily30") return;

    activeQuizStartedAt = Date.now();'''
new='''    activeQuizStartedAt = Date.now();'''
if old not in s:
    raise SystemExit('daily30 tracking skip not found')
s=s.replace(old,new,1)
old2='''  function finishDaily30Round() {
    if (currentMode !== "daily30" || quizFinished) return;
    quizFinished = true;
    const savedResult = window.KvizDaily30?.complete?.(scoreCorrect, scoreTotal);
    finalizeLocalGame(true);'''
new2='''  function finishDaily30Round() {
    if (currentMode !== "daily30" || quizFinished) return;
    quizFinished = true;
    const savedResult = window.KvizDaily30?.complete?.(scoreCorrect, scoreTotal);
    finalizeLocalGame(true);
    void finishQuizTracking(true);'''
if old2 not in s:
    raise SystemExit('finishDaily30Round target not found')
s=s.replace(old2,new2,1)
p.write_text(s,encoding='utf-8')
