import { NextResponse } from 'next/server'
import { handler, parseId, requireUser, HttpError } from '../../../../../lib/api'
import * as fs from 'fs'
import * as path from 'path'

export const GET = handler(async (request, { params }: { params: { id: string } }) => {
  await requireUser(request)
  const id = parseId(params.id)

  try {
    // Importar exceljs dinámicamente
    const ExcelJS = await import('exceljs')
    const Workbook = ExcelJS.Workbook

    // Cargar datos de materiales y línea
    const projectRoot = process.cwd()
    const csvPath = path.join(projectRoot, 'public', 'materiales_normas_celsia.csv')
    const preciosPath = path.join(projectRoot, 'public', 'MatrizMateriales_Precios.csv')

    if (!fs.existsSync(csvPath) || !fs.existsSync(preciosPath)) {
      throw new HttpError(404, 'Archivos de materiales no encontrados')
    }

    // Parser para precios
    const normalizarDescripcion = (desc: string): string => {
      return desc.toLowerCase().trim().replace(/\s+kv/gi, 'kv').replace(/\s+/g, ' ')
    }

    // Cargar precios
    const preciosContent = fs.readFileSync(preciosPath, 'utf-8')
    const preciosPorDescripcion: { [key: string]: number } = {}

    preciosContent.split('\n').forEach(linea => {
      linea = linea.replace(/\r/g, '').trim()
      if (!linea || linea.includes('Descripción técnica') || linea.includes('Total ')) return

      let descripcion = ''
      let precio = 0

      if (linea.startsWith('"')) {
        const semicolonIdx = linea.lastIndexOf(';')
        if (semicolonIdx > 0) {
          const closeQuoteIdx = semicolonIdx - 1
          if (closeQuoteIdx > 0 && linea[closeQuoteIdx] === '"') {
            const precioStr = linea.substring(semicolonIdx + 1).trim()
            if (!isNaN(parseFloat(precioStr))) {
              descripcion = linea.substring(1, closeQuoteIdx).trim()
              descripcion = descripcion.replace(/""/g, '"')
              precio = parseFloat(precioStr)
            }
          }
        }
      } else {
        const partes = linea.split(';')
        if (partes.length >= 2) {
          descripcion = partes[0].trim()
          precio = parseFloat(partes[1].trim())
        }
      }

      if (descripcion && !isNaN(precio) && precio > 0) {
        const descNorm = normalizarDescripcion(descripcion)
        preciosPorDescripcion[descNorm] = precio
      }
    })

    // Cargar materiales
    const csvContent = fs.readFileSync(csvPath, 'utf-8')
    const lineas = csvContent.split('\n').filter(l => l.trim())

    const familias: any[] = []
    let familiaActual: any = null
    let enHeaders = false

    for (const linea of lineas) {
      let descripcion = ''
      let cantidad = 0
      let presenteEn = ''

      if (linea.startsWith('"')) {
        const endQuote = linea.lastIndexOf('"')
        const content = linea.substring(0, endQuote + 1)
        const resto = linea.substring(endQuote + 2)

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

      if (!descripcion) continue

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
        enHeaders = false
      } else if (descripcion && cantidad === 0 && presenteEn === '') {
        if (familiaActual) familias.push(familiaActual)
        familiaActual = {
          nombre: descripcion,
          items: [],
        }
        enHeaders = false
      }
    }

    if (familiaActual) familias.push(familiaActual)

    // Crear workbook
    const workbook = new Workbook()
    const worksheet = workbook.addWorksheet('Cotización')

    // Encabezados principales
    worksheet.columns = [
      { header: 'Familia', key: 'familia', width: 35 },
      { header: 'Descripción técnica', key: 'descripcion', width: 50 },
      { header: 'Cantidad', key: 'cantidad', width: 12 },
      { header: 'Precio Unitario', key: 'precioUnit', width: 18 },
      { header: 'Costo Total', key: 'costo', width: 18 },
    ]

    // Estilo de encabezado
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1a1f35' } }

    // Agregar datos
    let rowNum = 2
    let costoTotal = 0

    familias.forEach(familia => {
      const totalFamilia = familia.items.reduce((s: number, i: any) => s + (i.costo || 0), 0)
      costoTotal += totalFamilia

      familia.items.forEach((item: any, idx: number) => {
        const row = worksheet.addRow({
          familia: idx === 0 ? familia.nombre : '',
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          precioUnit: item.precioUnit,
          costo: item.costo,
        })

        // Formatear números
        if (row.getCell('precioUnit')) row.getCell('precioUnit').numFmt = '$#,##0'
        if (row.getCell('costo')) row.getCell('costo').numFmt = '$#,##0'

        rowNum++
      })

      // Subtotal de familia
      const subtotalRow = worksheet.addRow({
        familia: '',
        descripcion: `Subtotal ${familia.nombre}`,
        cantidad: '',
        precioUnit: '',
        costo: totalFamilia,
      })
      subtotalRow.font = { bold: true }
      subtotalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8E8' } }
      if (subtotalRow.getCell('costo')) subtotalRow.getCell('costo').numFmt = '$#,##0'
      rowNum++
    })

    // Total general
    const totalRow = worksheet.addRow({
      familia: '',
      descripcion: 'COSTO TOTAL DEL PROYECTO',
      cantidad: '',
      precioUnit: '',
      costo: costoTotal,
    })
    totalRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1a1f35' } }
    if (totalRow.getCell('costo')) totalRow.getCell('costo').numFmt = '$#,##0'

    // Retornar archivo
    const buffer = await workbook.xlsx.writeBuffer()
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Cotizacion.xlsx"`,
      },
    })
  } catch (error: any) {
    console.error('[EXPORT_EXCEL] Error:', error.message)
    throw new HttpError(500, `Error al exportar: ${error.message}`)
  }
})
