-- CreateEnum
CREATE TYPE "EstadoLinea" AS ENUM ('BORRADOR', 'EN_REVISION', 'APROBADA');

-- CreateEnum
CREATE TYPE "TipoPartida" AS ENUM ('MATERIAL', 'MANO_OBRA', 'TRANSPORTE', 'INDIRECTO');

-- CreateTable
CREATE TABLE "Material" (
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "unidad" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("codigo")
);

-- CreateTable
CREATE TABLE "Norma" (
    "id" SERIAL NOT NULL,
    "operador" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "tipoPoste" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "vigente" BOOLEAN NOT NULL DEFAULT true,
    "imagen" BYTEA,
    "imagenTipo" TEXT,
    "creadoPor" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Norma_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NormaConfiguracion" (
    "id" SERIAL NOT NULL,
    "normaId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "NormaConfiguracion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfiguracionMaterial" (
    "id" SERIAL NOT NULL,
    "configuracionId" INTEGER NOT NULL,
    "codigoMaterial" TEXT NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "observacion" TEXT,

    CONSTRAINT "ConfiguracionMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Precio" (
    "id" SERIAL NOT NULL,
    "codigoMaterial" TEXT NOT NULL,
    "precioUnitario" DOUBLE PRECISION NOT NULL,
    "proveedor" TEXT,
    "lote" TEXT NOT NULL,
    "importadoPor" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Precio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Linea" (
    "id" SERIAL NOT NULL,
    "grupo" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "nombre" TEXT NOT NULL,
    "longitudKm" DOUBLE PRECISION NOT NULL,
    "operador" TEXT NOT NULL,
    "estado" "EstadoLinea" NOT NULL DEFAULT 'BORRADOR',
    "kmzNombre" TEXT,
    "kmz" BYTEA,
    "creadoPor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "aprobadaPor" TEXT,
    "aprobadaAt" TIMESTAMP(3),
    "snapshot" JSONB,

    CONSTRAINT "Linea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trayecto" (
    "id" SERIAL NOT NULL,
    "lineaId" INTEGER NOT NULL,
    "numero" INTEGER NOT NULL,
    "cantidadPostes" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Trayecto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Poste" (
    "id" SERIAL NOT NULL,
    "lineaId" INTEGER NOT NULL,
    "trayectoId" INTEGER NOT NULL,
    "numero" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "normaId" INTEGER,
    "configuracionId" INTEGER,

    CONSTRAINT "Poste_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partida" (
    "id" SERIAL NOT NULL,
    "lineaId" INTEGER NOT NULL,
    "tipo" "TipoPartida" NOT NULL,
    "codigoMaterial" TEXT,
    "descripcion" TEXT NOT NULL,
    "unidad" TEXT NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "precioUnitario" DOUBLE PRECISION,

    CONSTRAINT "Partida_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Auditoria" (
    "id" SERIAL NOT NULL,
    "lineaId" INTEGER,
    "entidad" TEXT NOT NULL,
    "entidadId" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "valorAnterior" TEXT,
    "valorNuevo" TEXT,
    "motivo" TEXT NOT NULL,
    "usuario" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Norma_operador_vigente_idx" ON "Norma"("operador", "vigente");

-- CreateIndex
CREATE UNIQUE INDEX "Norma_operador_codigo_version_key" ON "Norma"("operador", "codigo", "version");

-- CreateIndex
CREATE INDEX "Precio_codigoMaterial_createdAt_idx" ON "Precio"("codigoMaterial", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Linea_grupo_revision_key" ON "Linea"("grupo", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "Trayecto_lineaId_numero_key" ON "Trayecto"("lineaId", "numero");

-- CreateIndex
CREATE INDEX "Poste_lineaId_idx" ON "Poste"("lineaId");

-- CreateIndex
CREATE UNIQUE INDEX "Poste_trayectoId_numero_key" ON "Poste"("trayectoId", "numero");

-- CreateIndex
CREATE INDEX "Auditoria_lineaId_fecha_idx" ON "Auditoria"("lineaId", "fecha");

-- AddForeignKey
ALTER TABLE "NormaConfiguracion" ADD CONSTRAINT "NormaConfiguracion_normaId_fkey" FOREIGN KEY ("normaId") REFERENCES "Norma"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfiguracionMaterial" ADD CONSTRAINT "ConfiguracionMaterial_configuracionId_fkey" FOREIGN KEY ("configuracionId") REFERENCES "NormaConfiguracion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Precio" ADD CONSTRAINT "Precio_codigoMaterial_fkey" FOREIGN KEY ("codigoMaterial") REFERENCES "Material"("codigo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trayecto" ADD CONSTRAINT "Trayecto_lineaId_fkey" FOREIGN KEY ("lineaId") REFERENCES "Linea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Poste" ADD CONSTRAINT "Poste_lineaId_fkey" FOREIGN KEY ("lineaId") REFERENCES "Linea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Poste" ADD CONSTRAINT "Poste_trayectoId_fkey" FOREIGN KEY ("trayectoId") REFERENCES "Trayecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Poste" ADD CONSTRAINT "Poste_normaId_fkey" FOREIGN KEY ("normaId") REFERENCES "Norma"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Poste" ADD CONSTRAINT "Poste_configuracionId_fkey" FOREIGN KEY ("configuracionId") REFERENCES "NormaConfiguracion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partida" ADD CONSTRAINT "Partida_lineaId_fkey" FOREIGN KEY ("lineaId") REFERENCES "Linea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Auditoria" ADD CONSTRAINT "Auditoria_lineaId_fkey" FOREIGN KEY ("lineaId") REFERENCES "Linea"("id") ON DELETE CASCADE ON UPDATE CASCADE;
