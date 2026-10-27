import { randomUUID } from 'crypto'
import { EstadoLinea, ModoAsignacion, Prisma, TipoPartida } from '@prisma/client'
import { prisma } from './db'
import { HttpError, requireMotivo } from './api'
import * as fs from 'fs'
import * as path from 'path'

export const NUM_TRAYECTOS = 10
export const MAX_POSTES_TRAYECTO = 999
export const OPERADORES = ['CELSIA']

export function codigoPoste(trayecto: number, numero: number) {
  return `T${String(trayecto).padStart(2, '0')}-P${String(numero).padStart(3, '0')}`
}

type Tx = Prisma.TransactionClient

function auditar(tx: Tx, data: {
  lineaId?: number; entidad: string; entidadId: string | number; accion: string
  valorAnterior?: unknown; valorNuevo?: unknown; motivo: string; usuario: string
}) {
  const txt = (v: unknown) => (v === undefined || v === null ? null : typeof v === 'string' ? v : JSON.stringify(v))
  return tx.auditoria.create({
    data: { ...data, entidadId: String(data.entidadId), valorAnterior: txt(data.valorAnterior), valorNuevo: txt(data.valorNuevo) },
  })
}

export async function lineaEditable(tx: Tx, lineaId: number) {
  const linea = await tx.linea.findUnique({ where: { id: lineaId } })
  if (!linea) throw new HttpError(404, 'Línea no encontrada')
  if (linea.estado !== EstadoLinea.BORRADOR) {
    throw new HttpError(409, 'La línea no está en borrador. Devuélvela a borrador o crea una nueva revisión para modificarla.')
  }
  return linea
}

// ─── Línea ───────────────────────────────────────────────────────────────────

export async function crearLinea(input: { nombre?: string; longitudKm?: number; operador?: string }, usuario: string) {
  const nombre = (input.nombre || '').trim()
  const longitudKm = Number(input.longitudKm)
  if (!nombre) throw new HttpError(400, 'Indica el nombre de la línea')
  if (!(longitudKm > 0)) throw new HttpError(400, 'La longitud debe ser mayor que cero')
  if (!OPERADORES.includes(input.operador || '')) throw new HttpError(400, 'Selecciona el operador de red')

  return prisma.$transaction(async (tx) => {
    const linea = await tx.linea.create({
      data: {
        grupo: randomUUID(), nombre, longitudKm, operador: input.operador!, creadoPor: usuario,
        trayectos: { create: Array.from({ length: NUM_TRAYECTOS }, (_, i) => ({ numero: i + 1 })) },
      },
    })
    await auditar(tx, { lineaId: linea.id, entidad: 'linea', entidadId: linea.id, accion: 'crear', valorNuevo: { nombre, longitudKm, operador: linea.operador }, motivo: 'Registro de la línea', usuario })
    return linea
  })
}

export async function editarLinea(lineaId: number, input: { nombre?: string; longitudKm?: number; motivo?: string }, usuario: string) {
  const motivo = requireMotivo(input.motivo)
  return prisma.$transaction(async (tx) => {
    const linea = await lineaEditable(tx, lineaId)
    const cambios: { nombre?: string; longitudKm?: number } = {}
    if (input.nombre !== undefined && input.nombre.trim() && input.nombre.trim() !== linea.nombre) cambios.nombre = input.nombre.trim()
    if (input.longitudKm !== undefined) {
      const km = Number(input.longitudKm)
      if (!(km > 0)) throw new HttpError(400, 'La longitud debe ser mayor que cero')
      if (km !== linea.longitudKm) cambios.longitudKm = km
    }
    if (!Object.keys(cambios).length) return linea
    const anterior = Object.fromEntries(Object.keys(cambios).map((k) => [k, linea[k as keyof typeof cambios]]))
    await auditar(tx, { lineaId, entidad: 'linea', entidadId: lineaId, accion: 'editar', valorAnterior: anterior, valorNuevo: cambios, motivo, usuario })
    return tx.linea.update({ where: { id: lineaId }, data: cambios })
  })
}

// Preferencia de trabajo para el paso 3; no cambia materiales ni costos, por eso no exige motivo.
export async function elegirModoAsignacion(lineaId: number, modo: unknown, usuario: string) {
  if (!Object.values(ModoAsignacion).includes(modo as ModoAsignacion)) throw new HttpError(400, 'Modo de asignación inválido')
  return prisma.$transaction(async (tx) => {
    const linea = await lineaEditable(tx, lineaId)
    if (linea.modoAsignacion === modo) return linea
    await auditar(tx, {
      lineaId, entidad: 'linea', entidadId: lineaId, accion: 'modo_asignacion',
      valorAnterior: linea.modoAsignacion, valorNuevo: modo, motivo: 'Preferencia de asignación de normas', usuario,
    })
    return tx.linea.update({ where: { id: lineaId }, data: { modoAsignacion: modo as ModoAsignacion } })
  })
}

