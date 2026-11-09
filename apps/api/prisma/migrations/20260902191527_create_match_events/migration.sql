-- CreateTable
CREATE TABLE "event_types" (
    "id" SERIAL NOT NULL,
    "public_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "description" VARCHAR(255),
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "event_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_events" (
    "id" SERIAL NOT NULL,
    "public_id" UUID NOT NULL,
    "match_id" INTEGER NOT NULL,
    "event_type_id" INTEGER NOT NULL,
    "team_id" INTEGER,
    "related_event_id" INTEGER,
    "sequence_number" INTEGER NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'confirmed',
    "period" VARCHAR(30) NOT NULL,
    "minute" INTEGER,
    "second" INTEGER,
    "metadata" JSONB,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL,
    "received_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "event_types_public_id_key" ON "event_types"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_types_code_key" ON "event_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "match_events_public_id_key" ON "match_events"("public_id");

-- CreateIndex
CREATE INDEX "match_events_match_id_idx" ON "match_events"("match_id");

-- CreateIndex
CREATE INDEX "match_events_event_type_id_idx" ON "match_events"("event_type_id");

-- CreateIndex
CREATE INDEX "match_events_team_id_idx" ON "match_events"("team_id");

-- CreateIndex
CREATE INDEX "match_events_related_event_id_idx" ON "match_events"("related_event_id");

-- CreateIndex
CREATE INDEX "match_events_match_id_occurred_at_idx" ON "match_events"("match_id", "occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "match_events_match_id_sequence_number_key" ON "match_events"("match_id", "sequence_number");

-- AddForeignKey
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_event_type_id_fkey" FOREIGN KEY ("event_type_id") REFERENCES "event_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_related_event_id_fkey" FOREIGN KEY ("related_event_id") REFERENCES "match_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Sequence numbers must start from 1
ALTER TABLE "match_events"
ADD CONSTRAINT "match_events_sequence_number_check"
CHECK ("sequence_number" > 0);

-- Match minute cannot be negative
ALTER TABLE "match_events"
ADD CONSTRAINT "match_events_minute_check"
CHECK (
    "minute" IS NULL
    OR "minute" >= 0
);

-- Seconds must represent a valid second within a minute
ALTER TABLE "match_events"
ADD CONSTRAINT "match_events_second_check"
CHECK (
    "second" IS NULL
    OR ("second" >= 0 AND "second" <= 59)
);

-- Restrict event lifecycle statuses
ALTER TABLE "match_events"
ADD CONSTRAINT "match_events_status_check"
CHECK (
    "status" IN (
        'received',
        'validated',
        'confirmed',
        'rejected',
        'corrected',
        'reversed'
    )
);

-- Restrict events to supported football periods
ALTER TABLE "match_events"
ADD CONSTRAINT "match_events_period_check"
CHECK (
    "period" IN (
        'first_half',
        'half_time',
        'second_half',
        'extra_time',
        'penalties'
    )
);

-- An event cannot reference itself as a related event
ALTER TABLE "match_events"
ADD CONSTRAINT "match_events_related_event_check"
CHECK (
    "related_event_id" IS NULL
    OR "related_event_id" <> "id"
);