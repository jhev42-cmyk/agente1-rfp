# Pendientes — Agente 1

## Catálogo de normas (fase 1 de líneas)
- [ ] Cargar el esquema (foto/plano) de cada norma en /catalogo — hoy ninguna lo tiene.
- [ ] Importar los precios reales de los 40 materiales (plantilla descargable en /catalogo → Precios).
- [ ] Validar con ingeniería el catálogo inicial: viene de los consolidados maestros EPM/ENEL, donde ambos operadores comparten la misma lista de materiales por configuración (C1–C5) y solo cambia el código de norma.
- [ ] Material 8.2 (conductor de bajada a tierra): la fuente dice "12 a 16 m" en C1–C4; se cargó 16 m (límite superior). Confirmar.
- [ ] Hoy cada norma tiene una sola configuración. Si alguna norma tiene variantes (ej. altura/carga de poste), crearlas desde "Editar materiales (nueva versión)".
- [ ] Unificar materiales con `agente.html` (RFQ): hoy el agente usa su propio catálogo embebido y conteos C1–C5.

## Acceso
- [ ] `public/agente.html` es público (decisión: abierto mientras dure la etapa de pruebas).
- [ ] Usuarios en `app/lib/auth.ts` (admin, analista1, analista2). Migrar a tabla en la base y agregar cambio de contraseña.
- [ ] Definir quién aprueba líneas: hoy cualquier usuario con sesión puede aprobar (queda registrado).

## Fases posteriores (fuera de la fase 1 según PLAN.md)
- [ ] Lectura automática del KMZ y estimación de postes desde el trazado.
- [ ] Comprobaciones geométricas.

## Agente RFQ (agente.html)
- [ ] Reemplazar las 2 entradas DEMO de `public/precios_negociados.json`.
- [ ] Reemplazar los % A/I/U genéricos (10/5/5) por la política interna.
- [ ] Módulo legal: checklist normativo (RETIE, CREG, ANLA) por tipo de contratación.
- [ ] CELSIA, ElectroHuila y Enerca: definir familias/calibres en `OPERADORES_TIPOS`.
