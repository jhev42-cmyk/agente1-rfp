import { NextRequest, NextResponse } from 'next/server'
import { SessionUser, verifyToken } from './auth'

// Error con código HTTP que los handlers convierten en respuesta JSON.
export class HttpError extends Error {
  constructor(public status: number, message: string, public data?: unknown) {
    super(message)
  }
}

export function requireUser(request: NextRequest): SessionUser {
  const user = verifyToken(request.headers.get('authorization'))
  if (!user) throw new HttpError(401, 'Sesión inválida o expirada')
  return user
}

export function requireAdmin(request: NextRequest): SessionUser {
  const user = requireUser(request)
  if (user.role !== 'admin') throw new HttpError(403, 'Solo un administrador puede modificar el catálogo')
  return user
}

export function requireMotivo(motivo: unknown): string {
  const m = typeof motivo === 'string' ? motivo.trim() : ''
  if (!m) throw new HttpError(400, 'Indica el motivo del cambio')
  return m
}

export function parseId(valor: string): number {
  const id = Number(valor)
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'Identificador inválido')
  return id
}

// Envuelve un handler para responder errores de forma uniforme.
export function handler<C>(fn: (request: NextRequest, ctx: C) => Promise<Response>) {
  return async (request: NextRequest, ctx: C) => {
    try {
      return await fn(request, ctx)
    } catch (e) {
      if (e instanceof HttpError) {
        return NextResponse.json({ error: e.message, ...(e.data ? { data: e.data } : {}) }, { status: e.status })
      }
      console.error(e)
      return NextResponse.json({ error: 'Error en el servidor' }, { status: 500 })
    }
  }
}
