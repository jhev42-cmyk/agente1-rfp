import { randomUUID } from 'crypto'
import { prisma } from './db'
import { HttpError, requireMotivo } from './api'

export const MAX_IMAGEN_BYTES = 2 * 1024 * 1024
export const TIPOS_IMAGEN = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']

export async function listarNormas(operador?: string) {
  const normas = await prisma.norma.findMany({
    where: operador ? { operador } : {},
    orderBy: [{ operador: 'asc' }, { codigo: 'asc' }, { version: 'desc' }],
    select: {
      id: true, operador: true, codigo: true, version: true, tipoPoste: true, descripcion: true, vigente: true,
      imagenTipo: true, creadoPor: true, motivo: true, createdAt: true,
      configuraciones: { orderBy: { orden: 'asc' }, select: { id: true, nombre: true, _count: { select: { materiales: true } } } },
    },
  })
  return normas.map(({ imagenTipo, ...n }) => ({ ...n, tieneImagen: !!imagenTipo }))
}

export async function detalleNorma(id: number) {
  const norma = await prisma.norma.findUnique({
    where: { id },
    select: {
      id: true, operador: true, codigo: true, version: true, tipoPoste: true, descripcion: true, vigente: true,
      imagenTipo: true, creadoPor: true, motivo: true, createdAt: true,
      configuraciones: { orderBy: { orden: 'asc' }, include: { materiales: { orderBy: { id: 'asc' } } } },
    },
  })
  if (!norma) throw new HttpError(404, 'Norma no encontrada')
  const codigos = [...new Set(norma.configuraciones.flatMap((c) => c.materiales.map((m) => m.codigoMaterial)))]
  const mats = await prisma.material.findMany({ where: { codigo: { in: codigos } } })
  const porCodigo = new Map(mats.map((m) => [m.codigo, m]))
  const { imagenTipo, ...resto } = norma
  return {
    ...resto,
    tieneImagen: !!imagenTipo,
    configuraciones: norma.configuraciones.map((c) => ({
      id: c.id, nombre: c.nombre,
      materiales: c.materiales.map((m) => ({
        codigoMaterial: m.codigoMaterial, cantidad: m.cantidad, observacion: m.observacion,
        descripcion: porCodigo.get(m.codigoMaterial)?.descripcion || m.codigoMaterial,
        unidad: porCodigo.get(m.codigoMaterial)?.unidad || '',
      })),
    })),
  }
}

type ConfigInput = { nombre?: string; materiales?: { codigoMaterial?: string; cantidad?: number; observacion?: string | null }[] }

// Crea la versión siguiente de una norma. La versión anterior queda intacta (no vigente) para que
// los postes y cotizaciones que la usan conserven sus materiales.
export async function nuevaVersionNorma(
  normaId: number,
  input: { tipoPoste?: string; descripcion?: string; configuraciones?: ConfigInput[]; motivo?: string },
  usuario: string
) {
  const motivo = requireMotivo(input.motivo)
  const configuraciones = input.configuraciones || []
  if (!configuraciones.length) throw new HttpError(400, 'La norma debe tener al menos una configuración')
  const materiales = await prisma.material.findMany({ select: { codigo: true } })
  const validos = new Set(materiales.map((m) => m.codigo))
  const limpias = configuraciones.map((c, i) => {
    const nombre = (c.nombre || '').trim() || `Configuración ${i + 1}`
    const mats = (c.materiales || []).filter((m) => Number(m.cantidad) > 0).map((m) => {
      const codigo = String(m.codigoMaterial || '').trim()
      if (!validos.has(codigo)) throw new HttpError(400, `Material ${codigo || '(vacío)'} no existe en el catálogo`)
      return { codigoMaterial: codigo, cantidad: Number(m.cantidad), observacion: m.observacion || null }
    })
    if (!mats.length) throw new HttpError(400, `La configuración "${nombre}" no tiene materiales`)
    return { nombre, orden: i, materiales: { create: mats } }
  })

  return prisma.$transaction(async (tx) => {
    const actual = await tx.norma.findUnique({ where: { id: normaId } })
    if (!actual) throw new HttpError(404, 'Norma no encontrada')
    if (!actual.vigente) throw new HttpError(409, 'Solo se versiona la versión vigente de la norma')
    const r = await tx.norma.updateMany({ where: { id: normaId, vigente: true }, data: { vigente: false } })
    if (!r.count) throw new HttpError(409, 'La norma cambió mientras tanto; recarga la página')
    const nueva = await tx.norma.create({
      data: {
        operador: actual.operador, codigo: actual.codigo, version: actual.version + 1,
        tipoPoste: input.tipoPoste?.trim() || actual.tipoPoste,
        descripcion: input.descripcion?.trim() || actual.descripcion,
        imagen: actual.imagen, imagenTipo: actual.imagenTipo,
        creadoPor: usuario, motivo,
        configuraciones: { create: limpias },
      },
    })
    await tx.auditoria.create({
      data: {
        entidad: 'norma', entidadId: `${actual.operador} ${actual.codigo}`, accion: 'nueva_version',
        valorAnterior: `v${actual.version}`, valorNuevo: `v${nueva.version}`, motivo, usuario,
      },
    })
    return nueva
  })
}