// ─── Trayectos ───────────────────────────────────────────────────────────────

export async function ajustarTrayecto(
  lineaId: number, numero: number,
  input: { cantidad?: number; motivo?: string; confirmar?: boolean }, usuario: string
) {
  const cantidad = Number(input.cantidad)
  if (!Number.isInteger(cantidad) || cantidad < 0 || cantidad > MAX_POSTES_TRAYECTO) {
    throw new HttpError(400, `La cantidad de postes debe ser un entero entre 0 y ${MAX_POSTES_TRAYECTO}`)
  }
  return prisma.$transaction(async (tx) => {
    await lineaEditable(tx, lineaId)
    // Bloquea la fila del trayecto hasta terminar la transacción (un UPDATE sin cambios toma el bloqueo
    // de fila): si dos usuarios cambian el mismo trayecto a la vez, el segundo espera y recibe la
    // cantidad ya actualizada, así no se generan postes con número repetido.
    const trayecto = await tx.trayecto.update({
      where: { lineaId_numero: { lineaId, numero } }, data: { cantidadPostes: { increment: 0 } },
    }).catch((e) => {
      // Solo "no existe" se traduce a 404; cualquier otro error (tiempo agotado, conexión) se propaga.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') throw new HttpError(404, 'Trayecto no encontrado')
      throw e
    })
    const actual = trayecto.cantidadPostes
    if (cantidad === actual) return { trayecto, retirados: [] as string[] }
    const motivo = actual === 0 ? (input.motivo?.trim() || 'Definición inicial de postes') : requireMotivo(input.motivo)

    let retirados: string[] = []
    if (cantidad > actual) {
      await tx.poste.createMany({
        data: Array.from({ length: cantidad - actual }, (_, i) => ({
          lineaId, trayectoId: trayecto.id, numero: actual + i + 1, codigo: codigoPoste(numero, actual + i + 1),
        })),
      })
    } else {
      const sobrantes = await tx.poste.findMany({
        where: { trayectoId: trayecto.id, numero: { gt: cantidad } }, orderBy: { numero: 'asc' },
        include: { normas: { select: { norma: { select: { codigo: true, version: true } } } } },
      })
      const configurados = sobrantes.filter((p) => p.normas.length > 0)
      if (configurados.length && !input.confirmar) {
        throw new HttpError(409, `Se retirarían ${configurados.length} poste(s) ya configurado(s). Confirma para continuar.`, {
          afectados: configurados.map((p) => {
            const norma = p.normas[0]?.norma
            return { codigo: p.codigo, norma: norma ? `${norma.codigo} v${norma.version}` : null }
          }),
        })
      }
      retirados = sobrantes.map((p) => p.codigo)
      await tx.poste.deleteMany({ where: { id: { in: sobrantes.map((p) => p.id) } } })
    }
    const actualizado = await tx.trayecto.update({ where: { id: trayecto.id }, data: { cantidadPostes: cantidad } })
    await auditar(tx, {
      lineaId, entidad: 'trayecto', entidadId: numero, accion: 'cantidad_postes',
      valorAnterior: actual, valorNuevo: retirados.length ? { cantidad, retirados } : cantidad, motivo, usuario,
    })
    return { trayecto: actualizado, retirados }
  })
}

// ─── Postes ──────────────────────────────────────────────────────────────────

