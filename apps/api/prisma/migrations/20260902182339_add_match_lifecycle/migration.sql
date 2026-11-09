-- Add actual match end timestamp
ALTER TABLE "matches"
ADD COLUMN "actual_end" TIMESTAMPTZ(3);

-- Restrict matches to supported lifecycle statuses
ALTER TABLE "matches"
ADD CONSTRAINT "matches_status_check"
CHECK (
    "status" IN (
        'scheduled',
        'live',
        'half_time',
        'finished',
        'delayed',
        'postponed',
        'suspended',
        'cancelled',
        'abandoned'
    )
);

-- Restrict match periods to supported football periods
ALTER TABLE "matches"
ADD CONSTRAINT "matches_period_check"
CHECK (
    "period" IS NULL
    OR "period" IN (
        'first_half',
        'half_time',
        'second_half',
        'extra_time',
        'penalties'
    )
);