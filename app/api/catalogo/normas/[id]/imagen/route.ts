import { NextResponse } from 'next/server'
import { HttpError, handler, parseId, requireAdmin, requireUser } from '../../../../../lib/api'
import { prisma } from '../../../../../lib/db'
import { guardarImagenNorma } from '../../../../../lib/catalogo'

type Ctx = { params: { id: string } }

export const GET = handler(async (request, { params }: Ctx) => {
  requireUser(request)
  const norma = await prisma.norma.findUnique({ where: { id: parseId(params.id) }, select: { imagen: true, imagenTipo: true } })
  if (!norma?.imagen || !norma.imagenTipo) throw new HttpError(404, 'La norma no tiene esquema')
  return new Response(new Uint8Array(norma.imagen), {
    headers: {
      'Content-Type': norma.imagenTipo,
      'Cache-Control': 'private, max-age=300',
      // Un SVG subido no debe poder ejecutar scripts si se abre directamente.
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      'X-Content-Type-Options': 'nosniff',
    },
  })
})

export const POST = handler(async (request, { params }: Ctx) => {
  const user = requireAdmin(request)
  const form = await request.formData()
  const archivo = form.get('archivo')
  if (!(archivo instanceof File)) throw new HttpError(400, 'Adjunta una imagen')
  await guardarImagenNorma(parseId(params.id), archivo, form.get('motivo'), user.email)
  return NextResponse.json({ ok: true })
})
