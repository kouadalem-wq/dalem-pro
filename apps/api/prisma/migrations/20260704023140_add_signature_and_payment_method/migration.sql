-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "paymentMethod" "PaymentMethod";

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "signature" TEXT;
