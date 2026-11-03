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
    for (let linea of preciosLineas) {
      linea = linea.replace(/\r/g, '').trim()
      if (!linea || linea.includes('Descripción técnica') || linea.includes('Total ')) continue

      let descripcion = ''
      let precio = 0

      if (linea.startsWith('"')) {
        // Línea entrecomillada
        const endQuote = linea.lastIndexOf('"')
        if (endQuote > 0) {
          descripcion = linea.substring(1, endQuote).replace(/"/g, '"').trim()
          const precioStr = linea.substring(endQuote + 1).replace(/^,/, '').trim()
          precio = parseFloat(precioStr)
        }
      } else {
        // Línea normal - separador es coma
        const partes = linea.split(',')
        if (partes.length >= 2) {
          descripcion = partes[0].trim()
          precio = parseFloat(partes[1].trim())
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
      let descripcion = ''
      let cantidad = 0
      let presenteEn = ''

      // Parsear línea entrecomillada o normal
      if (linea.startsWith('"')) {
        const endQuote = linea.lastIndexOf('"')
        const content = linea.substring(0, endQuote + 1)
        const resto = linea.substring(endQuote + 1)

        descripcion = content.substring(1, content.length - 1).trim()
        const partes = resto.split(';').map(p => p.trim())
        cantidad = partes.length > 0 ? parseFloat(partes[0]) || 0 : 0
        presenteEn = partes.length > 1 ? partes[1] : ''
      } else {
        const partes = linea.split(';').map(p => p.trim().replace(/^"|"$/g, ''))
        descripcion = partes[0] || ''
        cantidad = partes.length > 1 ? parseFloat(partes[1]) || 0 : 0
        presenteEn = partes.length > 2 ? partes[2] : ''
      }

      if (!descripcion || descripcion.includes('Descripción técnica')) continue

      if (descripcion === '' && cantidad === 0 && presenteEn === '') {
        if (familiaActual) familias.push(familiaActual)
        familiaActual = null
        enHeaders = false
      } else if (descripcion === 'Descripción técnica' || descripcion === 'Descripción') {
        enHeaders = true
      } else if (enHeaders && descripcion && !descripcion.includes('Total')) {
        const descripcionNorm = normalizarDescripcion(descripcion)
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
        const costo = cantidad * precio

        if (familiaActual) {
          familiaActual.items.push({
            descripcion,
            cantidad,
            presenteEn,
            precioUnit: precio,
            costo,
          })
        }
      } else if (enHeaders && descripcion.includes('Total')) {
        if (familiaActual) {
          familiaActual.total = {
            nombre: descripcion,
            cantidad: cantidad,
          }
        }
      } else if (descripcion && cantidad === 0 && presenteEn === '') {
        // Es una línea de familia
        if (familiaActual) familias.push(familiaActual)
        familiaActual = {
          nombre: descripcion,
          items: [],
        }
        enHeaders = false
      }
    }

    if (familiaActual) familias.push(familiaActual)

    // Log de materiales sin precio para debugging
    const sinPrecio: string[] = []
    familias.forEach(fam => {
      fam.items.forEach((item: any) => {
        if (!item.precioUnit) {
          sinPrecio.push(`${fam.nombre}: ${item.descripcion}`)
        }
      })
    })

    if (sinPrecio.length > 0) {
      console.log(`[MATERIALES_PRECIOS] ${sinPrecio.length} materiales sin precio:`)
      sinPrecio.forEach(s => console.log(`  - ${s}`))
      console.log(`[MATERIALES_PRECIOS] Precios disponibles: ${Object.keys(preciosPorDescripcion).length}`)
    }

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
