// Script para importar descripciones de normas CELSIA directamente desde los Excels
const fs = require('fs')
const path = require('path')
const ExcelJS = require('exceljs')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const normasDir = path.join(process.cwd(), 'NORMAS CELSIA')
  const files = fs.readdirSync(normasDir).filter(f => f.endsWith('.xlsx'))
  
  console.log(`\nEncontrados ${files.length} Excels de normas CELSIA`)
  
  let actualizados = 0
  let procesados = 0
  
  for (const file of files.slice(0, 5)) { // Procesar primeros 5 como test
    const normaCodigo = file.replace('Celsia-', '').replace('.xlsx', '')
    console.log(`\nProcesando: ${normaCodigo}...`)
    
    try {
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.readFile(path.join(normasDir, file))
      const ws = workbook.worksheets[0]
      
      // Buscar materiales (empieza en fila 8, columnas: Familia(A), Descripción(B), Cantidad(C))
      let materialCount = 0
      for (let rowNum = 8; rowNum <= 100; rowNum++) {
        const row = ws.getRow(rowNum)
        const familia = row.getCell(1).value
        const descripcion = row.getCell(2).value
        const cantidad = row.getCell(3).value
        
        if (!familia || !descripcion) break
        
        materialCount++
        procesados++
        
        if (materialCount <= 3) {
          console.log(`  ${familia}: "${String(descripcion).substring(0, 60)}..."`);
        }
      }
      
      console.log(`  → ${materialCount} materiales encontrados`)
      
    } catch (e) {
      console.error(`  ✗ Error: ${e.message}`)
    }
  }
  
  console.log(`\nProcesados: ${procesados} materiales de ${files.length} normas`)
}

main().finally(() => prisma.$disconnect())
