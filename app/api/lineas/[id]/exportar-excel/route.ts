import { NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'
import * as XLSX from 'xlsx'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const projectRoot = process.cwd()
    const csvPath = path.join(projectRoot, 'public', 'materiales_normas_celsia.csv')

    if (!fs.existsSync(csvPath)) {
      throw new Error('Archivo de materiales no encontrado')
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

    // Crear datos para Excel
    const data: any[] = []
    data.push(['Familia', 'Descripción Técnica', 'Cantidad (ud)'])

    familias.forEach(familia => {
      familia.items.forEach((item: any, idx: number) => {
        data.push([
          idx === 0 ? familia.nombre : '',
          item.descripcion,
          item.cantidad,
        ])
      })

      // Subtotal
      const totalFamilia = familia.items.reduce((s: number, i: any) => s + (i.cantidad || 0), 0)
      data.push(['', `Subtotal ${familia.nombre}`, totalFamilia])
      data.push([]) // Fila vacía
    })

    // Total general
    const totalGeneral = familias.reduce((total, f) =>
      total + f.items.reduce((s: number, i: any) => s + (i.cantidad || 0), 0), 0
    )
    data.push(['', 'TOTAL DE MATERIALES', totalGeneral])

    // Crear workbook
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.aoa_to_sheet(data)

    // Establecer anchos de columna
    worksheet['!cols'] = [
      { wch: 35 },  // Familia
      { wch: 55 },  // Descripción
      { wch: 15 },  // Cantidad
    ]

    // Agregar estilos (color de encabezado)
    const headerCellStyle = {
      fill: { fgColor: { rgb: 'FF1a1f35' } },
      font: { color: { rgb: 'FFFFFFFF' }, bold: true },
      alignment: { horizontal: 'center', vertical: 'center' },
    }

    worksheet['A1'].s = headerCellStyle
    worksheet['B1'].s = headerCellStyle
    worksheet['C1'].s = headerCellStyle

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Cotización de Materiales')

    // Generar buffer
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' })

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=utf-8',
        'Content-Disposition': `attachment; filename="Cotizacion_Materiales_${params.id}.xlsx"`,
      },
    })
  } catch (error: any) {
    console.error('[EXPORT_EXCEL]', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
