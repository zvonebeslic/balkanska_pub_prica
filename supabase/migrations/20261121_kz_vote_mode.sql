-- Dopusti da zajednička Online kviz tablica ocjena razlikuje Kraljevstvo Znanja.
-- Dodaje novu dozvoljenu vrijednost; postojeće vrijednosti ostaju netaknute.
alter table public.quiz_question_votes
  drop constraint if exists quiz_question_votes_quiz_mode_check;
alter table public.quiz_question_votes
  add constraint quiz_question_votes_quiz_mode_check
  check (quiz_mode in (
    'blitz60','story90','relax','themed','daily30','scroll','abc','multiplayer','kraljevstvo_znanja'
  ));
