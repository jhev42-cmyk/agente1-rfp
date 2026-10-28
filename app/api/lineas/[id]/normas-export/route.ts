import { NextResponse } from 'next/server'
import { HttpError, handler, parseId, requireUser } from '../../../../lib/api'
import { prisma } from '../../../../lib/db'

// Exportar normas seleccionadas de la línea a un archivo .txt
export const GET = handler(async (request, { params }: { params: { id: string } }) => {
  await requireUser(request)
  const id = parseId(params.id)

  // Obtener todos los postes con TODAS sus normas (sin filtrar por seleccionada)
  const postes = await prisma.poste.findMany({
    where: { lineaId: id },
    orderBy: [{ trayecto: { numero: 'asc' } }, { numero: 'asc' }],
    select: {
      codigo: true,
      normas: {
        select: {
          normaId: true,
          seleccionada: true,
        },
        orderBy: { normaId: 'asc' },
      },
    },
  })

  if (!postes.length) {
    throw new HttpError(404, 'No hay postes en la línea')
  }

  // DEBUG: Log de lo que trae de la BD
  console.log('[DEBUG NORMAS EXPORT]')
  for (const p of postes) {
    console.log(`  ${p.codigo}: ${p.normas.length} normas (seleccionadas: ${p.normas.filter(n => n.seleccionada).length})`)
    for (const pn of p.normas) {
      console.log(`    - normaId: ${pn.normaId}, seleccionada: ${pn.seleccionada}`)
    }
  }

  // Obtener IDs únicos de normas
  const normaIds = new Set<number>()
  for (const poste of postes) {
    for (const pn of poste.normas) {
      if (pn.seleccionada) {
        normaIds.add(pn.normaId)
      }
    }
  }

  if (normaIds.size === 0) {
    throw new HttpError(400, 'No hay normas seleccionadas en los postes')
  }

  // Obtener info de todas las normas
  const normasMap = new Map<number, string>()
  const normasData = await prisma.norma.findMany({
    where: { id: { in: Array.from(normaIds) } },
    select: { id: true, codigo: true },
  })

  for (const norma of normasData) {
    normasMap.set(norma.id, norma.codigo)
  }

  // Generar contenido del archivo con detalles por poste
  let postsDetail = ''
  let allNormasCodes = new Set<string>()

  for (const poste of postes) {
    const normasCodigos: string[] = []
    for (const pn of poste.normas) {
      if (pn.seleccionada) {
        const codigo = normasMap.get(pn.normaId)
        if (codigo) {
          normasCodigos.push(codigo)
          allNormasCodes.add(codigo)
        }
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
Total de postes con normas: ${postes.filter(p => p.normas.some(pn => pn.seleccionada)).length}
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
