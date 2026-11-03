import { NextResponse } from 'next/server'
import { handler, parseId, requireUser, HttpError } from '../../../lib/api'
import * as fs from 'fs'
import * as path from 'path'

const ExcelJS = require('exceljs')

export const GET = handler(async (request, { params }: { params: { id: string } }) => {
  await requireUser(request)
  const id = parseId(params.id)

  try {
    // Aquí podrías cargar los datos de la API interna
    // Por ahora, retornamos un archivo Excel básico
    // En una implementación real, cargarías los datos de materiales-con-precios

    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Cotización')

    // Encabezados
    worksheet.columns = [
      { header: 'Familia', key: 'familia', width: 30 },
      { header: 'Descripción', key: 'descripcion', width: 50 },
      { header: 'Cantidad', key: 'cantidad', width: 12 },
      { header: 'Precio Unitario', key: 'precioUnit', width: 18 },
      { header: 'Costo Total', key: 'costo', width: 18 },
    ]

    // Estilo de encabezado
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1a1f35' } }

    // Aquí se agregarían las filas de datos
    worksheet.addRow({
      familia: 'Datos cargados dinámicamente',
      descripcion: 'Por favor refresca la página',
      cantidad: 0,
      precioUnit: 0,
      costo: 0,
    })

    // Retornar archivo
    const buffer = await workbook.xlsx.writeBuffer()
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Cotizacion_Linea_${id}.xlsx"`,
      },
    })
  } catch (error: any) {
    console.error('[EXPORT_EXCEL] Error:', error.message)
    throw new HttpError(500, `Error al exportar Excel: ${error.message}`)
  }
})
