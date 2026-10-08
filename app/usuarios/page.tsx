'use client'

import { useEffect, useState } from 'react'
import Marco, { useUsuario } from '../components/Marco'
import { useDialogo } from '../components/Dialogo'
import { api, fecha } from '../lib/cliente'

type Fila = { id: number; email: string; nombre: string; rol: 'ADMIN' | 'APROBADOR' | 'ANALISTA'; activo: boolean; createdAt: string }
type Acceso = { id: number; email: string; ip: string; exito: boolean; fecha: string }

const ROLES = [
  { valor: 'ANALISTA', texto: 'Analista — configura y cotiza líneas' },
  { valor: 'APROBADOR', texto: 'Aprobador — además aprueba líneas' },
  { valor: 'ADMIN', texto: 'Administrador — además catálogo y usuarios' },
]

export default function UsuariosPage() {
  return <Marco><Usuarios /></Marco>
}

function Usuarios() {
  const yo = useUsuario()
  const { pedir, elemento } = useDialogo()
  const [usuarios, setUsuarios] = useState<Fila[]>([])
  const [accesos, setAccesos] = useState<Acceso[]>([])
  const [form, setForm] = useState({ email: '', nombre: '', rol: 'ANALISTA' })
  const [error, setError] = useState('')
  const [credencial, setCredencial] = useState<{ email: string; password: string } | null>(null)

  const cargar = () => api<{ usuarios: Fila[]; accesos: Acceso[] }>('/api/usuarios')
    .then((r) => { setUsuarios(r.usuarios); setAccesos(r.accesos) })
    .catch((e) => setError(e.message))
  useEffect(() => { cargar() }, [])

  if (yo.role !== 'admin') return <div className="error-box">Solo un administrador puede gestionar usuarios.</div>

  const crear = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setCredencial(null)
    try {
      const r = await api<{ passwordTemporal: string }>('/api/usuarios', { body: form })
      setCredencial({ email: form.email.trim().toLowerCase(), password: r.passwordTemporal })
      setForm({ email: '', nombre: '', rol: 'ANALISTA' })
      await cargar()
    } catch (err: any) { setError(err.message) }
  }

  const cambiar = async (u: Fila, cambios: Record<string, unknown>, confirmar?: { titulo: string; mensaje: string }) => {
    setError(''); setCredencial(null)
    if (confirmar && (await pedir({ ...confirmar, textoConfirmar: 'Confirmar' })) === null) return
    try {
      const r = await api<{ passwordTemporal?: string }>(`/api/usuarios/${u.id}`, { method: 'PATCH', body: cambios })
      if (r.passwordTemporal) setCredencial({ email: u.email, password: r.passwordTemporal })
      await cargar()
    } catch (err: any) { setError(err.message); await cargar() }
  }

  return (
    <>
      <div className="titulo-pagina"><div><h1>Usuarios</h1><div className="meta">Altas, roles, desactivación y restablecimiento de contraseñas.</div></div></div>

      {credencial && (
        <div className="ok-box">
          Contraseña temporal de <b>{credencial.email}</b>: <code style={{ fontSize: 15 }}>{credencial.password}</code><br />
          Entrégala por un canal seguro; no se vuelve a mostrar. El usuario puede cambiarla en &quot;Mi cuenta&quot;.
        </div>
      )}
      {error && <div className="error-box">{error}</div>}

      <div className="card">
        <h2>Usuarios registrados</h2>
        <div className="tabla-scroll">
          <table>
            <thead><tr><th>Usuario</th><th>Rol</th><th>Estado</th><th>Creado</th><th></th></tr></thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} className={u.activo ? '' : 'pendiente'}>
                  <td><b>{u.nombre}</b><div className="muted">{u.email}</div></td>
                  <td>
                    <select value={u.rol} disabled={u.id === yo.id} onChange={(e) => cambiar(u, { rol: e.target.value })}>
                      {ROLES.map((r) => <option key={r.valor} value={r.valor}>{r.texto.split(' —')[0]}</option>)}
                    </select>
                  </td>
                  <td>{u.activo ? <span className="etiqueta-ok">Activo</span> : <span className="etiqueta-pend">Desactivado</span>}</td>
                  <td className="muted">{fecha(u.createdAt)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn btn-sm btn-claro" onClick={() => cambiar(u, { restablecer: true }, { titulo: `Restablecer contraseña de ${u.email}`, mensaje: 'Se generará una contraseña temporal y se cerrarán sus sesiones abiertas.' })}>Restablecer contraseña</button>{' '}
                    {u.id !== yo.id && (u.activo
                      ? <button className="btn btn-sm btn-peligro" onClick={() => cambiar(u, { activo: false }, { titulo: `Desactivar ${u.email}`, mensaje: 'No podrá iniciar sesión y se cerrarán sus sesiones abiertas. Su historial de cambios se conserva.' })}>Desactivar</button>
                      : <button className="btn btn-sm" onClick={() => cambiar(u, { activo: true })}>Reactivar</button>)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2>Nuevo usuario</h2>
        <form onSubmit={crear}>
          <div className="form-grid">
            <div><label>Nombre</label><input type="text" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></div>
            <div><label>Correo</label><input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div>
              <label>Rol</label>
              <select value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })}>
                {ROLES.map((r) => <option key={r.valor} value={r.valor}>{r.texto}</option>)}
              </select>
            </div>
          </div>
          <button className="btn">Crear usuario</button>
        </form>
      </div>

      <div className="card">
        <h2>Últimos intentos de inicio de sesión</h2>
        <div className="sub">Tras 5 intentos fallidos en 15 minutos con el mismo correo (o 20 desde la misma IP) se bloquea el acceso temporalmente.</div>
        <div className="tabla-scroll alto">
          <table style={{ fontSize: 12.5 }}>
            <thead><tr><th>Fecha</th><th>Correo</th><th>IP</th><th>Resultado</th></tr></thead>
            <tbody>
              {accesos.map((a) => (
                <tr key={a.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{fecha(a.fecha)}</td><td>{a.email}</td><td className="muted">{a.ip}</td>
                  <td>{a.exito ? <span className="etiqueta-ok">Correcto</span> : <span className="etiqueta-pend">Fallido</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {elemento}
    </>
  )
}
