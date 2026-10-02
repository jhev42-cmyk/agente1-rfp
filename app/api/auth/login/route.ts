import { NextRequest, NextResponse } from 'next/server'
import { authenticate, createToken } from '../../../lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña requeridos' },
        { status: 400 }
      )
    }

    const user = authenticate(email, password)
    if (user) {
      return NextResponse.json({ token: createToken(user), user })
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
