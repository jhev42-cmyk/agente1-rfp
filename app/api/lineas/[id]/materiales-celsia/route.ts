import { NextResponse } from 'next/server'
import { HttpError, handler, parseId, requireUser } from '../../../../../lib/api'
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as csv from 'csv-parse/sync'

export const GET = handler(async (request, { params }: { params: { id: string } }) => {
  await requireUser(request)
  const id = parseId(params.id)

  try {
    const projectRoot = process.cwd()
    const scriptPath = path.join(projectRoot, 'demo_MediaTension.py')
    const csvPath = path.join(projectRoot, 'public', 'materiales_normas_celsia.csv')

    // Ejecutar el script Python
    console.log(`[MATERIALES] Ejecutando script: ${scriptPath}`)
    execSync(`python3 "${scriptPath}"`, {
      cwd: projectRoot,
      stdio: 'pipe',
      encoding: 'utf-8',
    })

    // Leer el CSV generado
    if (!fs.existsSync(csvPath)) {
      throw new Error('El script no generó el archivo CSV')
    }

    const csvContent = fs.readFileSync(csvPath, 'utf-8')
    const records = csv.parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    })

    console.log(`[MATERIALES] CSV generado con ${records.length} registros`)

    return NextResponse.json({
      success: true,
      cantidad: records.length,
      datos: records,
    })
  } catch (error: any) {
    console.error('[MATERIALES] Error:', error.message)
    throw new HttpError(500, `Error al generar materiales: ${error.message}`)
  }
})
