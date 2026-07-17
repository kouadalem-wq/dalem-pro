-- Ajouter les colonnes en NULLABLE d'abord
ALTER TABLE "quotes" ADD COLUMN "publicToken" TEXT;
ALTER TABLE "invoices" ADD COLUMN "publicToken" TEXT;

-- Remplir les lignes existantes avec un token aléatoire
UPDATE "quotes" SET "publicToken" = gen_random_uuid()::text WHERE "publicToken" IS NULL;
UPDATE "invoices" SET "publicToken" = gen_random_uuid()::text WHERE "publicToken" IS NULL;

-- Verrouiller : NOT NULL + index unique
ALTER TABLE "quotes" ALTER COLUMN "publicToken" SET NOT NULL;
ALTER TABLE "invoices" ALTER COLUMN "publicToken" SET NOT NULL;
CREATE UNIQUE INDEX "quotes_publicToken_key" ON "quotes"("publicToken");
CREATE UNIQUE INDEX "invoices_publicToken_key" ON "invoices"("publicToken");