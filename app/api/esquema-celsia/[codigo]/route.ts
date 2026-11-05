import { NextResponse } from 'next/server'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { HttpError, handler } from '../../../../lib/api'

type Ctx = { params: { codigo: string } }

export const GET = handler(async (request, { params }: Ctx) => {
  const codigo = String(params.codigo).trim()
  const imagesDir = join(process.cwd(), 'public', 'FOTOS_CELSIA')
  const imagenPath = join(imagesDir, `Celsia-Foto-${codigo}.png`)

  if (!existsSync(imagenPath)) {
    throw new HttpError(404, `Esquema no encontrado para ${codigo}`)
  }

  try {
    const imageBuffer = readFileSync(imagenPath)
    return new Response(imageBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (err) {
    throw new HttpError(500, 'Error leyendo esquema')
  }
})