export async function guardarImagenNorma(normaId: number, archivo: File, motivoIn: unknown, usuario: string) {
  const motivo = requireMotivo(motivoIn)
  if (!TIPOS_IMAGEN.includes(archivo.type)) throw new HttpError(400, 'Formato no admitido (PNG, JPG, WEBP o SVG)')
  if (archivo.size > MAX_IMAGEN_BYTES) throw new HttpError(400, 'La imagen supera 2 MB')
  const norma = await prisma.norma.findUnique({ where: { id: normaId } })
  if (!norma) throw new HttpError(404, 'Norma no encontrada')
  const datos = Buffer.from(await archivo.arrayBuffer())
  await prisma.$transaction([
    prisma.norma.update({ where: { id: normaId }, data: { imagen: datos, imagenTipo: archivo.type } }),
    prisma.auditoria.create({
      data: {
        entidad: 'norma', entidadId: `${norma.operador} ${norma.codigo}`, accion: 'imagen',
        valorAnterior: norma.imagenTipo ? 'con esquema' : 'sin esquema', valorNuevo: `v${norma.version}: ${archivo.name}`, motivo, usuario,
      },
    }),
  ])
}

export async function listarMateriales() {
  const [materiales, precios] = await Promise.all([
    prisma.material.findMany(),
    prisma.precio.findMany({ distinct: ['codigoMaterial'], orderBy: [{ codigoMaterial: 'asc' }, { createdAt: 'desc' }, { id: 'desc' }] }),
  ])
  const porCodigo = new Map(precios.map((p) => [p.codigoMaterial, p]))
  return materiales
    .sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true }))
    .map((m) => {
      const p = porCodigo.get(m.codigo)
      return { ...m, precio: p ? { valor: p.precioUnitario, proveedor: p.proveedor, lote: p.lote, fecha: p.createdAt, importadoPor: p.importadoPor } : null }
    })
}

// Importa una lista de precios (ya leída del Excel/CSV en el navegador). Si alguna fila es inválida
// no se importa nada y se devuelven los errores por fila.
export async function importarPrecios(
  input: { filas?: { codigo?: unknown; precio?: unknown; proveedor?: unknown }[]; motivo?: string },
  usuario: string
) {
  const motivo = requireMotivo(input.motivo)
  const filas = input.filas || []
  if (!filas.length) throw new HttpError(400, 'El archivo no tiene filas de precios')
  if (filas.length > 5000) throw new HttpError(400, 'Máximo 5000 filas por importación')
  const validos = new Set((await prisma.material.findMany({ select: { codigo: true } })).map((m) => m.codigo))

  const errores: string[] = []
  const vistos = new Set<string>()
  const datos = filas.map((f, i) => {
    const codigo = String(f.codigo ?? '').trim()
    const precio = typeof f.precio === 'number' ? f.precio : Number(String(f.precio ?? '').replace(/[$\s]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'))
    if (!validos.has(codigo)) errores.push(`Fila ${i + 2}: el código "${codigo}" no existe en el catálogo`)
    else if (!(precio > 0)) errores.push(`Fila ${i + 2}: precio inválido para ${codigo}`)
    else if (vistos.has(codigo)) errores.push(`Fila ${i + 2}: el código ${codigo} está repetido`)
    vistos.add(codigo)
    const proveedor = String(f.proveedor ?? '').trim() || null
    return { codigoMaterial: codigo, precioUnitario: precio, proveedor }
  })
  if (errores.length) throw new HttpError(400, 'El archivo tiene errores; no se importó nada', { errores })

  const lote = `${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '')}-${randomUUID().slice(0, 4)}`
  await prisma.$transaction([
    prisma.precio.createMany({ data: datos.map((d) => ({ ...d, lote, importadoPor: usuario, motivo })) }),
    prisma.auditoria.create({
      data: { entidad: 'precio', entidadId: lote, accion: 'importar', valorNuevo: `${datos.length} precios`, motivo, usuario },
    }),
  ])
  return { lote, importados: datos.length }
}
