'use client'

import { guardarBlob, TIPO_PARTIDA_LABEL } from '../../lib/cliente'
import { Calculo, Linea } from './tipos'

// Excel con tres hojas: materiales consolidados, detalle por poste y cotización.
export async function exportarExcel(linea: Linea, calculo: Calculo) {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()
  const encabezado = [
    [`Línea: ${linea.nombre}`], [`Operador: ${linea.operador} · Revisión ${linea.revision} · Estado: ${linea.estado}`],
    [`Postes: ${calculo.postes.total} (${calculo.postes.pendientes.length} pendientes) · Generado: ${new Date(calculo.generado).toLocaleString('es-CO')}`], [],
  ]

  const materiales = XLSX.utils.aoa_to_sheet([
    ...encabezado,
    ['Código', 'Material', 'Categoría', 'Unidad', 'Cantidad'],
    ...calculo.materiales.map((m) => [m.codigo, m.descripcion, m.categoria, m.unidad, m.cantidad]),
  ])
  materiales['!cols'] = [{ wch: 8 }, { wch: 70 }, { wch: 40 }, { wch: 8 }, { wch: 12 }]
  XLSX.utils.book_append_sheet(wb, materiales, 'Materiales')

  const detalle = XLSX.utils.aoa_to_sheet([
    ['Trayecto', 'Poste', 'Norma', 'Código', 'Material', 'Unidad', 'Cantidad'],
    ...calculo.materiales.flatMap((m) => m.detalle.map((d) => [d.trayecto ?? '', d.poste, d.norma, m.codigo, m.descripcion, m.unidad, d.cantidad])),
  ])
  detalle['!cols'] = [{ wch: 9 }, { wch: 14 }, { wch: 14 }, { wch: 8 }, { wch: 60 }, { wch: 8 }, { wch: 10 }]
  XLSX.utils.book_append_sheet(wb, detalle, 'Detalle por poste')

  const c = calculo.cotizacion
  const filas: (string | number | null)[][] = [...encabezado, ['Tipo', 'Código', 'Descripción', 'Unidad', 'Cantidad', 'Precio unitario (COP)', 'Subtotal (COP)', 'Fuente del precio']]
  for (const tipo of ['MATERIAL', 'MANO_OBRA', 'TRANSPORTE', 'INDIRECTO']) {
    const items = c.items.filter((i) => i.tipo === tipo)
    if (!items.length) continue
    items.forEach((i) => filas.push([TIPO_PARTIDA_LABEL[tipo], i.codigo, i.descripcion, i.unidad, i.cantidad, i.precioUnitario, i.subtotal, i.fuentePrecio]))
    filas.push(['', '', `Subtotal ${TIPO_PARTIDA_LABEL[tipo].toLowerCase()}`, '', '', '', c.subtotales[tipo], ''])
  }
  filas.push(['', '', c.sinPrecio.length ? 'TOTAL (parcial: hay partidas sin precio)' : 'TOTAL', '', '', '', c.total, ''])
  const cot = XLSX.utils.aoa_to_sheet(filas)
  cot['!cols'] = [{ wch: 14 }, { wch: 8 }, { wch: 60 }, { wch: 8 }, { wch: 10 }, { wch: 18 }, { wch: 18 }, { wch: 30 }]
  XLSX.utils.book_append_sheet(wb, cot, 'Cotización')

  const datos = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const nombre = `${linea.nombre.replace(/[^\w\-áéíóúñÁÉÍÓÚÑ ]+/g, '').trim().replace(/\s+/g, '_')}_rev${linea.revision}.xlsx`
  guardarBlob(new Blob([datos], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), nombre)
}
