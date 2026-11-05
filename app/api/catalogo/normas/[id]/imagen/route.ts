import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'
import { HttpError, handler, parseId, requireAdmin, requireUser } from '../../../../../lib/api'
import { prisma } from '../../../../../lib/db'
import { guardarImagenNorma } from '../../../../../lib/catalogo'

type Ctx = { params: { id: string } }

export const GET = handler(async (request, { params }: Ctx) => {
  await requireUser(request)
  const norma = await prisma.norma.findUnique({
    where: { id: parseId(params.id) },
    select: { imagen: true, imagenTipo: true, codigo: true, operador: true }
  })

  // Primero intenta servir la imagen de la BD
  if (norma?.imagen && norma.imagenTipo) {
    return new Response(new Uint8Array(norma.imagen), {
      headers: {
        'Content-Type': norma.imagenTipo,
        'Cache-Control': 'private, max-age=300',
        'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
        'X-Content-Type-Options': 'nosniff',
      },
    })
  }

  // Si no hay imagen en BD, intenta buscar en /public/FOTOS_CELSIA/
  if (norma?.operador === 'CELSIA' && norma?.codigo) {
    const imagesDir = join(process.cwd(), 'public', 'FOTOS_CELSIA')
    const codigo = norma.codigo
    const url = new URL(request.url)
    const num = url.searchParams.get('num') || '01'

    try {
      const fs = require('fs').promises
      const files = await fs.readdir(imagesDir)
      // Busca imágenes con patrón: Celsia-Foto-{CODIGO}-{NUM}.png o Celsia-Foto-{CODIGO}.png
      let match = files.find((f: string) => f.includes(`Celsia-Foto-${codigo}-${num}`) && f.endsWith('.png'))
      if (!match) {
        // Si no encuentra con número específico, busca solo con el código (para imágenes únicas)
        match = files.find((f: string) => f.includes(`Celsia-Foto-${codigo}`) && f.endsWith('.png') && !f.includes('-01.png') && !f.includes('-02.png') && !f.includes('-03.png'))
      }
      if (match) {
        const imagePath = join(imagesDir, match)
        const imageBuffer = readFileSync(imagePath)
        return new Response(imageBuffer, {
          headers: {
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=86400',
            'X-Content-Type-Options': 'nosniff',
          },
        })
      }
    } catch (err) {
      // Si no encuentra la imagen, continúa hacia el error al final
    }
  }

  throw new HttpError(404, 'La norma no tiene esquema')
})

export const POST = handler(async (request, { params }: Ctx) => {
  const user = await requireAdmin(request)
  const form = await request.formData()
  const archivo = form.get('archivo')
  if (!(archivo instanceof File)) throw new HttpError(400, 'Adjunta una imagen')
  await guardarImagenNorma(parseId(params.id), archivo, form.get('motivo'), user.email)
  return NextResponse.json({ ok: true })
})
