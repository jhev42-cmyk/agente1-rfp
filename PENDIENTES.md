# Pendientes — Agente 1

## Estructura
- [ ] Definir una sola implementación: `public/agente.html` es la versión en producción. Decidir qué hacer con `app/agente-old.html` (sin uso), `index.html` de la raíz (copia desactualizada) y `QuotationForm.tsx` (dashboard).
- [ ] Archivos servidos por la app viven en `public/` (proveedores.json, Formato_Cotizacion_*.xlsx). Lo que no esté ahí no se publica en Vercel.

## Persistencia y seguridad
- [ ] Cotizaciones en memoria (`app/api/quotations/route.ts`) se pierden en cada deploy → conectar Vercel Postgres con el esquema Prisma existente.
- [ ] Token de sesión es base64 sin firma → firmar sesiones antes de abrir a usuarios reales.
- [ ] Quitar credenciales demo visibles en `app/login/page.tsx` cuando salga de demo.

## Funcional (según Agente_1_Borrador_Cotizacion.docx)
- [ ] Módulo económico: usar `precios_negociados.json` (aún no lo consume la app) como puente al Agente 3.
- [ ] Módulo legal: checklist normativo (RETIE, CREG, ANLA) por tipo de contratación.
- [ ] Consolidación y exportación del borrador — definir formato (Word, Excel o ambos).
- [ ] Rama de implementación (cronograma, comisionamiento, garantías).
- [ ] Mecanismo de retroalimentación desde el Agente 2 tras adjudicación.
