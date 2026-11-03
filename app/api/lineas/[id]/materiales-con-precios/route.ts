import { NextResponse } from 'next/server'
import { HttpError, handler, parseId, requireUser } from '../../../../lib/api'
import * as fs from 'fs'
import * as path from 'path'

const normalizarDescripcion = (desc: string): string => {
  return desc
    .toLowerCase()
    .trim()
    .replace(/\s+kv/gi, 'kv')
    .replace(/\s+/g, ' ')
}

export const GET = handler(async (request, { params }: { params: { id: string } }) => {
  await requireUser(request)
  const id = parseId(params.id)

  try {
    const projectRoot = process.cwd()
    const csvPath = path.join(projectRoot, 'public', 'materiales_normas_celsia.csv')
    const preciosPath = path.join(projectRoot, 'public', 'MatrizMateriales_Precios.csv')

    if (!fs.existsSync(csvPath)) {
      throw new HttpError(404, 'CSV de materiales no encontrado.')
    }

    if (!fs.existsSync(preciosPath)) {
      throw new HttpError(404, 'CSV de precios no encontrado.')
    }

    // Parsear CSV de precios
    const preciosContent = fs.readFileSync(preciosPath, 'utf-8')
    const preciosPorDescripcion: { [key: string]: number } = {}
    const descripcionesOriginales: Map<string, string> = new Map()

    const preciosLineas = preciosContent.split('\n')
    for (const linea of preciosLineas) {
      if (!linea.trim() || linea.includes('Descripción técnica') || linea.includes('Total ')) continue

      let descripcion = ''
      let precio = 0

      if (linea.startsWith('"')) {
        const endQuote = linea.indexOf('"', 1)
        if (endQuote > 0) {
          descripcion = linea.substring(1, endQuote)
          const precioStr = linea.substring(endQuote + 1).replace(/^,/, '').trim()
          precio = parseFloat(precioStr)
        }
      } else {
        const partes = linea.split(',')
        if (partes.length >= 2) {
          descripcion = partes[0].trim()
          precio = parseFloat(partes[1])
        }
      }

      if (descripcion && !isNaN(precio) && precio > 0) {
        const descNorm = normalizarDescripcion(descripcion)
        preciosPorDescripcion[descNorm] = precio
        descripcionesOriginales.set(descNorm, descripcion)
      }
    }

    // Parsear CSV de materiales
    const csvContent = fs.readFileSync(csvPath, 'utf-8')
    const lineas = csvContent.split('\n').filter(l => l.trim())

    const familias: any[] = []
    let familiaActual: any = null
    let enHeaders = false

    for (const linea of lineas) {
      const partes = linea.split(';').map(p => p.trim().replace(/^"|"$/g, ''))

      if (partes.length >= 1 && partes[1] === '' && partes[2] === '' && !linea.includes('Descripción')) {
        if (familiaActual) familias.push(familiaActual)
        familiaActual = {
          nombre: partes[0],
          items: [],
        }
        enHeaders = false
      } else if (partes[0] === 'Descripción técnica' || partes[0] === 'Descripción') {
        enHeaders = true
      } else if (enHeaders && partes[0]) {
        if (partes[0].includes('Total')) {
          if (familiaActual) {
            familiaActual.total = {
              nombre: partes[0],
              cantidad: parseFloat(partes[1]) || 0,
            }
          }
        } else {
          const descripcionNorm = normalizarDescripcion(partes[0])
          let precio = preciosPorDescripcion[descripcionNorm]

          if (!precio) {
            for (const [key, value] of Object.entries(preciosPorDescripcion)) {
              if (descripcionNorm.includes(key) || key.includes(descripcionNorm)) {
                precio = value
                break
              }
            }
          }

          precio = precio || 0
          const cantidad = partes[1] ? parseFloat(partes[1]) : 0
          const costo = cantidad * precio

          if (familiaActual) {
            familiaActual.items.push({
              descripcion: partes[0],
              cantidad,
              presenteEn: partes[2] || '',
              precioUnit: precio,
              costo,
            })
          }
        }
      }
    }

    if (familiaActual) familias.push(familiaActual)

    console.log(`[MATERIALES_PRECIOS] CSV parseado: ${familias.length} familias`)

    return NextResponse.json({
      success: true,
      familias,
    })
  } catch (error: any) {
    console.error('[MATERIALES_PRECIOS] Error:', error.message)
    if (error instanceof HttpError) throw error
    throw new HttpError(500, `Error al cargar materiales con precios: ${error.message}`)
  }
})
