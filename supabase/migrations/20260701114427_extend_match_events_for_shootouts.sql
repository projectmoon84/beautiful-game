ALTER TABLE match_events
  DROP CONSTRAINT IF EXISTS match_events_type_check;

ALTER TABLE match_events
  ADD CONSTRAINT match_events_type_check
  CHECK (
    type IN (
      'goal',
      'own_goal',
      'penalty',
      'penalty_missed',
      'var_goal',
      'var_cancelled',
      'yellow',
      'second_yellow',
      'red',
      'sub',
      'shootout_goal',
      'shootout_miss',
      'shootout_saved'
    )
  );
