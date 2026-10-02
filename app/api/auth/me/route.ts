import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '../../../lib/auth'

export async function GET(request: NextRequest) {
  const user = verifyToken(request.headers.get('authorization'))
  if (!user) {
    return NextResponse.json({ error: 'Sesión inválida o expirada' }, { status: 401 })
  }
  return NextResponse.json({ user })
}
