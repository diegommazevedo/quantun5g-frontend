SELECT
  (SELECT COUNT(*) FROM nr01_micro_pulses) AS rows,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'nr01_pulse_config')      AS has_pulse_config,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'nr01_pulse_dispatches')  AS has_pulse_dispatches;