export async function asignarNorma(
  lineaId: number,
  input: { posteIds?: number[]; normaId?: number | null; configuracionId?: number | null; motivo?: string },
  usuario: string
) {
  const posteIds = (input.posteIds || []).map(Number).filter((n) => Number.isInteger(n))
  if (!posteIds.length) throw new HttpError(400, 'Selecciona al menos un poste')

  return prisma.$transaction(async (tx) => {
    const linea = await lineaEditable(tx, lineaId)
    let normaId: number | null = null
    let configuracionId: number | null = null
    let etiqueta: string | null = null

    if (input.normaId) {
      const norma = await tx.norma.findUnique({ where: { id: Number(input.normaId) }, include: { configuraciones: true } })
      if (!norma || norma.operador !== linea.operador) throw new HttpError(400, 'La norma no pertenece al operador de la línea')
      normaId = norma.id
      if (input.configuracionId) {
        const conf = norma.configuraciones.find((c) => c.id === Number(input.configuracionId))
        if (!conf) throw new HttpError(400, 'La configuración no pertenece a la norma')
        configuracionId = conf.id
      } else if (norma.configuraciones.length === 1) {
        configuracionId = norma.configuraciones[0].id
      }
      const conf = norma.configuraciones.find((c) => c.id === configuracionId)
      etiqueta = `${norma.codigo} v${norma.version}${conf ? ` · ${conf.nombre}` : ' · configuración pendiente'}`
    }

    const postes = await tx.poste.findMany({
      where: { id: { in: posteIds }, lineaId },
      include: {
        normas: {
          include: { norma: { select: { codigo: true, version: true } }, configuracion: { select: { nombre: true } } },
        },
      },
    })
    if (postes.length !== posteIds.length) throw new HttpError(400, 'Algún poste no pertenece a la línea')

    // Detectar cambios: obtener norma seleccionada actual (o la primera)
    const cambian = postes.filter((p) => {
      const actual = p.normas.find((pn) => pn.seleccionada) || p.normas[0]
      return !actual || actual.normaId !== normaId || actual.configuracionId !== configuracionId
    })

    if (!cambian.length) return { actualizados: 0 }

    const modificaConfigurados = cambian.some((p) => p.normas.length > 0)
    const motivo = modificaConfigurados ? requireMotivo(input.motivo) : (input.motivo?.trim() || 'Configuración inicial')

    // Actualizar o crear PosteNorma para cada poste que cambia
    for (const poste of cambian) {
      if (normaId) {
        // Crear o actualizar la relación PosteNorma, marcándola como seleccionada
        await tx.posteNorma.upsert({
          where: { posteId_normaId: { posteId: poste.id, normaId } },
          create: { posteId: poste.id, normaId, configuracionId, seleccionada: true },
          update: { configuracionId, seleccionada: true },
        })
        // Deseleccionar las demás
        await tx.posteNorma.updateMany({
          where: { posteId: poste.id, normaId: { not: normaId } },
          data: { seleccionada: false },
        })
      } else {
        // Si se asigna null, solo marcar todas como no seleccionadas
        await tx.posteNorma.updateMany({
          where: { posteId: poste.id },
          data: { seleccionada: false },
        })
      }
    }

    // Auditoría
    await tx.auditoria.createMany({
      data: cambian.map((p) => {
        const actual = p.normas.find((pn) => pn.seleccionada) || p.normas[0]
        return {
          lineaId,
          entidad: 'poste',
          entidadId: p.codigo,
          accion: 'norma',
          valorAnterior: actual ? `${actual.norma.codigo} v${actual.norma.version}${actual.configuracion ? ` · ${actual.configuracion.nombre}` : ''}` : null,
          valorNuevo: etiqueta,
          motivo,
          usuario,
        }
      }),
    })
    return { actualizados: cambian.length }
  })
}

// ─── Partidas generales ──────────────────────────────────────────────────────

const TIPOS_PARTIDA = Object.values(TipoPartida)

export async function crearPartida(lineaId: number, input: Record<string, unknown>, usuario: string) {
  const tipo = String(input.tipo) as TipoPartida
  if (!TIPOS_PARTIDA.includes(tipo)) throw new HttpError(400, 'Tipo de partida inválido')
  const cantidad = Number(input.cantidad)
  if (!(cantidad > 0)) throw new HttpError(400, 'La cantidad debe ser mayor que cero')

  return prisma.$transaction(async (tx) => {
    await lineaEditable(tx, lineaId)
    let data: Prisma.PartidaUncheckedCreateInput
    if (tipo === TipoPartida.MATERIAL) {
      const material = await tx.material.findUnique({ where: { codigo: String(input.codigoMaterial || '') } })
      if (!material) throw new HttpError(400, 'Selecciona un material del catálogo')
      data = { lineaId, tipo, codigoMaterial: material.codigo, descripcion: material.descripcion, unidad: material.unidad, cantidad }
    } else {
      const descripcion = String(input.descripcion || '').trim()
      const unidad = String(input.unidad || '').trim() || 'GLB'
      const precio = Number(input.precioUnitario)
      if (!descripcion) throw new HttpError(400, 'Indica la descripción de la partida')
      if (!(precio >= 0)) throw new HttpError(400, 'Indica el precio unitario')
      data = { lineaId, tipo, descripcion, unidad, cantidad, precioUnitario: precio }
    }
    const partida = await tx.partida.create({ data })
    await auditar(tx, { lineaId, entidad: 'partida', entidadId: partida.id, accion: 'crear', valorNuevo: data, motivo: String(input.motivo || '').trim() || 'Nueva partida', usuario })
    return partida
  })
}

