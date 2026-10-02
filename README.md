# Agente 1 — RFP Agent

Herramienta funcional para generar cotizaciones técnicas de proyectos de líneas de media y alta tensión.

## Características

- ✅ Autenticación de usuarios (admin)
- ✅ Formulario completo de cotizaciones
- ✅ Almacenamiento de cotizaciones
- ✅ Dashboard con historial
- 📋 Exportación a PDF
- 📊 Exportación a Excel

## Stack Tecnológico

- **Frontend**: React 18 + Next.js 14
- **Backend**: Next.js API Routes
- **Estilos**: CSS personalizado + Tailwind CSS
- **Base de datos**: Vercel Postgres (será configurado)
- **Despliegue**: Vercel

## Instalación

```bash
npm install
npm run dev
```

Accede a `http://localhost:3000` con uno de los usuarios definidos en `app/lib/auth.ts` (las contraseñas no están en el repositorio; solo su hash).

## Variables de entorno

Copia `.env.example` a `.env.local` y configura:

```
DATABASE_URL=postgresql://...
AUTH_SECRET=<cadena aleatoria larga, firma las sesiones>
```

En local, sin `AUTH_SECRET`, se usa una clave de desarrollo. En producción es obligatoria.

## Despliegue en Vercel

```bash
git add .
git commit -m "Initial setup"
vercel
```

## Estructura

```
app/
├── api/
│   ├── auth/login/          # Inicio de sesión
│   ├── auth/me/             # Validación de sesión
│   └── quotations/          # CRUD de cotizaciones
├── agente/                  # Redirige a /agente.html
├── dashboard/               # Dashboard
├── login/                   # Página de login
└── lib/
    └── auth.ts              # Usuarios y firma de sesiones
public/
├── agente.html              # Agente 1 (herramienta principal)
├── proveedores.json         # Directorio de proveedores
├── precios_negociados.json  # Precios por ítem para el presupuesto (paso 5)
└── Formato_Cotizacion_*.xlsx
```

## Notas

- Por ahora usa almacenamiento en memoria
- Será migrado a Vercel Postgres + Prisma ORM
- Cambia las credenciales de admin en producción
