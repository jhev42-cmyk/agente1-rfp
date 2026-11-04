# Backup Checkpoint — Normas Export with Repetitions

**Fecha:** 2026-11-04  
**Commit:** `7ac5f5d` — Fix: Include main norm (normaId) in norm export summary  
**Estado:** ✅ FUNCIONANDO CORRECTAMENTE

## Lo que funciona

### Normas Export (`Paso 3 - Postes`)
- ✅ Archivo `normas-seleccionadas.txt` generado correctamente
- ✅ **DETALLE POR POSTE:** Lista cada norma de cada poste
- ✅ **RESUMEN DE NORMAS SELECCIONADAS:** Lista TODAS las normas CON REPETICIONES
  - Ejemplo: B72ED aparece **2 veces** cuando está en T02-P002 y T02-P006
  - Las normas se listan en orden de aparición (no alfabético)

### Cómo lo arreglamos
El código ahora lee normas de DOS fuentes:
1. `poste.normaId` — la norma principal del poste
2. `poste.normas` — normas adicionales de PosteNorma (tabla many-to-many)

**Archivo:** `app/api/lineas/[id]/normas-export/route.ts`

```typescript
// Cargar info de normas por ID
const normasMap = await prisma.norma.findMany({
  select: { id: true, codigo: true }
}).then(n => new Map(n.map(x => [x.id, x.codigo])))

// Iterar postes
for (const poste of postes) {
  const normasCodigos: string[] = []
  
  // 1. Agregar norma principal (normaId)
  if (poste.normaId) {
    const codigoNorma = normasMap.get(poste.normaId)
    if (codigoNorma) {
      normasCodigos.push(codigoNorma)
      todasLasNormas.push(codigoNorma)  // ← Con repeticiones
    }
  }
  
  // 2. Agregar normas adicionales (PosteNorma)
  for (const pn of poste.normas) {
    if (pn.norma?.codigo && (poste.normaId !== pn.normaId || !poste.normaId)) {
      normasCodigos.push(pn.norma.codigo)
      todasLasNormas.push(pn.norma.codigo)  // ← Con repeticiones
    }
  }
  
  if (normasCodigos.length > 0) {
    postsDetail += `${poste.codigo}: ${normasCodigos.join(', ')}\n`
  }
}

// Generar resumen CON repeticiones
const resumenNormas = todasLasNormas.join('\n')  // ← Array, no Set
```

### Otros componentes (sin cambios)
- ✅ Paso 4 (Materiales) — carga CSV y consolida
- ✅ Paso 5 (Cotización) — muestra resumen con precios
- ✅ Paso 6 (Revisión) — exporta PDF y Excel
- ✅ Excel export sin precios (para proveedores)
- ✅ PDF export con precios (para interno)

## URL Deploy
https://agente1-rfp.vercel.app

## Para restaurar a este punto
```bash
git checkout 7ac5f5d
```

---
*Backup creado tras verificar que normas con repeticiones se listan correctamente.*
