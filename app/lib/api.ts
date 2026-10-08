import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { RolSesion, SessionUser, getSesion } from './auth'

// Error con código HTTP que los handlers convierten en respuesta JSON.
export class HttpError extends Error {
  constructor(public status: number, message: string, public data?: unknown) {
    super(message)
  }
}

// La sesión va en cookie, así que toda petición que modifica datos debe venir de este mismo sitio
// (protección CSRF además de SameSite=Lax).
function verificarOrigen(request: NextRequest) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return
  const origen = request.headers.get('origin')
  if (!origen) return
  let host = ''
  try { host = new URL(origen).host } catch { /* origen inválido */ }
  if (host !== request.headers.get('host')) throw new HttpError(403, 'Origen no permitido')
}

export async function requireUser(request: NextRequest): Promise<SessionUser> {
  verificarOrigen(request)
  const user = await getSesion(request)
  if (!user) throw new HttpError(401, 'Sesión inválida o expirada')
  return user
}

export async function requireRol(request: NextRequest, roles: RolSesion[], mensaje: string): Promise<SessionUser> {
  const user = await requireUser(request)
  if (!roles.includes(user.role)) throw new HttpError(403, mensaje)
  return user
}

export function requireAdmin(request: NextRequest): Promise<SessionUser> {
  return requireRol(request, ['admin'], 'Solo un administrador puede hacer este cambio')
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
      // Dos usuarios modificando lo mismo a la vez (ej. número de poste repetido): conflicto, no error del servidor.
      if (e instanceof Prisma.PrismaClientKnownRequestError && (e.code === 'P2002' || e.code === 'P2034')) {
        console.warn('Conflicto de concurrencia', e.code, e.meta)
        return NextResponse.json({ error: 'Otro usuario modificó estos datos al mismo tiempo. Recarga la página e inténtalo de nuevo.' }, { status: 409 })
      }
      // La transacción excedió su tiempo (base lenta): no se guardó nada, se puede reintentar.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2028') {
        console.warn('Transacción sin completar por tiempo', e.message)
        return NextResponse.json({ error: 'La operación tardó demasiado y no se guardó. Inténtalo de nuevo.' }, { status: 503 })
      }
      console.error(e)
      return NextResponse.json({ error: 'Error en el servidor' }, { status: 500 })
    }
  }
}