export async function editarPartida(lineaId: number, partidaId: number, input: Record<string, unknown>, usuario: string) {
  const motivo = requireMotivo(input.motivo)
  return prisma.$transaction(async (tx) => {
    await lineaEditable(tx, lineaId)
    const partida = await tx.partida.findFirst({ where: { id: partidaId, lineaId } })
    if (!partida) throw new HttpError(404, 'Partida no encontrada')
    const cambios: Prisma.PartidaUpdateInput = {}
    if (input.cantidad !== undefined) {
      const c = Number(input.cantidad)
      if (!(c > 0)) throw new HttpError(400, 'La cantidad debe ser mayor que cero')
      cambios.cantidad = c
    }
    if (partida.tipo !== TipoPartida.MATERIAL) {
      if (input.precioUnitario !== undefined) {
        const p = Number(input.precioUnitario)
        if (!(p >= 0)) throw new HttpError(400, 'Precio inválido')
        cambios.precioUnitario = p
      }
      if (typeof input.descripcion === 'string' && input.descripcion.trim()) cambios.descripcion = input.descripcion.trim()
      if (typeof input.unidad === 'string' && input.unidad.trim()) cambios.unidad = input.unidad.trim()
    }
    const anterior = Object.fromEntries(Object.keys(cambios).map((k) => [k, partida[k as keyof typeof partida]]))
    await auditar(tx, { lineaId, entidad: 'partida', entidadId: partidaId, accion: 'editar', valorAnterior: anterior, valorNuevo: cambios, motivo, usuario })
    return tx.partida.update({ where: { id: partidaId }, data: cambios })
  })
}

export async function eliminarPartida(lineaId: number, partidaId: number, motivoIn: unknown, usuario: string) {
  const motivo = requireMotivo(motivoIn)
  return prisma.$transaction(async (tx) => {
    await lineaEditable(tx, lineaId)
    const partida = await tx.partida.findFirst({ where: { id: partidaId, lineaId } })
    if (!partida) throw new HttpError(404, 'Partida no encontrada')
    await tx.partida.delete({ where: { id: partidaId } })
    await auditar(tx, { lineaId, entidad: 'partida', entidadId: partidaId, accion: 'eliminar', valorAnterior: partida, motivo, usuario })
  })
}

// ─── Cálculo de materiales y cotización ──────────────────────────────────────

export type DetalleMaterial = { trayecto: number | null; poste: string; norma: string; cantidad: number }
export type MaterialConsolidado = {
  codigo: string; descripcion: string; unidad: string; categoria: string; cantidad: number; detalle: DetalleMaterial[]
}
export type ItemCotizacion = {
  tipo: TipoPartida; codigo: string | null; descripcion: string; unidad: string; cantidad: number
  precioUnitario: number | null; subtotal: number | null; fuentePrecio: string | null; partidaId?: number
}
export type Calculo = {
  generado: string
  postes: { total: number; configurados: number; pendientes: string[] }
  normasUsadas: { normaId: number; operador: string; codigo: string; version: number; tipoPoste: string; vigente: boolean; postes: number }[]
  materiales: MaterialConsolidado[]
  desglocePoFamilia?: DesglocePoFamilia[]
  cotizacion: {
    items: ItemCotizacion[]
    subtotales: Record<TipoPartida, number>
    total: number
    sinPrecio: string[]
  }
}


// Estructura para desgloce de materiales por familia
export type MaterialPorFamilia = {
  codigo: string
  descripcion: string
  cantidad: number
  presenteEn: { norma: string; postes: string[] }[]
}

export type DesglocePoFamilia = {
  familia: string
  familiaDescripcion: string
  itemsUnicos: number
  unidadesTotales: number
  materiales: MaterialPorFamilia[]
}


export async function preciosVigentes() {
  const filas = await prisma.precio.findMany({
    distinct: ['codigoMaterial'], orderBy: [{ codigoMaterial: 'asc' }, { createdAt: 'desc' }, { id: 'desc' }],
  })
  return new Map(filas.map((p) => [p.codigoMaterial, p]))
}


