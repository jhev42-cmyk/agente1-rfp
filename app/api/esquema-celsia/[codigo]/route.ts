import { NextResponse } from 'next/server'
import { handler } from '../../../lib/api'

type Ctx = { params: { codigo: string } }

// En lugar de leer desde filesystem (no funciona en Vercel serverless),
// simplemente retorna la URL estática para que el navegador la cargue
export const GET = handler(async (request, { params }: Ctx) => {
  const codigo = String(params.codigo).trim()

  // La URL estática es servida directamente por Vercel como asset
  const imageUrl = `/FOTOS_CELSIA/Celsia-Foto-${codigo}.png`

  // Retornar un JSON con la URL en lugar de la imagen misma
  // El cliente hará fetch a esta URL estática
  return NextResponse.json({ url: imageUrl })
})
