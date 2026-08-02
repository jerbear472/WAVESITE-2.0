-- Rollback for 005. Sweep items must be deleted before the constraint can
-- tighten again (they are append-only; drop the trigger first if you truly
-- intend to discard the sweep corpus).

drop table if exists public.detected_clusters;

-- delete from public.raw_items where corpus = 'sweep';  -- deliberate manual step
alter table public.raw_items
  drop constraint if exists raw_items_corpus_check;
alter table public.raw_items
  add constraint raw_items_corpus_check
  check (corpus in ('trend','baseline'));