function generarDesglocePoFamilia(materiales: MaterialConsolidado[]): DesglocePoFamilia[] {
  const FAMILIA_MAP: Record<string, { numero: number; descripcion: string }> = {
    '1-Pos': { numero: 1, descripcion: 'Estructura de soporte principal' },
    '2-F.Po': { numero: 2, descripcion: 'Fijación al poste' },
    '3-Ais': { numero: 3, descripcion: 'Aisladores' },
    '4-Esp': { numero: 4, descripcion: 'Espaciamiento de red compacta' },
    '5-Cond': { numero: 5, descripcion: 'Conductores y cableado' },
    '6-Suj': { numero: 6, descripcion: 'Sujeción y amarre del conductor' },
    '7-Torni': { numero: 7, descripcion: 'Tornillería y herrajes de unión' },
    '8-Cone': { numero: 8, descripcion: 'Conectores y empalmes eléctricos' },
    '9-P.Ele': { numero: 9, descripcion: 'Protección eléctrica y puesta a tierra' },
    '10-Vien': { numero: 10, descripcion: 'Anclaje y retención mecánica' },
  }

  // Cargar la regla (mapeo de familias a elementos)
  let regla: Record<string, Array<{ elemento: string }>> = {}
  try {
    const rutaRegla = path.join(process.cwd(), 'regla_elementos.json')
    if (fs.existsSync(rutaRegla)) {
      const contenido = fs.readFileSync(rutaRegla, 'utf-8')
      regla = JSON.parse(contenido)
    }
  } catch (e) {
    console.error('Error al cargar regla_elementos.json:', e)
  }

  // Función para calcular similitud entre dos strings
  function calcularSimilitud(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().trim()
    const s2 = str2.toLowerCase().trim()

    // Si son exactamente iguales, retorna 1
    if (s1 === s2) return 1

    // Dividir en palabras y buscar coincidencias
    const palabras1 = s1.split(/\s+/).filter(p => p.length > 2)
    const palabras2 = s2.split(/\s+/).filter(p => p.length > 2)

    if (palabras1.length === 0 || palabras2.length === 0) return 0

    let coincidencias = 0
    for (const p1 of palabras1) {
      for (const p2 of palabras2) {
        if (p1.includes(p2) || p2.includes(p1)) {
          coincidencias++
          break
        }
      }
    }

    return coincidencias / Math.max(palabras1.length, palabras2.length)
  }

  const desgloce: DesglocePoFamilia[] = []

  // Iterar por cada familia en orden
  for (const familiaKey of Object.keys(FAMILIA_MAP).sort()) {
    const familia = familiaKey.split('-')[1]
    const elementosRegla = regla[familia] || []

    if (elementosRegla.length === 0) continue

    // Para cada elemento de la regla, buscar materiales que coincidan
    const elementosConCantidad: MaterialPorFamilia[] = []

    for (const elem of elementosRegla) {
      let cantidadTotal = 0
      const normasSet = new Set<string>()
      const postesSet = new Set<string>()

      // Buscar en todos los materiales una coincidencia
      for (const mat of materiales) {
        const similitud = calcularSimilitud(mat.descripcion, elem.elemento)

        // Si hay suficiente similitud, sumar
        if (similitud > 0.4) {
          cantidadTotal += mat.cantidad

          // Rastrear en qué normas y postes está presente
          for (const d of mat.detalle) {
            normasSet.add(d.norma)
            if (d.poste !== 'Partida general') {
              postesSet.add(d.poste)
            }
          }
        }
      }

      // Incluir elementos con cantidad > 0
      if (cantidadTotal > 0) {
        elementosConCantidad.push({
          codigo: '',
          descripcion: elem.elemento,
          cantidad: cantidadTotal,
          presenteEn: Array.from(normasSet).map(norma => ({
            norma,
            postes: Array.from(postesSet).sort()
          }))
        })
      }
    }

    // Ordenar por cantidad descendente
    elementosConCantidad.sort((a, b) => b.cantidad - a.cantidad)

    if (elementosConCantidad.length > 0) {
      desgloce.push({
        familia: familiaKey,
        familiaDescripcion: FAMILIA_MAP[familiaKey].descripcion,
        itemsUnicos: elementosConCantidad.length,
        unidadesTotales: Math.round(elementosConCantidad.reduce((sum, m) => sum + m.cantidad, 0) * 1000) / 1000,
        materiales: elementosConCantidad
      })
    }
  }

  return desgloce
}


