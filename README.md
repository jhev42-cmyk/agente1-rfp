# Agente 1 — RFP Agent

Herramienta para configurar y cotizar líneas de media tensión, y para preparar solicitudes de cotización a proveedores.

## Módulos

- **Líneas** (`/lineas`, requiere sesión): registro de la línea (nombre, km, operador, KMZ de referencia), 10 trayectos, configuración poste a poste con normas del catálogo, materiales consolidados, cotización con partidas de mano de obra / transporte / indirectos, estados borrador → en revisión → aprobada, historial de cambios con usuario y motivo, revisiones, exportación a Excel y PDF.
- **Catálogo** (`/catalogo`): normas por operador con versiones, esquema y materiales; precios de materiales importables desde Excel/CSV. Solo los administradores modifican el catálogo.
- **Solicitudes a proveedores** (`/agente.html`): desglose de materiales, fichas técnicas y correos RFQ por categoría. Toma las cantidades por configuración y los precios del mismo catálogo central que Líneas.
- **Usuarios** (`/usuarios`, solo admin) y **Mi cuenta** (`/cuenta`, cambio de contraseña).

## Acceso y roles

- Todo exige sesión (middleware), incluidos `agente.html`, `proveedores.json` y los formatos Excel; solo `/login` es público.
- La sesión es una cookie `HttpOnly`, `SameSite=Lax`, firmada (HMAC) y con vencimiento de 12 h. Cada petición a la API comprueba además que el usuario siga activo y que la sesión no haya sido revocada (cambio o restablecimiento de contraseña, desactivación). Las escrituras desde otro origen se rechazan.
- Roles: **analista** (configura y cotiza), **aprobador** (además aprueba líneas), **admin** (además catálogo y usuarios).
- Límite de intentos: 5 fallidos en 15 minutos por correo, o 20 por IP.

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

Los usuarios están en la tabla `Usuario` (solo el hash scrypt de la contraseña) y se gestionan en `/usuarios`. Sin `AUTH_SECRET` en local se usa una clave de desarrollo; en producción es obligatoria.

## Pruebas

```bash
E2E_ADMIN_PASSWORD=... E2E_ANALISTA_PASSWORD=... npm run test:e2e
```

Crea un esquema temporal en la base de `.env.local`, aplica migraciones y catálogo, levanta un servidor local y corre `tests/plan`, `modos`, `eliminar` y `seguridad` (API y navegador con Chrome). El esquema se borra al terminar.

## Base de datos

- Esquema: `prisma/schema.prisma`. Migraciones en `prisma/migrations`. El build solo aplica migraciones en el deploy de **producción** de Vercel (`scripts/migrar-si-produccion.js`); los previews y los builds locales no tocan la base, que es compartida.
- Catálogo inicial: `prisma/catalogo-inicial.json`, generado desde los consolidados maestros con `node prisma/generar-catalogo.js` y cargado con `npm run db:seed` (idempotente: no duplica normas).
- Al enviar una línea a revisión se congela su cotización (`Linea.snapshot`): lo que se revisa es exactamente lo que se aprueba, aunque cambien precios o normas. Devolverla a borrador la descongela; una aprobada solo se modifica creando una nueva revisión.
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
└── Formato_Cotizacion_*.xlsx
```
