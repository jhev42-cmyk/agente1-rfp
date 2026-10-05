-- CreateEnum
CREATE TYPE "ModoAsignacion" AS ENUM ('CORRIDO', 'TRAYECTO');

-- AlterTable
ALTER TABLE "Linea" ADD COLUMN     "modoAsignacion" "ModoAsignacion";
