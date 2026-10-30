import { NextResponse } from 'next/server'
import { HttpError, handler, parseId, requireUser } from '../../../../lib/api'
import * as fs from 'fs'
import * as path from 'path'
import * as csv from 'csv-parse/sync'

export const GET = handler(async (request, { params }: { params: { id: string } }) => {
  await requireUser(request)
  const id = parseId(params.id)

  try {
    const projectRoot = process.cwd()
    const csvPath = path.join(projectRoot, 'public', 'materiales_normas_celsia.csv')

    // Leer el CSV generado por GitHub Actions
    if (!fs.existsSync(csvPath)) {
      throw new HttpError(404, 'CSV de materiales no encontrado. Asegúrate de haber generado normas-seleccionadas.txt primero.')
    }

    const csvContent = fs.readFileSync(csvPath, 'utf-8')
    const records = csv.parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    })

    console.log(`[MATERIALES] CSV cargado con ${records.length} registros`)

    return NextResponse.json({
      success: true,
      cantidad: records.length,
      datos: records,
    })
  } catch (error: any) {
    console.error('[MATERIALES] Error:', error.message)
    if (error instanceof HttpError) throw error
    throw new HttpError(500, `Error al cargar materiales: ${error.message}`)
  }
})
