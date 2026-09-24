import { NextRequest, NextResponse } from 'next/server'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'rfpagent@rfp.local'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'rfpagent123'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña requeridos' },
        { status: 400 }
      )
    }

    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      // Token simple en base64 (cambiar en producción)
      const token = Buffer.from(JSON.stringify({ id: 1, email, role: 'admin', iat: Date.now() })).toString('base64')

      return NextResponse.json({ token, user: { id: 1, email, role: 'admin' } })
    }

    return NextResponse.json(
      { error: 'Credenciales inválidas' },
      { status: 401 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: 'Error en el servidor' },
      { status: 500 }
    )
  }
}
