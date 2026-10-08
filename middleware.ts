import { NextRequest, NextResponse } from 'next/server'
import { COOKIE_SESION, verificarToken } from './app/lib/token'

// Exige sesión para todas las páginas y archivos públicos (agente.html, proveedores.json,
// formatos Excel), salvo el login. Aquí solo se valida la firma y el vencimiento del token; las
// rutas /api verifican además, contra la base, que el usuario siga activo y la sesión vigente.
export async function middleware(request: NextRequest) {
  if (await verificarToken(request.cookies.get(COOKIE_SESION)?.value)) return NextResponse.next()
  const login = new URL('/login', request.url)
  const destino = request.nextUrl.pathname + request.nextUrl.search
  if (destino !== '/') login.searchParams.set('siguiente', destino)
  return NextResponse.redirect(login)
}

export const config = {
  matcher: ['/((?!api/|_next/static|_next/image|favicon.ico|login).*)'],
}
