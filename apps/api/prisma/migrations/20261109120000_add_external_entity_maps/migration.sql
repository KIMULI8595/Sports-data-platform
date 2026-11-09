CREATE TABLE "external_entity_maps" (
  "id" SERIAL NOT NULL PRIMARY KEY,
  "provider_code" VARCHAR(50) NOT NULL,
  "entity_type" VARCHAR(30) NOT NULL,
  "external_id" VARCHAR(100) NOT NULL,
  "internal_id" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "external_entity_maps_provider_code_entity_type_external_id_key" ON "external_entity_maps"("provider_code", "entity_type", "external_id");
CREATE INDEX "external_entity_maps_entity_type_internal_id_idx" ON "external_entity_maps"("entity_type", "internal_id");
