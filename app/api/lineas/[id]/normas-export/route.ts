import { NextResponse } from 'next/server'
import { HttpError, handler, parseId, requireUser } from '../../../../lib/api'
import { prisma } from '../../../../lib/db'
import * as fs from 'fs'
import * as path from 'path'

// Exportar normas de la línea - leer TODAS las normas de cada poste desde PosteNorma
export const GET = handler(async (request, { params }: { params: { id: string } }) => {
  await requireUser(request)
  const id = parseId(params.id)

  // Obtener todos los postes con TODAS sus normas (tabla PosteNorma + normaId del poste)
  const postes = await prisma.poste.findMany({
    where: { lineaId: id },
    orderBy: [{ trayecto: { numero: 'asc' } }, { numero: 'asc' }],
    include: {
      normas: {
        include: {
          norma: {
            select: {
              id: true,
              codigo: true,
            },
          },
        },
        orderBy: { normaId: 'asc' },
      },
    },
  })

  // Enriquecer con la norma principal (normaId) del poste si existe
  const postesConNormas = postes.map(p => ({
    ...p,
    normas: p.normaId && !p.normas.some(pn => pn.normaId === p.normaId)
      ? [{ normaId: p.normaId, norma: { id: 0, codigo: 'TEMP' }, configuracionId: null, seleccionada: false }, ...p.normas]
      : p.normas
  }))

  if (!postes.length) {
    throw new HttpError(404, 'No hay postes en la línea')
  }

  // DEBUG: Log detallado
  console.log('[DEBUG NORMAS EXPORT - POST_NORMA]')
  for (const p of postes) {
    console.log(`Poste ${p.codigo}: ${p.normas.length} normas en PosteNorma`)
    for (const pn of p.normas) {
      console.log(`  - Norma ID ${pn.normaId}: ${pn.norma?.codigo || 'SIN CODIGO'}`)
    }
  }

  // Generar contenido del archivo - incluir normaId + PosteNorma
  let postsDetail = ''
  const todasLasNormas: string[] = []

  // Cargar info de normas por ID para cuando normaId esté en el poste
  const normasMap = await prisma.norma.findMany({
    select: { id: true, codigo: true }
  }).then(n => new Map(n.map(x => [x.id, x.codigo])))

  for (const poste of postes) {
    const normasCodigos: string[] = []

    // Primero agregar la norma principal del poste (normaId)
    if (poste.normaId) {
      const codigoNorma = normasMap.get(poste.normaId)
      if (codigoNorma) {
        normasCodigos.push(codigoNorma)
        todasLasNormas.push(codigoNorma)
      }
    }

    // Luego agregar las normas adicionales de PosteNorma (pero no duplicar si ya está en normaId)
    for (const pn of poste.normas) {
      if (pn.norma?.codigo && (poste.normaId !== pn.normaId || !poste.normaId)) {
        normasCodigos.push(pn.norma.codigo)
        todasLasNormas.push(pn.norma.codigo)
      }
    }

    if (normasCodigos.length > 0) {
      postsDetail += `${poste.codigo}: ${normasCodigos.join(', ')}\n`
    }
  }

  // Generar resumen con todas las normas en orden (con repeticiones)
  const resumenNormas = todasLasNormas.join('\n')
  const normasUnicas = new Set(todasLasNormas)

  // Generar contenido del archivo .txt
  const content = `NORMAS SELECCIONADAS EN LA LÍNEA
=====================================

DETALLE POR POSTE:
${postsDetail}

RESUMEN DE NORMAS SELECCIONADAS:
${resumenNormas}

Total de normas únicas: ${normasUnicas.size}
Total de postes con normas: ${postes.filter(p => p.normas.length > 0).length}
Generado: ${new Date().toLocaleString('es-CO')}
`

  // Guardar en public/normas-seleccionadas.txt
  try {
    const publicDir = path.join(process.cwd(), 'public')
    const filePath = path.join(publicDir, 'normas-seleccionadas.txt')

    // Asegurar que la carpeta public existe
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true })
    }

    // Guardar el archivo
    fs.writeFileSync(filePath, content, 'utf-8')
    console.log(`[NORMAS EXPORT] Archivo guardado en: ${filePath}`)
  } catch (e) {
    console.warn(`[NORMAS EXPORT] Error al guardar archivo:`, e)
    // Continuar incluso si falla el guardado
  }

  // Retornar como descarga de archivo
  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': 'attachment; filename="normas-seleccionadas.txt"',
    },
  })
})
