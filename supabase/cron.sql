-- OPTIONAL: run the scheduled scan from Supabase instead of GitHub Actions.
-- GitHub disables scheduled workflows after 60 days without repo activity;
-- this does not depend on your repo at all.
--
-- 1. In the SQL editor, enable the extensions (once):
--      create extension if not exists pg_cron;
--      create extension if not exists pg_net;
-- 2. Replace YOUR_APP_URL and YOUR_CRON_SECRET below, then run this file.
--    (Run it yourself in the SQL editor so the secret never leaves your hands.)
-- 3. In GitHub, delete .github/workflows/scan.yml so scans don't run twice.
--
-- This calls the first page only (25 users). Once you have more than 25
-- users, use the GitHub workflow (which pages through everyone) or add one
-- job per page by changing offset below (0, 25, 50, ...).

select cron.schedule(
  'huntboard-scan-0600',
  '0 6 * * *',
  $$ select net.http_get(
       url := 'YOUR_APP_URL/api/cron/scan?offset=0&limit=25',
       headers := jsonb_build_object('Authorization', 'Bearer YOUR_CRON_SECRET'),
       timeout_milliseconds := 60000
     ); $$
);
select cron.schedule('huntboard-scan-1300', '0 13 * * *', $$ select net.http_get(url := 'YOUR_APP_URL/api/cron/scan?offset=0&limit=25', headers := jsonb_build_object('Authorization', 'Bearer YOUR_CRON_SECRET'), timeout_milliseconds := 60000); $$);
select cron.schedule('huntboard-scan-2000', '0 20 * * *', $$ select net.http_get(url := 'YOUR_APP_URL/api/cron/scan?offset=0&limit=25', headers := jsonb_build_object('Authorization', 'Bearer YOUR_CRON_SECRET'), timeout_milliseconds := 60000); $$);
