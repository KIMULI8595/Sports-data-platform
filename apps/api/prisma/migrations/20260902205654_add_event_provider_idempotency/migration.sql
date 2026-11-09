/*
  Warnings:

  - A unique constraint covering the columns `[provider_id,provider_event_id]` on the table `match_events` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "match_events" ADD COLUMN     "provider_event_id" VARCHAR(150),
ADD COLUMN     "provider_id" INTEGER;

-- CreateTable
CREATE TABLE "data_providers" (
    "id" SERIAL NOT NULL,
    "public_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "data_providers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "data_providers_public_id_key" ON "data_providers"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "data_providers_code_key" ON "data_providers"("code");

-- CreateIndex
CREATE INDEX "match_events_provider_id_idx" ON "match_events"("provider_id");

-- CreateIndex
CREATE UNIQUE INDEX "match_events_provider_id_provider_event_id_key" ON "match_events"("provider_id", "provider_event_id");

-- AddForeignKey
ALTER TABLE "match_events"
ADD CONSTRAINT "match_events_provider_id_fkey"
FOREIGN KEY ("provider_id")
REFERENCES "data_providers"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

-- Provider identity must be complete or completely absent
ALTER TABLE "match_events"
ADD CONSTRAINT "match_events_provider_identity_check"
CHECK (
    (
        "provider_id" IS NULL
        AND "provider_event_id" IS NULL
    )
    OR
    (
        "provider_id" IS NOT NULL
        AND "provider_event_id" IS NOT NULL
    )
);