export async function calcular(lineaId: number): Promise<Calculo> {
  const [linea, postes, partidas, materialesCat, precios] = await Promise.all([
    prisma.linea.findUnique({ where: { id: lineaId } }),
    prisma.poste.findMany({
      where: { lineaId }, orderBy: [{ trayecto: { numero: 'asc' } }, { numero: 'asc' }],
      select: {
        codigo: true,
        trayecto: { select: { numero: true } },
        normas: { select: { normaId: true, configuracionId: true, seleccionada: true } },
      },
    }),
    prisma.partida.findMany({ where: { lineaId }, orderBy: { id: 'asc' } }),
    prisma.material.findMany(),
    preciosVigentes(),
  ])
  if (!linea) throw new HttpError(404, 'Línea no encontrada')

  const configIds = [...new Set(postes.flatMap((p) => p.normas.map((n) => n.configuracionId).filter((x): x is number => !!x)))]
  const configs = await prisma.normaConfiguracion.findMany({
    where: { id: { in: configIds } }, include: { materiales: true, norma: true },
  })
  const configPorId = new Map(configs.map((c) => [c.id, c]))
  const catPorCodigo = new Map(materialesCat.map((m) => [m.codigo, m]))

  const consolidado = new Map<string, MaterialConsolidado>()
  const sumar = (codigo: string, unidadFuente: string | null, d: DetalleMaterial) => {
    const m = catPorCodigo.get(codigo)
    const unidad = m?.unidad || unidadFuente || 'UN'
    const clave = `${codigo}|${unidad}`
    let item = consolidado.get(clave)
    if (!item) {
      item = { codigo, descripcion: m?.descripcion || codigo, unidad, categoria: m?.categoria || '', cantidad: 0, detalle: [] }
      consolidado.set(clave, item)
    }
    item.cantidad += d.cantidad
    item.detalle.push(d)
  }

  const pendientes: string[] = []
  const usoNormas = new Map<number, number>()
  for (const p of postes) {
    // Si el poste no tiene normas, marcar como pendiente
    if (!p.normas || p.normas.length === 0) {
      pendientes.push(p.codigo)
      continue
    }

    // Iterar sobre TODAS las normas asignadas al poste
    let tieneConfiguracion = false
    for (const pn of p.normas) {
      const conf = pn.configuracionId ? configPorId.get(pn.configuracionId) : undefined
      if (!conf) continue

      tieneConfiguracion = true
      usoNormas.set(conf.normaId, (usoNormas.get(conf.normaId) || 0) + 1)
      const etiqueta = `${conf.norma.codigo} v${conf.norma.version}`
      for (const mat of conf.materiales) {
        sumar(mat.codigoMaterial, null, { trayecto: p.trayecto.numero, poste: p.codigo, norma: etiqueta, cantidad: mat.cantidad })
      }
    }

    // Si ninguna norma tiene configuración, marcar como pendiente
    if (!tieneConfiguracion) {
      pendientes.push(p.codigo)
    }
  }
  for (const pa of partidas.filter((x) => x.tipo === TipoPartida.MATERIAL && x.codigoMaterial)) {
    sumar(pa.codigoMaterial!, pa.unidad, { trayecto: null, poste: 'Partida general', norma: '—', cantidad: pa.cantidad })
  }

  const materiales = [...consolidado.values()].sort((a, b) =>
    a.codigo.localeCompare(b.codigo, undefined, { numeric: true }) || a.unidad.localeCompare(b.unidad))
  materiales.forEach((m) => { m.cantidad = Math.round(m.cantidad * 1000) / 1000 })

  const items: ItemCotizacion[] = materiales.map((m) => {
    const precio = precios.get(m.codigo)
    return {
      tipo: TipoPartida.MATERIAL, codigo: m.codigo, descripcion: m.descripcion, unidad: m.unidad, cantidad: m.cantidad,
      precioUnitario: precio ? precio.precioUnitario : null,
      subtotal: precio ? Math.round(precio.precioUnitario * m.cantidad) : null,
      fuentePrecio: precio ? `${precio.proveedor ? precio.proveedor + ' · ' : ''}lote ${precio.lote}` : null,
    }
  })
  for (const pa of partidas.filter((x) => x.tipo !== TipoPartida.MATERIAL)) {
    items.push({
      tipo: pa.tipo, codigo: null, descripcion: pa.descripcion, unidad: pa.unidad, cantidad: pa.cantidad,
      precioUnitario: pa.precioUnitario, subtotal: pa.precioUnitario != null ? Math.round(pa.precioUnitario * pa.cantidad) : null,
      fuentePrecio: 'Partida identificada', partidaId: pa.id,
    })
  }
  const subtotales = Object.fromEntries(TIPOS_PARTIDA.map((t) => [t, 0])) as Record<TipoPartida, number>
  items.forEach((i) => { subtotales[i.tipo] += i.subtotal || 0 })

  const normas = usoNormas.size
    ? await prisma.norma.findMany({ where: { id: { in: [...usoNormas.keys()] } } })
    : []

  return {
    generado: new Date().toISOString(),
    postes: { total: postes.length, configurados: postes.length - pendientes.length, pendientes },
    normasUsadas: normas.map((n) => ({
      normaId: n.id, operador: n.operador, codigo: n.codigo, version: n.version, tipoPoste: n.tipoPoste, vigente: n.vigente, postes: usoNormas.get(n.id) || 0,
    })).sort((a, b) => a.codigo.localeCompare(b.codigo)),
    materiales,
    desglocePoFamilia: generarDesglocePoFamilia(materiales),
    cotizacion: {
      items, subtotales,
      total: Object.values(subtotales).reduce((a, b) => a + b, 0),
      sinPrecio: items.filter((i) => i.precioUnitario == null).map((i) => i.codigo || i.descripcion),
    },
  }
}

