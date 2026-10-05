// Carga el catálogo inicial (prisma/catalogo-inicial.json). Es idempotente: no duplica normas
// ni toca versiones existentes. Uso: node prisma/seed.js (con DATABASE_URL en el entorno).
const { PrismaClient } = require('@prisma/client')
const catalogo = require('./catalogo-inicial.json')

const prisma = new PrismaClient()

async function main() {
  for (const m of catalogo.materiales) {
    await prisma.material.upsert({ where: { codigo: m.codigo }, update: {}, create: m })
  }

  let creadas = 0
  for (const n of catalogo.normas) {
    const existe = await prisma.norma.findFirst({ where: { operador: n.operador, codigo: n.codigo } })
    if (existe) continue
    await prisma.norma.create({
      data: {
        operador: n.operador,
        codigo: n.codigo,
        version: 1,
        tipoPoste: n.tipoPoste,
        descripcion: n.descripcion,
        creadoPor: 'sistema',
        motivo: 'Carga inicial desde consolidado maestro de líneas',
        configuraciones: {
          create: n.configuraciones.map((c, i) => ({
            nombre: c.nombre,
            orden: i,
            materiales: { create: c.materiales },
          })),
        },
      },
    })
    creadas++
  }
  console.log(`Materiales: ${catalogo.materiales.length}. Normas nuevas: ${creadas}.`)
}

main().finally(() => prisma.$disconnect())
