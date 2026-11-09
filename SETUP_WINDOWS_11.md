# Sports Data Platform — Windows 11 setup

This package extends the original uploaded NestJS/Prisma codebase. **No database or live-feed connection was available during package creation.** Back up any old database before migrations. Do not run `prisma migrate reset`.

## Requirements
- Node.js 24.x recommended (matching original handover)
- PostgreSQL 18.x, running on port 5432
- Git optional

## Database
Connect as the `postgres` administrator using `psql -U postgres -h localhost -d postgres`. For a **new, empty** database only, create an application login and the two databases (skip if they already exist):

```sql
CREATE ROLE sports_platform_app LOGIN PASSWORD 'YOUR_PRIVATE_PASSWORD';
CREATE DATABASE sports_platform_dev OWNER sports_platform_app;
CREATE DATABASE sports_platform_shadow OWNER sports_platform_app;
```

Do not put your real password in Git. URL-encode reserved characters such as `@` as `%40` in connection strings.

## API setup (PowerShell)
```powershell
cd .\apps\api
npm ci
Copy-Item .env.example .env
# Edit .env with your local password (do not share it)
npx --no-install prisma validate
npx --no-install prisma migrate status
# On a fresh empty DB only, after reviewing migration status:
npx --no-install prisma migrate deploy
npx --no-install prisma generate
npx --no-install prisma db seed
npm run build
npm run lint
npm test
npm run test:e2e
npm run start:dev
```

If migrations report drift or checksum mismatches, **stop and investigate** rather than resetting or editing applied migration history. Existing archived migrations are preserved.

## Web (second PowerShell terminal)
```powershell
cd .\apps\web
npm run dev
```
Open http://localhost:4173; API is http://localhost:3000. The web app shows actual API records only; empty states are expected until data is created. No external sports feed or paid content is bundled.

## Current modules
Existing: sports, countries, competitions, seasons, teams, matches, match events, provider idempotency.
Added: players, player-team membership, match lineups, team match statistics, season standings, web dashboard.

## Known limitations / roadmap
This is an integrated foundation, not a verified production release. Advanced provider ingestion, reconciliation, full football rules, authentication, odds, notifications, news, media rights, video, ML predictions, fantasy sports, mobile native clients, and third-party API management require further work. Standings currently use 3/1/0 and simple goal-difference tiebreaking. Player statistics are readable through match details but do not yet have write endpoints. Additional sports require sport-specific rule engines.

## Verification
API compilation, lint, unit/e2e tests, migration application, and live database behavior must be run on your machine. The static web assets can be served with Node alone. A successful source/package inspection is not proof of successful runtime integration.