export function erroresAprobacion(c: Calculo): string[] {
  const errores: string[] = []
  if (!c.postes.total) errores.push('La línea no tiene postes definidos en ningún trayecto.')
  if (c.postes.pendientes.length) errores.push(`${c.postes.pendientes.length} poste(s) sin norma o configuración.`)
  if (c.cotizacion.sinPrecio.length) errores.push(`${c.cotizacion.sinPrecio.length} partida(s) sin precio: ${c.cotizacion.sinPrecio.slice(0, 8).join(', ')}${c.cotizacion.sinPrecio.length > 8 ? '…' : ''}`)
  return errores
}

// ─── Estados y revisiones ────────────────────────────────────────────────────

// Roles que pueden aprobar una línea.
export const ROLES_APROBACION = ['admin', 'aprobador']

// Al enviar a revisión se congela la cotización: lo que se revisa es exactamente lo que se aprueba,
// aunque cambien precios o normas del catálogo mientras tanto. Devolver a borrador la descongela.
export async function cambiarEstado(lineaId: number, input: { estado?: string; motivo?: string }, usuario: { email: string; role: string }) {
  const nuevo = input.estado as EstadoLinea
  const linea = await prisma.linea.findUnique({ where: { id: lineaId } })
  if (!linea) throw new HttpError(404, 'Línea no encontrada')

  const permitidas: Record<EstadoLinea, EstadoLinea[]> = {
    BORRADOR: [EstadoLinea.EN_REVISION],
    EN_REVISION: [EstadoLinea.BORRADOR, EstadoLinea.APROBADA],
    APROBADA: [],
  }
  if (!permitidas[linea.estado].includes(nuevo)) {
    throw new HttpError(409, linea.estado === EstadoLinea.APROBADA
      ? 'La línea está aprobada. Para modificarla crea una nueva revisión.'
      : `No se puede pasar de ${linea.estado} a ${nuevo}`)
  }
  if (nuevo === EstadoLinea.APROBADA && !ROLES_APROBACION.includes(usuario.role)) {
    throw new HttpError(403, 'Solo un aprobador o un administrador puede aprobar líneas')
  }
  const motivo = nuevo === EstadoLinea.BORRADOR ? requireMotivo(input.motivo) : (input.motivo?.trim() || `Cambio a ${nuevo}`)

  let datos: Prisma.LineaUpdateManyMutationInput = { estado: nuevo }
  if (nuevo === EstadoLinea.EN_REVISION) {
    datos = { ...datos, snapshot: (await calcular(lineaId)) as unknown as Prisma.InputJsonValue }
  } else if (nuevo === EstadoLinea.BORRADOR) {
    datos = { ...datos, snapshot: Prisma.DbNull }
  } else {
    // Se aprueba la cotización congelada al enviar a revisión (si una línea antigua no la tiene, se calcula ahora).
    const congelada = (linea.snapshot as unknown as Calculo | null) || (await calcular(lineaId))
    const errores = erroresAprobacion(congelada)
    if (errores.length) {
      throw new HttpError(409, 'No se puede aprobar: la cotización enviada a revisión está incompleta. Devuélvela a borrador, complétala y reenvíala.', { errores })
    }
    datos = { ...datos, snapshot: congelada as unknown as Prisma.InputJsonValue, aprobadaPor: usuario.email, aprobadaAt: new Date() }
  }

  return prisma.$transaction(async (tx) => {
    // Evita aprobar dos veces si dos usuarios lo intentan a la vez.
    const r = await tx.linea.updateMany({ where: { id: lineaId, estado: linea.estado }, data: datos })
    if (!r.count) throw new HttpError(409, 'El estado cambió mientras tanto; recarga la página')
    await auditar(tx, { lineaId, entidad: 'linea', entidadId: lineaId, accion: 'estado', valorAnterior: linea.estado, valorNuevo: nuevo, motivo, usuario: usuario.email })
  })
}

