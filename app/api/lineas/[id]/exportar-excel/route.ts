import { NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'
import * as XLSX from 'xlsx'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const projectRoot = process.cwd()
    const csvPath = path.join(projectRoot, 'public', 'materiales_normas_celsia.csv')
    const templatePath = path.join(projectRoot, 'public', 'TemplateCotizacion.xlsx')

    if (!fs.existsSync(csvPath)) {
      throw new Error('Archivo de materiales no encontrado')
    }

    if (!fs.existsSync(templatePath)) {
      throw new Error('Template de cotización no encontrado')
    }

    // Cargar template
    const templateBuffer = fs.readFileSync(templatePath)
    const workbook = XLSX.read(templateBuffer, { type: 'buffer' })
    const worksheet = workbook.Sheets[workbook.SheetNames[0]]

    // Cargar materiales del CSV
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
        if (familiaActual) {
          familiaActual.items.push({
            descripcion,
            cantidad,
            presenteEn,
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

    // Llenar datos en el template a partir de fila 2
    let rowNum = 2
    familias.forEach(familia => {
      familia.items.forEach((item: any) => {
        // M: Familia
        worksheet[`M${rowNum}`] = { v: familia.nombre, t: 's' }
        // N: Descripción Técnica
        worksheet[`N${rowNum}`] = { v: item.descripcion, t: 's' }
        // O: Norma Aplicable
        worksheet[`O${rowNum}`] = { v: item.presenteEn || '', t: 's' }
        // P: Cantidad
        worksheet[`P${rowNum}`] = { v: item.cantidad, t: 'n' }
        rowNum++
      })
    })

    // Actualizar max_row en el worksheet
    worksheet['!ref'] = `A1:S${rowNum - 1}`

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
