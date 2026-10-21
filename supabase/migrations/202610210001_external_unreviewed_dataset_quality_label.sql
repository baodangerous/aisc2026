-- External medical QA must remain explicitly unreviewed until human safety and license review.
alter table public.ai_training_examples
  drop constraint if exists ai_training_examples_quality_label_check;

alter table public.ai_training_examples
  add constraint ai_training_examples_quality_label_check
  check (quality_label in ('synthetic', 'external_unreviewed', 'reviewed', 'pilot_verified'));

-- Public/authenticated read policies intentionally exclude external_unreviewed.
