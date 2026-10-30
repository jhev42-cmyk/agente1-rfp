import { NextResponse } from 'next/server'
import { HttpError, handler, parseId, requireUser } from '../../../../lib/api'
import { prisma } from '../../../../lib/db'

// Exportar normas de la línea - leer TODAS las normas de cada poste desde PosteNorma
export const GET = handler(async (request, { params }: { params: { id: string } }) => {
  await requireUser(request)
  const id = parseId(params.id)

  // Obtener todos los postes con TODAS sus normas (tabla PosteNorma)
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

  // Generar contenido del archivo
  let postsDetail = ''
  let allNormasCodes = new Set<string>()

  for (const poste of postes) {
    const normasCodigos: string[] = []
    for (const pn of poste.normas) {
      if (pn.norma?.codigo) {
        normasCodigos.push(pn.norma.codigo)
        allNormasCodes.add(pn.norma.codigo)
      }
    }

    if (normasCodigos.length > 0) {
      postsDetail += `${poste.codigo}: ${normasCodigos.join(', ')}\n`
    }
  }

  // Generar contenido del archivo .txt
  const content = `NORMAS SELECCIONADAS EN LA LÍNEA
=====================================

DETALLE POR POSTE:
${postsDetail}

RESUMEN DE NORMAS SELECCIONADAS:
${Array.from(allNormasCodes).sort().join('\n')}

Total de normas únicas: ${allNormasCodes.size}
Total de postes con normas: ${postes.filter(p => p.normas.length > 0).length}
Generado: ${new Date().toLocaleString('es-CO')}
`

  // Retornar como descarga de archivo
  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': 'attachment; filename="normas-seleccionadas.txt"',
    },
  })
})
