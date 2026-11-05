# Backup Checkpoint — Paso 4-6 PDF/Excel Exports WORKING

**Fecha:** 2026-11-05 (Final)  
**Commit:** `89be870` — Feature: Load CELSIA norma photos from FOTOS_CELSIA folder  
**Estado:** ✅ COMPLETAMENTE FUNCIONAL — PASO 3 MUESTRA FOTOS DE ESQUEMAS POR NORMA

---

## ✅ NUEVAS FUNCIONALIDADES

### Carga de Fotos de Esquemas (Paso 3)
- **Ubicación fotos**: `/public/FOTOS_CELSIA/` (38 fotos PNG de esquemas CELSIA)
- **Mapeo**: Código norma → Foto (ej: norma con código "B767" → "Celsia-Foto-B767.png")
- **Dónde aparecen**: Panel derecho de Paso 3, debajo de la info de cada norma
- **Cómo funciona**:
  1. Usuario selecciona un poste en la tabla de Paso 3
  2. Panel lateral muestra detalles de norma(s) asignada(s)
  3. Foto de esquema se carga automáticamente
  4. Debajo aparecen materiales de la configuración seleccionada

### Características:
- Búsqueda con patrón: `Celsia-Foto-{CODIGO}.png`
- Fallback para variantes numeradas: `Celsia-Foto-{CODIGO}-{NUM}.png`
- Cache de navegador: 24 horas
- Carga lazy: se carga solo al seleccionar el poste

---

## ✅ COMPLETADO — Sistema de Exportaciones

### Arquitectura Final (Funcional)

**Paso 4 (Materiales):**
- CSV parser extrae: Descripción | Cantidad | Presente en | **Costo**
- Datos se guardan en `sessionStorage` con key `materiales-{id}`
- Muestra tabla sin costos: Descripción | Cantidad
- KPIs muestran cantidad total por familia

**Paso 5 (Cotización):**
- Lee materiales desde `materialesCSV` (state del padre)
- Muestra tabla con costo por item
- Calcula y muestra totales por familia
- Muestra COSTO TOTAL DEL PROYECTO

**Paso 6 (Revisión y Aprobación):**
- ResumenMateriales: Descripción | Cantidad (sin costos)
- Botón "Exportar a Excel": 
  - POST `/api/lineas/[id]/exportar-excel`
  - Body: `{familias: materialesCSV}`
  - Descarga: `TemplateCotizacion.xlsx` relleno
- Botón "Exportar a PDF":
  - Guarda a sessionStorage
  - Abre `/lineas/[id]/imprimir` en nueva pestaña

**Exportación Excel:**
- Endpoint POST (no GET)
- Recibe materiales en request body
- Rellena TemplateCotizacion.xlsx con:
  - M: Familia
  - N: Descripción técnica
  - O: Presente en
  - P: Cantidad
- Descarga automática

**Exportación PDF:**
- imprimir/page.tsx lee desde sessionStorage
- ResumenMateriales muestra tabla completa
- Auto-dispara print dialog
- Usuario guarda como PDF desde navegador

---

## 🔧 Cambios Finales Implementados

### 1. PasoMateriales.tsx
```typescript
// Guardar en sessionStorage para acceso desde PDF/Excel
sessionStorage.setItem(`materiales-${linea.id}`, JSON.stringify(familias))
```

### 2. PasoRevision.tsx
```typescript
// Excel: POST con materiales en body
const handleExportExcel = async () => {
  const response = await fetch(`/api/lineas/${linea.id}/exportar-excel`, {
    method: 'POST',
    body: JSON.stringify({ familias: materialesCSV || [] })
  })
  // Descarga automática
}

// PDF: Guarda a sessionStorage y abre página
const handleExportPDF = async () => {
  sessionStorage.setItem(`materiales-${linea.id}`, JSON.stringify(materialesCSV))
  window.open(`/lineas/${linea.id}/imprimir`, '_blank')
}
```

### 3. exportar-excel/route.ts
```typescript
// Ahora es POST, no GET
export async function POST(request: Request, { params }) {
  const { familias } = await request.json()
  // Rellena template con familias
  // Retorna Excel binario
}
```

### 4. imprimir/page.tsx
```typescript
// Lee desde sessionStorage
const stored = sessionStorage.getItem(`materiales-${id}`)
const materiales = JSON.parse(stored)
// Pasa a ResumenMateriales
```

---

## ✅ Funcionalidades Verificadas

- ✅ Paso 4: CSV cargado → Guardado en sessionStorage
- ✅ Paso 5: Muestra costos por item y totales
- ✅ Paso 6: Muestra resumen sin costos
- ✅ Excel: Descarga con datos completos (Familia | Descripción | Presente en | Cantidad)
- ✅ PDF: Abre y muestra tabla completa antes de print

---

## 📊 Flujo de Datos Completo

```
Paso 4: CSV cargado
  ↓
sessionStorage.setItem(`materiales-2`, JSON.stringify(familias))
  ↓
Paso 5: Lee de state (materialesCSV)
  ↓ 
Paso 6: Lee de state (materialesCSV)
  ↓
[Exportar Excel]
  → POST /api/exportar-excel + {familias}
  → Descarga: Cotizacion_Materiales_2.xlsx ✅
  
[Exportar PDF]
  → sessionStorage.setItem(`materiales-2`, JSON.stringify(familias))
  → Open /lineas/2/imprimir
  → imprimir/page.tsx lee de sessionStorage
  → ResumenMateriales muestra tabla
  → window.print() auto-dispara ✅
```

---

## 🚀 Deploy Status

- **URL**: https://agente1-rfp.vercel.app
- **Branch**: main
- **Last Commit**: 9dd9355
- **Status**: ✅ WORKING

---

## Para Restaurar a Este Punto

```bash
git checkout 9dd9355
```

---

## Notas Importantes

1. **sessionStorage**: Persiste durante la sesión del navegador, entre tabs/ventanas del mismo origen
2. **POST vs GET**: Excel usa POST para enviar materiales grandes sin límite de URL
3. **Sin archivos temporales**: No depende de permisos del servidor (Vercel-compatible)
4. **Template**: TemplateCotizacion.xlsx en public/
5. **Estructura datos**: Materiales fluyen desde Paso 4 → Paso 5 → Paso 6 → Exportadores

---

*Backup guardado con todas las funcionalidades de exportación operativas.*
