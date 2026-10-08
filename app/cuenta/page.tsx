'use client'

import { useState } from 'react'
import Marco, { ROL_LABEL, useUsuario } from '../components/Marco'
import { api } from '../lib/cliente'

export default function CuentaPage() {
  return <Marco ancho={false}><Cuenta /></Marco>
}

function Cuenta() {
  const usuario = useUsuario()
  const [form, setForm] = useState({ actual: '', nueva: '', repetir: '' })
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [guardando, setGuardando] = useState(false)

  const cambiar = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setOk('')
    if (form.nueva !== form.repetir) return setError('La nueva contraseña no coincide en los dos campos.')
    setGuardando(true)
    try {
      await api('/api/auth/password', { body: { actual: form.actual, nueva: form.nueva } })
      setForm({ actual: '', nueva: '', repetir: '' })
      setOk('Contraseña actualizada. Se cerraron tus sesiones abiertas en otros equipos.')
    } catch (err: any) { setError(err.message) } finally { setGuardando(false) }
  }

  return (
    <div className="card" style={{ maxWidth: 560 }}>
      <h2>Mi cuenta</h2>
      <p style={{ fontSize: 14 }}>{usuario.name} · {usuario.email} · rol {ROL_LABEL[usuario.role]}</p>
      <h3 style={{ color: 'var(--navy)', fontSize: 15, margin: '20px 0 10px' }}>Cambiar contraseña</h3>
      <form onSubmit={cambiar}>
        <label>Contraseña actual</label>
        <input type="password" required value={form.actual} onChange={(e) => setForm({ ...form, actual: e.target.value })} autoComplete="current-password" />
        <label style={{ marginTop: 12 }}>Nueva contraseña (mínimo 10 caracteres)</label>
        <input type="password" required minLength={10} value={form.nueva} onChange={(e) => setForm({ ...form, nueva: e.target.value })} autoComplete="new-password" />
        <label style={{ marginTop: 12 }}>Repetir nueva contraseña</label>
        <input type="password" required minLength={10} value={form.repetir} onChange={(e) => setForm({ ...form, repetir: e.target.value })} autoComplete="new-password" />
        {error && <div className="error-box">{error}</div>}
        {ok && <div className="ok-box">{ok}</div>}
        <button className="btn" disabled={guardando}>{guardando ? 'Guardando…' : 'Cambiar contraseña'}</button>
      </form>
    </div>
  )
}
