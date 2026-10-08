'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { api } from '../lib/cliente'

export type Usuario = { id: number; email: string; name: string; role: 'admin' | 'aprobador' | 'analista' }

export const ROL_LABEL: Record<string, string> = { admin: 'admin', aprobador: 'aprobador', analista: 'analista' }

const SesionContext = createContext<Usuario | null>(null)
export const useUsuario = () => useContext(SesionContext)!

// Valida la sesión, muestra la barra de navegación y entrega el usuario a las páginas hijas.
export default function Marco({ children, ancho = true }: { children: React.ReactNode; ancho?: boolean }) {
  const router = useRouter()
  const ruta = usePathname()
  const [usuario, setUsuario] = useState<Usuario | null>(null)

  useEffect(() => {
    api<{ user: Usuario }>('/api/auth/me').then((r) => setUsuario(r.user)).catch(() => router.push('/login'))
  }, [router])

  const salir = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    window.location.assign('/login')
  }

  if (!usuario) return <div style={{ textAlign: 'center', padding: 40 }}>Cargando...</div>

  const enlace = (href: string, texto: string) => (
    <Link href={href} className={ruta.startsWith(href) ? 'activo' : ''}>{texto}</Link>
  )

  return (
    <SesionContext.Provider value={usuario}>
      <div className="topbar no-print">
        <Link href="/lineas" className="marca">RFP Agent · Agente 1</Link>
        <nav>
          {enlace('/lineas', 'Líneas')}
          {enlace('/catalogo', 'Catálogo')}
          <a href="/agente.html">Solicitudes a proveedores</a>
          {usuario.role === 'admin' && enlace('/usuarios', 'Usuarios')}
          {enlace('/cuenta', 'Mi cuenta')}
          <span className="usuario">{usuario.name} ({ROL_LABEL[usuario.role]})</span>
          <button onClick={salir}>Cerrar sesión</button>
        </nav>
      </div>
      <main className={ancho ? 'ancho' : ''}>{children}</main>
    </SesionContext.Provider>
  )
}
