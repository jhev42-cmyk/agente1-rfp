// Carga el catálogo inicial (prisma/catalogo-inicial.json). Es idempotente: no duplica normas
// ni toca versiones existentes. Uso: node prisma/seed.js (con DATABASE_URL en el entorno).
const { PrismaClient } = require('@prisma/client')
const catalogo = require('./catalogo-inicial.json')

const prisma = new PrismaClient()

async function main() {
  // Crear mapa de descripciones del catálogo: para cada código, guardar lista de descripciones
  const descripciones = {}
  for (const m of catalogo.materiales) {
    if (!descripciones[m.codigo]) {
      descripciones[m.codigo] = []
    }
    descripciones[m.codigo].push(m.descripcion)
  }

  for (const m of catalogo.materiales) {
    await prisma.material.upsert({ where: { codigo: m.codigo }, update: {}, create: m })
  }

  let creadas = 0
  let actualizadas = 0
  for (const n of catalogo.normas) {
    const existe = await prisma.norma.findFirst({ where: { operador: n.operador, codigo: n.codigo } })
    if (existe) {
      // Actualizar observacion de materiales existentes si está vacío
      for (const c of n.configuraciones) {
        for (let idx = 0; idx < c.materiales.length; idx++) {
          const mat = c.materiales[idx]
          await prisma.configuracionMaterial.updateMany({
            where: {
              configuracion: { normaId: existe.id },
              codigoMaterial: mat.codigoMaterial,
              observacion: null
            },
            data: {
              observacion: descripciones[mat.codigoMaterial]?.[idx] || mat.codigoMaterial
            }
          })
        }
      }
      actualizadas++
      continue
    }
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
            materiales: {
              create: c.materiales.map((mat, idx) => ({
                codigoMaterial: mat.codigoMaterial,
                cantidad: mat.cantidad,
                observacion: descripciones[mat.codigoMaterial]?.[idx] || mat.codigoMaterial,
              }))
            },
          })),
        },
      },
    })
    creadas++
  }
  console.log(`Materiales: ${catalogo.materiales.length}. Normas nuevas: ${creadas}. Normas actualizadas: ${actualizadas}.`)
}

main().finally(() => prisma.$disconnect())
