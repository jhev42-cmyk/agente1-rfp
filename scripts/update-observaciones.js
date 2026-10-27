// Actualizar observacion en ConfiguracionMaterial desde Excels CELSIA
const fs = require('fs')
const path = require('path')
const ExcelJS = require('exceljs')
const { PrismaClient } = require('@prisma/client')

// Mapeo de familia a código
const FAMILIA_MAP = {
  'Pos': '1-Pos', 'F.Po': '2-F.Po', 'Ais': '3-Ais',
  'Esp': '4-Esp', 'Cond': '5-Cond', 'Suj': '6-Suj',
  'Torni': '7-Torni', 'Cone': '8-Cone', 'P.Ele': '9-P.Ele',
  'Vien': '10-Vien'
}

const prisma = new PrismaClient()

async function main() {
  const normasDir = path.join(process.cwd(), 'NORMAS CELSIA')
  const files = fs.readdirSync(normasDir).filter(f => f.endsWith('.xlsx'))

  console.log(`\nLeyendo ${files.length} normas CELSIA...\n`)

  let actualizadas = 0

  for (const file of files) {
    const normaCodigo = file.replace('Celsia-', '').replace('.xlsx', '')

    try {
      // Leer norma del Excel
      const wb = new ExcelJS.Workbook()
      await wb.xlsx.readFile(path.join(normasDir, file))
      const ws = wb.worksheets[0]

      // Para cada material en el Excel
      let rowCount = 0
      for (let rowIdx = 8; rowIdx <= 100; rowIdx++) {
        const row = ws.getRow(rowIdx)
        const familia = row.getCell(1).value
        const descripcion = row.getCell(2).value

        if (!familia || !descripcion) break

        const codigo = FAMILIA_MAP[String(familia).trim()] || `X-${familia}`
        const desc = String(descripcion).trim()

        // Buscar el SIGUIENTE material en la BD con este código que tenga observacion vacía
        // o update el primero que encuentre
        const updated = await prisma.configuracionMaterial.updateMany({
          where: {
            codigoMaterial: codigo,
            configuracion: { norma: { codigo: normaCodigo } },
            observacion: { in: [null, 'Poste de concreto, fibra vidrio o metalico 10m /12m /14m /16m × 750kgf /1050kgf /2000kgf/3000kgf /4000kgf'] } // Fallback erróneo
          },
          data: { observacion: desc },
          take: 1
        })

        rowCount++
      }

      console.log(`✓ ${normaCodigo}: procesados ${rowCount} materiales`)
      actualizadas += rowCount

    } catch (e) {
      console.error(`✗ ${normaCodigo}: ${e.message}`)
    }
  }

  console.log(`\nTotal actualizado: ${actualizadas} registros`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
