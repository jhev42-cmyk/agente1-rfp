import { NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'
import * as XLSX from 'xlsx'
import { parseId } from '../../../../lib/api'

// Almacenamiento temporal en memoria (debe coincidir con materiales-cargados/route.ts)
const materialesCache = new Map<number, any[]>()

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const lineaId = parseId(params.id)
    const projectRoot = process.cwd()
    const templatePath = path.join(projectRoot, 'public', 'TemplateCotizacion.xlsx')

    if (!fs.existsSync(templatePath)) {
      throw new Error('Template de cotización no encontrado')
    }

    // Obtener materiales desde caché (guardados en Paso 4)
    let familias = materialesCache.get(lineaId)

    if (!familias) {
      throw new Error('No hay materiales cargados. Por favor, carga un archivo CSV en el Paso 4.')
    }

    // Cargar template
    const templateBuffer = fs.readFileSync(templatePath)
    const workbook = XLSX.read(templateBuffer, { type: 'buffer' })
    const worksheet = workbook.Sheets[workbook.SheetNames[0]]

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
