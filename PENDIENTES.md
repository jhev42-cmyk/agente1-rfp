# Pendientes — Agente 1

## Acceso
- [ ] `public/agente.html` es público (decisión: abierto mientras dure la etapa de pruebas). Antes de abrirlo a usuarios reales, exigir sesión también para el agente (middleware o mover el agente detrás del login).
- [ ] Usuarios en `app/lib/auth.ts` (admin, analista1, analista2). Migrar a la tabla User de Prisma cuando haya base de datos; agregar cambio de contraseña.

## Persistencia
- [ ] Cotizaciones en memoria (`app/api/quotations/route.ts`) se pierden en cada deploy → conectar Vercel Postgres con el esquema Prisma existente.
- [ ] El agente (`agente.html`) no guarda nada en el servidor; conectar "guardar cotización" con el API.

## Presupuesto (paso 5)
- [ ] Reemplazar las 2 entradas DEMO de `public/precios_negociados.json` por precios reales por ítem (código 1.1 … 10.1).
- [ ] Reemplazar los % A/I/U genéricos (10/5/5) por la política interna de márgenes y contingencia.
- [ ] Mano de obra e instalación: hoy es un valor global manual; definir si se desglosa por actividad.
- [ ] Indicadores VAN / TIR / ROI y flujo de caja (según Agente_1_Borrador_Cotizacion.docx).

## Funcional (según Agente_1_Borrador_Cotizacion.docx)
- [ ] Módulo legal: checklist normativo (RETIE, CREG, ANLA) por tipo de contratación.
- [ ] Consolidación y exportación del borrador — definir formato (Word, Excel o ambos).
- [ ] Rama de implementación (cronograma, comisionamiento, garantías).
- [ ] Mecanismo de retroalimentación desde el Agente 2 tras adjudicación.
- [ ] CELSIA, ElectroHuila y Enerca: definir familias/calibres en `OPERADORES_TIPOS` (agente.html) para activarlos.
