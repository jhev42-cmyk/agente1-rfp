import { NextResponse } from 'next/server'
import { HttpError, handler, parseId, requireMotivo, requireUser } from '../../../../lib/api'
import { prisma } from '../../../../lib/db'
import { lineaEditable } from '../../../../lib/lineas'

// Vercel limita el cuerpo de la petición a 4.5 MB.
const MAX_KMZ_BYTES = 4 * 1024 * 1024

export const GET = handler(async (request, { params }: { params: { id: string } }) => {
  await requireUser(request)
  const linea = await prisma.linea.findUnique({ where: { id: parseId(params.id) }, select: { kmz: true, kmzNombre: true } })
  if (!linea?.kmz) throw new HttpError(404, 'La línea no tiene KMZ adjunto')
  return new Response(new Uint8Array(linea.kmz), {
    headers: {
      'Content-Type': 'application/vnd.google-earth.kmz',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(linea.kmzNombre || 'linea.kmz')}"`,
    },
  })
})

// El KMZ es solo referencia del proyecto: se guarda tal cual, sin interpretarlo.
export const POST = handler(async (request, { params }: { params: { id: string } }) => {
  const user = await requireUser(request)
  const lineaId = parseId(params.id)
  const form = await request.formData()
  const archivo = form.get('archivo')
  if (!(archivo instanceof File)) throw new HttpError(400, 'Adjunta un archivo')
  if (!/\.(kmz|kml)$/i.test(archivo.name)) throw new HttpError(400, 'El archivo debe ser .kmz o .kml')
  if (archivo.size > MAX_KMZ_BYTES) throw new HttpError(400, 'El archivo supera 4 MB')
  const datos = Buffer.from(await archivo.arrayBuffer())

  await prisma.$transaction(async (tx) => {
    const linea = await lineaEditable(tx, lineaId)
    const motivo = linea.kmzNombre ? requireMotivo(form.get('motivo')) : 'Adjuntar KMZ de referencia'
    await tx.linea.update({ where: { id: lineaId }, data: { kmz: datos, kmzNombre: archivo.name } })
    await tx.auditoria.create({
      data: { lineaId, entidad: 'linea', entidadId: String(lineaId), accion: 'kmz', valorAnterior: linea.kmzNombre, valorNuevo: archivo.name, motivo, usuario: user.email },
    })
  })
  return NextResponse.json({ ok: true })
})
