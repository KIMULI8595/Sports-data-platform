# API-Football free-tier fixture ingestion

This is an **initial fixture importer**, not a full live-score ingestion engine. It intentionally does not overwrite existing matches, goals, scores, players, or market values. Provider IDs are stored in `external_entity_maps`.

## Provider limitations

- Free plan: 100 requests/day; recent-season limits; competition coverage varies. Verify availability with a dry run.
- Do not resell data or use the free tier to circumvent provider limits. Check the current terms before commercial release.
- No player market valuation source is included.
- Keep API keys server-side. This importer uses two calls per run (league/season coverage + fixtures).

## Windows 11 / PowerShell

1. Create a free account at https://dashboard.api-football.com/ and copy the key privately into `apps/api/.env` as `API_FOOTBALL_KEY`.
2. Choose a provider league ID from the API-Football dashboard. Free-season coverage and Uganda Premier League must be verified in your account.
3. In `apps/api`, run `npm ci`, then `npx prisma validate`, `npx prisma migrate dev` (on your development database only, after backup), and `npx prisma generate`.
4. Test without database writes:

```powershell
npm run ingest:football -- --league 39 --season 2026 --dry-run
```

The league ID 39 is an example, not a promise that the 2026 season is covered on your free plan.

5. Import fixtures for a confirmed league/season:

```powershell
npm run ingest:football -- --league 39 --season 2026
```

6. Schedule daily in Windows Task Scheduler with action `node.exe`, arguments `scripts/football-ingest.mjs --league <ID> --season <YEAR>`, and **Start in** set to the absolute `apps/api` folder. Use a single task instance; do not run overlapping jobs. The Windows machine must be awake and online. A hosted always-on worker is preferable for production.

## Safety and limitations

- Local daily usage file `.football-api-usage.json` counts attempted requests; it is not a distributed quota lock. Never run multiple importer instances simultaneously.
- The importer inserts provider-mapped fixtures and teams; it does not merge existing manually-created teams by name, to avoid false identity matches. Resolve duplicates through a deliberate mapping review.
- It skips existing provider-mapped matches and leaves their event histories and scores untouched.
- It does not yet reconcile changed kick-off times, ingest live goals, squads, transfers, standings, or market values. Those need separate validated adapters and tests.
- If your existing DB has migration drift, investigate before applying new migrations. Never use `migrate reset` on data you want to retain.
