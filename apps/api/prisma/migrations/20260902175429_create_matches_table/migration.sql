-- CreateTable
CREATE TABLE "matches" (
    "id" SERIAL NOT NULL,
    "public_id" UUID NOT NULL,
    "season_id" INTEGER NOT NULL,
    "home_team_id" INTEGER NOT NULL,
    "away_team_id" INTEGER NOT NULL,
    "scheduled_start" TIMESTAMPTZ(3) NOT NULL,
    "actual_start" TIMESTAMPTZ(3),
    "status" VARCHAR(30) NOT NULL DEFAULT 'scheduled',
    "period" VARCHAR(30),
    "clock_seconds" INTEGER NOT NULL DEFAULT 0,
    "home_score" INTEGER NOT NULL DEFAULT 0,
    "away_score" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "matches_public_id_key" ON "matches"("public_id");

-- CreateIndex
CREATE INDEX "matches_season_id_idx" ON "matches"("season_id");

-- CreateIndex
CREATE INDEX "matches_home_team_id_idx" ON "matches"("home_team_id");

-- CreateIndex
CREATE INDEX "matches_away_team_id_idx" ON "matches"("away_team_id");

-- CreateIndex
CREATE INDEX "matches_scheduled_start_idx" ON "matches"("scheduled_start");

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_home_team_id_fkey" FOREIGN KEY ("home_team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_away_team_id_fkey" FOREIGN KEY ("away_team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Ensure a team cannot play against itself
ALTER TABLE "matches"
ADD CONSTRAINT "matches_different_teams_check"
CHECK ("home_team_id" <> "away_team_id");

-- Scores must never be negative
ALTER TABLE "matches"
ADD CONSTRAINT "matches_home_score_check"
CHECK ("home_score" >= 0);

ALTER TABLE "matches"
ADD CONSTRAINT "matches_away_score_check"
CHECK ("away_score" >= 0);

-- Match clock cannot be negative
ALTER TABLE "matches"
ADD CONSTRAINT "matches_clock_seconds_check"
CHECK ("clock_seconds" >= 0);

