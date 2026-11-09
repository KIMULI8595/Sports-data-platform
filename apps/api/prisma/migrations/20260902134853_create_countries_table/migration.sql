-- CreateTable
CREATE TABLE "countries" (
    "id" SERIAL NOT NULL,
    "public_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "iso2_code" CHAR(2) NOT NULL,
    "iso3_code" CHAR(3) NOT NULL,
    "continent_code" VARCHAR(10),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "countries_public_id_key" ON "countries"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "countries_name_key" ON "countries"("name");

-- CreateIndex
CREATE UNIQUE INDEX "countries_iso2_code_key" ON "countries"("iso2_code");

-- CreateIndex
CREATE UNIQUE INDEX "countries_iso3_code_key" ON "countries"("iso3_code");
