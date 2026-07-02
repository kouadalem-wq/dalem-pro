-- CreateEnum
CREATE TYPE "PdfTemplate" AS ENUM ('MODERN', 'CLASSIC');

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "pdfTemplate" "PdfTemplate" NOT NULL DEFAULT 'MODERN';
