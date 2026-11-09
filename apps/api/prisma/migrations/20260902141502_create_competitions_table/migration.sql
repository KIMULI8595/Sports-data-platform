-- CreateTable
CREATE TABLE "competitions" (
    "id" SERIAL NOT NULL,
    "public_id" UUID NOT NULL,
    "sport_id" INTEGER NOT NULL,
    "country_id" INTEGER,
    "name" VARCHAR(150) NOT NULL,
    "short_name" VARCHAR(80),
    "slug" VARCHAR(160) NOT NULL,
    "type" VARCHAR(30) NOT NULL,
    "gender" VARCHAR(20) NOT NULL DEFAULT 'male',
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "competitions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "competitions_public_id_key" ON "competitions"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "competitions_slug_key" ON "competitions"("slug");

-- CreateIndex
CREATE INDEX "competitions_sport_id_idx" ON "competitions"("sport_id");

-- CreateIndex
CREATE INDEX "competitions_country_id_idx" ON "competitions"("country_id");

-- AddForeignKey
ALTER TABLE "competitions" ADD CONSTRAINT "competitions_sport_id_fkey" FOREIGN KEY ("sport_id") REFERENCES "sports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitions" ADD CONSTRAINT "competitions_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
