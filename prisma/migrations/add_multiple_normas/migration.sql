-- CreateTable PosteNorma - Relación many-to-many entre Poste y Norma
CREATE TABLE "PosteNorma" (
    "id" SERIAL NOT NULL,
    "posteId" INTEGER NOT NULL,
    "normaId" INTEGER NOT NULL,
    "configuracionId" INTEGER,
    "seleccionada" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PosteNorma_pkey" PRIMARY KEY ("id")
);

-- Migración de datos existentes: cada Poste con normaId pasa a PosteNorma
INSERT INTO "PosteNorma" ("posteId", "normaId", "configuracionId", "seleccionada", "createdAt")
SELECT "id", "normaId", "configuracionId", true, NOW()
FROM "Poste"
WHERE "normaId" IS NOT NULL;

-- Eliminar columnas normaId y configuracionId del Poste (ya están en PosteNorma)
ALTER TABLE "Poste" DROP COLUMN "normaId";
ALTER TABLE "Poste" DROP COLUMN "configuracionId";

-- Crear índices para PosteNorma
CREATE UNIQUE INDEX "PosteNorma_posteId_normaId_key" ON "PosteNorma"("posteId", "normaId");
CREATE INDEX "PosteNorma_posteId_idx" ON "PosteNorma"("posteId");
CREATE INDEX "PosteNorma_normaId_idx" ON "PosteNorma"("normaId");

-- Agregar constraint de foreign key para PosteNorma
ALTER TABLE "PosteNorma" ADD CONSTRAINT "PosteNorma_posteId_fkey" FOREIGN KEY ("posteId") REFERENCES "Poste"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PosteNorma" ADD CONSTRAINT "PosteNorma_normaId_fkey" FOREIGN KEY ("normaId") REFERENCES "Norma"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PosteNorma" ADD CONSTRAINT "PosteNorma_configuracionId_fkey" FOREIGN KEY ("configuracionId") REFERENCES "NormaConfiguracion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
