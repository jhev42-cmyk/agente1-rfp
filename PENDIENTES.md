# Pendientes — Agente 1

## ✅ COMPLETADO - Integración CELSIA (commit 528d2fa)
- [x] 20 normas CELSIA integradas (10 tipos × 2 voltajes: 13.2/34.5 kV)
  - Pato series: Bandera, Brazo Tangente (simple y multi-circuito)
  - Polimérico series: Bandera, Herraje C (frontal/lateral), Delta V
  - Pin series: Herraje C (simple y multi-circuito), Herraje E
- [x] Schema: Poste ↔ Norma many-to-many via PosteNorma tabla
  - Soporte para múltiples normas por poste
  - Flag `seleccionada` para marcar norma activa
  - Configuración flexible por norma
- [x] API endpoints para gestión de normas por poste
  - GET /postes/[id]/normas
  - POST /postes/[id]/normas (agregar)
  - PATCH /postes/[id]/normas/[normaId] (cambiar seleccionada/config)
  - DELETE /postes/[id]/normas/[normaId] (eliminar)
  - GET /postes/[id]/normas-disponibles (listar no-asignadas)
- [x] UI component: PosteNormasSelector
  - Radio buttons para seleccionar norma activa
  - Dropdown para configuración de norma seleccionada
  - Dropdown + botón para agregar nuevas normas
  - Botón para eliminar norma del poste
  - Filtro por operador

## ⏳ Próximos pasos — Integración en UI de líneas
- [ ] Integrar PosteNormasSelector en espacio de trabajo de líneas
- [ ] Conectar selector con guardado automático en base de datos
- [ ] Actualizar listado de postes para mostrar norma seleccionada
- [ ] Validar que al cotizar usa la norma seleccionada (PosteNorma.seleccionada=true)

## Catálogo de normas (fase 1 de líneas)
- [ ] Cargar el esquema (foto/plano) de cada norma CELSIA en API
  - Imágenes disponibles en CELSIA/images/ — falta mapeo a normaId
- [ ] Completar materiales por configuración de normas CELSIA
  - Hoy: placeholder con 3 materiales genéricos
  - TODO: extraer de Excel CELSIA y mapear a catálogo central
- [ ] Importar los precios reales de los 40 materiales (plantilla descargable en /catalogo → Precios).
- [ ] Validar con ingeniería el catálogo inicial: vienen consolidados maestros EPM/ENEL, donde ambos operadores comparten la misma lista de materiales por configuración (C1–C5) y solo cambia el código de norma.

## Acceso
- [ ] Asignar el rol **aprobador** a quien corresponda en /usuarios (hoy solo el admin puede aprobar).
- [ ] Opcional: impedir que quien preparó la línea sea también quien la aprueba.

## Fases posteriores (fuera de la fase 1 según PLAN.md)
- [ ] Lectura automática del KMZ y estimación de postes desde el trazado.
- [ ] Comprobaciones geométricas.

## Agente RFQ (agente.html)
- [ ] Reemplazar los % A/I/U genéricos (10/5/5) por la política interna.
- [ ] Módulo legal: checklist normativo (RETIE, CREG, ANLA) por tipo de contratación.
- [ ] ElectroHuila y Enerca: definir familias/calibres en `OPERADORES_TIPOS`.
