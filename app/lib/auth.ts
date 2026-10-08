import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { Rol } from '@prisma/client'
import { prisma } from './db'
import { COOKIE_SESION, SESSION_HOURS, firmarToken, verificarToken } from './token'

export type RolSesion = 'admin' | 'aprobador' | 'analista'
export type SessionUser = { id: number; email: string; name: string; role: RolSesion }

export const rolSesion = (r: Rol) => r.toLowerCase() as RolSesion

// ─── Contraseñas (formato scrypt$salt$hash) ──────────────────────────────────

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex')
  return `scrypt$${salt}$${scryptSync(password, salt, 32).toString('hex')}`
}

export function passwordValido(password: string, hash: string) {
  const [, salt, h] = hash.split('$')
  if (!salt || !h) return false
  const esperado = Buffer.from(h, 'hex')
  return timingSafeEqual(esperado, scryptSync(password, salt, esperado.length))
}

export function validarPasswordNueva(password: unknown): string {
  const p = typeof password === 'string' ? password : ''
  if (p.length < 10) throw new Error('La contraseña debe tener al menos 10 caracteres')
  return p
}

// Contraseña temporal legible (sin caracteres ambiguos) para usuarios nuevos o restablecidos.
export function passwordTemporal() {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  return Array.from(randomBytes(12), (b) => alfabeto[b % alfabeto.length]).join('')
}

// ─── Sesión ──────────────────────────────────────────────────────────────────

// Usuario de la sesión, o null si no hay cookie, la firma no es válida, venció, el usuario está
// inactivo o la sesión fue revocada (cambio de contraseña, restablecimiento o desactivación).
export async function getSesion(request: NextRequest): Promise<SessionUser | null> {
  const datos = await verificarToken(request.cookies.get(COOKIE_SESION)?.value)
  if (!datos) return null
  const u = await prisma.usuario.findUnique({ where: { id: datos.uid } })
  if (!u || !u.activo || u.sessionVersion !== datos.v) return null
  return { id: u.id, email: u.email, name: u.nombre, role: rolSesion(u.rol) }
}

export async function ponerCookieSesion(res: NextResponse, uid: number, version: number) {
  res.cookies.set(COOKIE_SESION, await firmarToken(uid, version), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_HOURS * 3600,
  })
  return res
}

export function borrarCookieSesion(res: NextResponse) {
  res.cookies.set(COOKIE_SESION, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 })
  return res
}
