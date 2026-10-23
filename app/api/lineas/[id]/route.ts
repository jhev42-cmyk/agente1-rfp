import { NextResponse } from 'next/server'
import { HttpError, handler, parseId, requireUser } from '../../../lib/api'
import { prisma } from '../../../lib/db'
import { editarLinea, elegirModoAsignacion, eliminarLinea } from '../../../lib/lineas'

type Ctx = { params: { id: string } }

export const GET = handler(async (request, { params }: Ctx) => {
  await requireUser(request)
  const id = parseId(params.id)
  const linea = await prisma.linea.findUnique({
    where: { id },
    select: {
      id: true, grupo: true, revision: true, nombre: true, longitudKm: true, operador: true, estado: true, modoAsignacion: true,
      kmzNombre: true, creadoPor: true, createdAt: true, updatedAt: true, aprobadaPor: true, aprobadaAt: true,
      trayectos: { orderBy: { numero: 'asc' }, select: { numero: true, cantidadPostes: true } },
      postes: {
        orderBy: [{ trayecto: { numero: 'asc' } }, { numero: 'asc' }],
        select: {
          id: true,
          codigo: true,
          numero: true,
          trayecto: { select: { numero: true } },
          normas: {
            select: {
              id: true,
              normaId: true,
              configuracionId: true,
              seleccionada: true,
              norma: {
                select: {
                  id: true, codigo: true, version: true, operador: true, tipoPoste: true,
                  descripcion: true, vigente: true, imagenTipo: true, creadoPor: true,
                  motivo: true, createdAt: true
                }
              },
            },
          },
        },
      },
      partidas: { orderBy: { id: 'asc' } },
    },
  })
  if (!linea) throw new HttpError(404, 'Línea no encontrada')
  const revisiones = await prisma.linea.findMany({
    where: { grupo: linea.grupo }, orderBy: { revision: 'asc' }, select: { id: true, revision: true, estado: true },
  })
  return NextResponse.json({
    ...linea,
    postes: linea.postes.map(({ trayecto, normas, ...p }) => {
      const normasArray = normas || []
      const seleccionada = normasArray.find((n) => n.seleccionada)
      const primera = normasArray[0]
      return {
        ...p,
        trayecto: trayecto.numero,
        // Para compatibilidad: normaId y configuracionId de la norma seleccionada (o la primera)
        normaId: seleccionada?.normaId ?? primera?.normaId ?? null,
        configuracionId: seleccionada?.configuracionId ?? primera?.configuracionId ?? null,
        normas: normasArray,
      }
    }),
    revisiones,
  })
})

export const PATCH = handler(async (request, { params }: Ctx) => {
  const user = await requireUser(request)
  const id = parseId(params.id)
  const { modoAsignacion, ...datos } = await request.json()
  if (modoAsignacion !== undefined) await elegirModoAsignacion(id, modoAsignacion, user.email)
  if (Object.keys(datos).some((k) => k !== 'motivo')) await editarLinea(id, datos, user.email)
  return NextResponse.json({ ok: true })
})

// Elimina la línea con todas sus revisiones. Requiere motivo.
export const DELETE = handler(async (request, { params }: Ctx) => {
  const user = await requireUser(request)
  const { motivo } = await request.json().catch(() => ({}))
  return NextResponse.json(await eliminarLinea(parseId(params.id), motivo, user))
})
