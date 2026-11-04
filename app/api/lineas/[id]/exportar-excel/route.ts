import { NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const projectRoot = process.cwd()
    const csvPath = path.join(projectRoot, 'public', 'materiales_normas_celsia.csv')

    if (!fs.existsSync(csvPath)) {
      throw new Error('Archivo de materiales no encontrado')
    }

    // Parser para materiales
    const normalizarDescripcion = (desc: string): string => {
      return desc.toLowerCase().trim().replace(/\s+kv/gi, 'kv').replace(/\s+/g, ' ')
    }

    // Cargar materiales
    const csvContent = fs.readFileSync(csvPath, 'utf-8')
    const lineas = csvContent.split('\n').filter(l => l.trim())

    const familias: any[] = []
    let familiaActual: any = null
    let enHeaders = false

    for (const linea of lineas) {
      let descripcion = ''
      let cantidad = 0

      if (linea.startsWith('"')) {
        const endQuote = linea.lastIndexOf('"')
        const content = linea.substring(0, endQuote + 1)
        const resto = linea.substring(endQuote + 2)

        descripcion = content.substring(1, content.length - 1).trim()
        const partes = resto.split(';').map(p => p.trim())
        cantidad = partes.length > 0 ? parseFloat(partes[0]) || 0 : 0
      } else {
        const partes = linea.split(';').map(p => p.trim().replace(/^"|"$/g, ''))
        descripcion = partes[0] || ''
        cantidad = partes.length > 1 ? parseFloat(partes[1]) || 0 : 0
      }

      if (!descripcion) continue

      if (descripcion === '' && cantidad === 0) {
        if (familiaActual) familias.push(familiaActual)
        familiaActual = null
        enHeaders = false
      } else if (descripcion === 'Descripción técnica' || descripcion === 'Descripción') {
        enHeaders = true
      } else if (enHeaders && descripcion && !descripcion.includes('Total')) {
        if (familiaActual) {
          familiaActual.items.push({
            descripcion,
            cantidad,
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
      } else if (descripcion && cantidad === 0) {
        if (familiaActual) familias.push(familiaActual)
        familiaActual = {
          nombre: descripcion,
          items: [],
        }
        enHeaders = false
      }
    }

    if (familiaActual) familias.push(familiaActual)

    // Generar Excel binario con exceljs
    const ExcelJS = (await import('exceljs')).default
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Cotización de Materiales')

    // Encabezado
    worksheet.columns = [
      { header: 'Familia', key: 'familia', width: 35 },
      { header: 'Descripción Técnica', key: 'descripcion', width: 55 },
      { header: 'Cantidad (ud)', key: 'cantidad', width: 15 },
    ]

    // Estilo de encabezado
    const headerRow = worksheet.getRow(1)
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 }
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1a1f35' } }
    headerRow.alignment = { horizontal: 'center', vertical: 'center' }

    // Agregar datos
    familias.forEach(familia => {
      familia.items.forEach((item: any, idx: number) => {
        const row = worksheet.addRow({
          familia: idx === 0 ? familia.nombre : '',
          descripcion: item.descripcion,
          cantidad: item.cantidad,
        })

        // Centrar cantidad
        row.getCell('cantidad').alignment = { horizontal: 'center' }
      })

      // Subtotal
      const subtotalRow = worksheet.addRow({
        familia: '',
        descripcion: `Subtotal ${familia.nombre}`,
        cantidad: familia.items.reduce((s: number, i: any) => s + (i.cantidad || 0), 0),
      })
      subtotalRow.font = { bold: true, size: 11 }
      subtotalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8E8' } }
      subtotalRow.getCell('cantidad').alignment = { horizontal: 'center' }
    })

    // Total general
    const totalRow = worksheet.addRow({
      familia: '',
      descripcion: 'TOTAL DE MATERIALES',
      cantidad: familias.reduce((total, f) => total + f.items.reduce((s: number, i: any) => s + (i.cantidad || 0), 0), 0),
    })
    totalRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 }
    totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1a1f35' } }
    totalRow.getCell('cantidad').alignment = { horizontal: 'center' }

    // Generar buffer
    const buffer = await workbook.xlsx.writeBuffer()

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Cotizacion_Materiales_${params.id}.xlsx"`,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
