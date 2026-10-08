-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMIN', 'APROBADOR', 'ANALISTA');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "sessionVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntentoLogin" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "exito" BOOLEAN NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntentoLogin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "IntentoLogin_email_fecha_idx" ON "IntentoLogin"("email", "fecha");

-- CreateIndex
CREATE INDEX "IntentoLogin_ip_fecha_idx" ON "IntentoLogin"("ip", "fecha");

-- Usuarios existentes (antes en app/lib/auth.ts), con el mismo hash de contraseña.
INSERT INTO "Usuario" ("email", "nombre", "rol", "passwordHash", "updatedAt") VALUES
  ('admin@rfp.local', 'Administrador', 'ADMIN', 'scrypt$11f9df3cc6a87df94a27836be0f0177b$52349de1cefeda6f4a1367a1201b4c55adb47c33195ca64c48d3840435f2a7d5', CURRENT_TIMESTAMP),
  ('analista1@rfp.local', 'Analista 1', 'ANALISTA', 'scrypt$f9db57d6d5421e3e2dcbefa9078292f7$ef503f49ad415dd5eeda9f3f2fec48254dc0cc863af427642f3adffd4a86bb88', CURRENT_TIMESTAMP),
  ('analista2@rfp.local', 'Analista 2', 'ANALISTA', 'scrypt$e6a18d27bab39f12b5a713555d77647b$ce7575ed3bc20832e7abcbba6d4dc3db86d376334deb87681e2383d7339183fa', CURRENT_TIMESTAMP)
ON CONFLICT ("email") DO NOTHING;
