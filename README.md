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

Accede a `http://localhost:3000` y usa:
- Email: `admin@esmetals.com`
- Password: `admin123`

## Variables de entorno

Copia `.env.example` a `.env.local` y configura:

```
DATABASE_URL=postgresql://...
ADMIN_EMAIL=admin@esmetals.com
ADMIN_PASSWORD=changeme
```

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
│   ├── auth/login/          # Autenticación
│   └── quotations/          # CRUD de cotizaciones
├── components/
│   └── QuotationForm.tsx    # Formulario principal
├── dashboard/               # Dashboard admin
├── login/                   # Página de login
└── lib/
    └── quotationData.ts     # Datos técnicos
```

## Notas

- Por ahora usa almacenamiento en memoria
- Será migrado a Vercel Postgres + Prisma ORM
- Cambia las credenciales de admin en producción