export async function crearRevision(lineaId: number, motivoIn: unknown, usuario: string) {
  const motivo = requireMotivo(motivoIn)
  return prisma.$transaction(async (tx) => {
    const origen = await tx.linea.findUnique({
      where: { id: lineaId },
      include: { trayectos: { include: { postes: true } }, partidas: true },
    })
    if (!origen) throw new HttpError(404, 'Línea no encontrada')
    if (origen.estado !== EstadoLinea.APROBADA) throw new HttpError(409, 'Solo se crea una revisión a partir de una línea aprobada')
    const ultima = await tx.linea.findFirst({ where: { grupo: origen.grupo }, orderBy: { revision: 'desc' } })
    if (ultima && ultima.id !== origen.id) throw new HttpError(409, `Ya existe la revisión ${ultima.revision} de esta línea`)

    const nueva = await tx.linea.create({
      data: {
        grupo: origen.grupo, revision: origen.revision + 1, nombre: origen.nombre, longitudKm: origen.longitudKm,
        operador: origen.operador, kmzNombre: origen.kmzNombre, kmz: origen.kmz, creadoPor: usuario,
        modoAsignacion: origen.modoAsignacion,
      },
    })
    // Mapeo de postes antiguos a nuevos para copiar normas
    const mapeoPostes = new Map<number, number>()

    for (const t of origen.trayectos) {
      const tr = await tx.trayecto.create({ data: { lineaId: nueva.id, numero: t.numero, cantidadPostes: t.cantidadPostes } })
      if (t.postes.length) {
        const nuevosPostes = await tx.poste.createMany({
          data: t.postes.map((p) => ({
            lineaId: nueva.id, trayectoId: tr.id, numero: p.numero, codigo: p.codigo,
          })),
          skipDuplicates: false,
        })
        // Mapear postes antiguos a nuevos
        const postesNuevos = await tx.poste.findMany({
          where: { trayectoId: tr.id }, select: { id: true, numero: true },
        })
        for (const p of t.postes) {
          const pn = postesNuevos.find((x) => x.numero === p.numero)
          if (pn) mapeoPostes.set(p.id, pn.id)
        }
      }
    }

    // Copiar relaciones PosteNorma de la línea antigua a la nueva
    const posteNormasAntiguos = await tx.posteNorma.findMany({
      where: { poste: { lineaId: origen.id } },
    })
    if (posteNormasAntiguos.length) {
      await tx.posteNorma.createMany({
        data: posteNormasAntiguos.map((pn) => ({
          posteId: mapeoPostes.get(pn.posteId) || 0,
          normaId: pn.normaId,
          configuracionId: pn.configuracionId,
          seleccionada: pn.seleccionada,
        })).filter((pn) => pn.posteId > 0),
      })
    }
    if (origen.partidas.length) {
      await tx.partida.createMany({
        data: origen.partidas.map(({ id, lineaId: _l, ...p }) => ({ ...p, lineaId: nueva.id })),
      })
    }
    await auditar(tx, { lineaId: nueva.id, entidad: 'linea', entidadId: nueva.id, accion: 'revision', valorAnterior: `Revisión ${origen.revision}`, valorNuevo: `Revisión ${nueva.revision}`, motivo, usuario })
    return nueva
  }, { timeout: 30000 })
}

// Borra la línea completa (todas sus revisiones, postes, partidas e historial). Queda un registro de
// auditoría sin línea asociada con el resumen de lo eliminado. Si alguna revisión está aprobada,
// solo un administrador puede borrarla.
export async function eliminarLinea(lineaId: number, motivoIn: unknown, usuario: { email: string; role: string }) {
  const motivo = requireMotivo(motivoIn)
  return prisma.$transaction(async (tx) => {
    const linea = await tx.linea.findUnique({ where: { id: lineaId } })
    if (!linea) throw new HttpError(404, 'Línea no encontrada')
    const revisiones = await tx.linea.findMany({
      where: { grupo: linea.grupo }, orderBy: { revision: 'asc' },
      select: { id: true, revision: true, estado: true, _count: { select: { postes: true } } },
    })
    if (revisiones.some((r) => r.estado === EstadoLinea.APROBADA) && usuario.role !== 'admin') {
      throw new HttpError(403, 'La línea tiene una revisión aprobada: solo un administrador puede eliminarla')
    }
    await tx.auditoria.create({
      data: {
        entidad: 'linea', entidadId: linea.nombre, accion: 'eliminar',
        valorAnterior: JSON.stringify({
          nombre: linea.nombre, operador: linea.operador, longitudKm: linea.longitudKm, creadoPor: linea.creadoPor,
          revisiones: revisiones.map((r) => ({ revision: r.revision, estado: r.estado, postes: r._count.postes })),
        }),
        motivo, usuario: usuario.email,
      },
    })
    const r = await tx.linea.deleteMany({ where: { grupo: linea.grupo } })
    return { eliminadas: r.count }
  })
}
