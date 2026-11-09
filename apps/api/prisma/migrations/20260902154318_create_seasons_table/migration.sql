-- CreateTable
CREATE TABLE "seasons" (
    "id" SERIAL NOT NULL,
    "public_id" UUID NOT NULL,
    "competition_id" INTEGER NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "seasons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "seasons_public_id_key" ON "seasons"("public_id");

-- CreateIndex
CREATE INDEX "seasons_competition_id_idx" ON "seasons"("competition_id");

-- CreateIndex
CREATE UNIQUE INDEX "seasons_competition_id_name_key" ON "seasons"("competition_id", "name");

-- AddForeignKey
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "competitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Ensure a season cannot end before it starts
ALTER TABLE "seasons"
ADD CONSTRAINT "seasons_date_range_check"
CHECK ("end_date" >= "start_date");