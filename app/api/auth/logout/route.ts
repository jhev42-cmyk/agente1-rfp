import { NextResponse } from 'next/server'
import { borrarCookieSesion } from '../../../lib/auth'

export async function POST() {
  return borrarCookieSesion(NextResponse.json({ ok: true }))
}
