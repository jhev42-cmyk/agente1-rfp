import { NextRequest, NextResponse } from 'next/server'

// Almacenamiento en memoria (temporal, para ser reemplazado con BD)
const quotationsStore: any[] = []
let quotationId = 1

function verifyToken(token: string) {
  try {
    const decoded = JSON.parse(Buffer.from(token.replace('Bearer ', ''), 'base64').toString())
    return decoded
  } catch (error) {
    return null
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const user = verifyToken(authHeader)
  if (!user) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
  }

  // Retorna todas las cotizaciones del usuario (por ahora todas)
  return NextResponse.json(quotationsStore)
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const user = verifyToken(authHeader)
  if (!user) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
  }

  try {
    const data = await request.json()

    // Validación básica
    if (!data.codigoCotizacion || !data.nombreProyecto) {
      return NextResponse.json(
        { error: 'Código de cotización y nombre de proyecto son requeridos' },
        { status: 400 }
      )
    }

    const quotation = {
      id: quotationId++,
      userId: (user as any).id,
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    quotationsStore.push(quotation)

    return NextResponse.json({
      id: quotation.id,
      message: 'Cotización guardada exitosamente',
      downloadUrl: `/api/quotations/${quotation.id}/download`
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    )
  }
}
