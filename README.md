# Agente 1 — RFP Agent

Herramienta para configurar y cotizar líneas de media tensión, y para preparar solicitudes de cotización a proveedores.

## Módulos

- **Líneas** (`/lineas`, requiere sesión): registro de la línea (nombre, km, operador, KMZ de referencia), 10 trayectos, configuración poste a poste con normas del catálogo, materiales consolidados, cotización con partidas de mano de obra / transporte / indirectos, estados borrador → en revisión → aprobada, historial de cambios con usuario y motivo, revisiones, exportación a Excel y PDF.
- **Catálogo** (`/catalogo`): normas por operador con versiones, esquema y materiales; precios de materiales importables desde Excel/CSV. Solo los administradores modifican el catálogo.
- **Solicitudes a proveedores** (`/agente.html`, abierto durante la etapa de pruebas): desglose de materiales, fichas técnicas y correos RFQ por categoría.

## Stack

- Next.js 14 (App Router) + React 18
- Postgres (Neon, conectado desde el Marketplace de Vercel) con Prisma
- Despliegue en Vercel: un push a `main` despliega y aplica las migraciones pendientes

## Desarrollo local

```bash
npm install
vercel env pull .env.local      # trae DATABASE_URL, DATABASE_URL_UNPOOLED y AUTH_SECRET
set -a && source .env.local && set +a
npm run dev
```

Los usuarios están en `app/lib/auth.ts` (solo el hash de la contraseña). Sin `AUTH_SECRET` en local se usa una clave de desarrollo; en producción es obligatoria.

## Base de datos

- Esquema: `prisma/schema.prisma`. Migraciones en `prisma/migrations`; `npm run build` ejecuta `prisma migrate deploy`.
- Catálogo inicial: `prisma/catalogo-inicial.json`, generado desde los consolidados maestros con `node prisma/generar-catalogo.js` y cargado con `npm run db:seed` (idempotente: no duplica normas).
- Una línea aprobada guarda su cotización congelada (`Linea.snapshot`): cambios posteriores de precios o normas no la alteran. Modificarla exige crear una nueva revisión.
- Las normas se versionan: editar materiales crea una versión nueva; los postes conservan la versión con la que se configuraron.

## Estructura

```
app/
├── api/
│   ├── auth/                 # login y validación de sesión
│   ├── lineas/               # líneas, trayectos, postes, partidas, cálculo, estado, revisión, KMZ, historial
│   └── catalogo/             # normas (versiones, esquema), materiales, precios, historial
├── lineas/                   # lista de líneas y espacio de trabajo por pasos
├── catalogo/                 # catálogo central
├── components/               # barra de navegación, diálogo con motivo, esquema de norma
└── lib/
    ├── auth.ts               # usuarios y firma de sesiones
    ├── lineas.ts             # reglas de negocio: trayectos, normas por poste, cálculo, aprobación
    └── catalogo.ts           # versiones de normas, imágenes, importación de precios
prisma/                       # esquema, migraciones, catálogo inicial y seed
public/
├── agente.html               # solicitudes a proveedores (RFQ)
├── proveedores.json
├── precios_negociados.json
└── Formato_Cotizacion_*.xlsx
```
