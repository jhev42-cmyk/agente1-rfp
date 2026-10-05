'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Marco from '../components/Marco'
import { api, ESTADO_LABEL, fecha, num } from '../lib/cliente'

type FilaLinea = {
  id: number; grupo: string; revision: number; nombre: string; longitudKm: number; operador: string; estado: string
  creadoPor: string; updatedAt: string; postes: number; pendientes: number
}

export default function LineasPage() {
  return <Marco><Lineas /></Marco>
}

function Lineas() {
  const router = useRouter()
  const [lineas, setLineas] = useState<FilaLinea[] | null>(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ nombre: '', longitudKm: '', operador: 'EPM' })
  const [kmz, setKmz] = useState<File | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [verTodas, setVerTodas] = useState(false)

  useEffect(() => {
    api<FilaLinea[]>('/api/lineas').then(setLineas).catch((e) => setError(e.message))
  }, [])

  const crear = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setGuardando(true)
    try {
      const { id } = await api<{ id: number }>('/api/lineas', { body: { ...form, longitudKm: Number(form.longitudKm) } })
      if (kmz) {
        const fd = new FormData()
        fd.append('archivo', kmz)
        await api(`/api/lineas/${id}/kmz`, { form: fd })
      }
      router.push(`/lineas/${id}`)
    } catch (err: any) {
      setError(err.message)
      setGuardando(false)
    }
  }

  // Por defecto solo la última revisión de cada línea.
  const visibles = (lineas || []).filter((l) =>
    verTodas || !(lineas || []).some((o) => o.grupo === l.grupo && o.revision > l.revision))

  return (
    <>
      <div className="titulo-pagina">
        <div>
          <h1>Líneas de media tensión</h1>
          <div className="meta">Configuración de postes por trayecto y cotización a partir del catálogo central.</div>
        </div>
      </div>

      <div className="card">
        <h2>Registrar línea</h2>
        <div className="sub">Se crean automáticamente 10 trayectos. El total de postes es la suma de los postes de cada trayecto; la longitud y el KMZ quedan como referencia.</div>
        <form onSubmit={crear}>
          <div className="form-grid">
            <div>
              <label>Nombre de la línea</label>
              <input type="text" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Línea 34.5 kV Subestación Norte – Vereda El Alto" />
            </div>
            <div>
              <label>Longitud (km)</label>
              <input type="number" required min="0.01" step="0.01" value={form.longitudKm} onChange={(e) => setForm({ ...form, longitudKm: e.target.value })} />
            </div>
            <div>
              <label>Operador de red</label>
              <select value={form.operador} onChange={(e) => setForm({ ...form, operador: e.target.value })}>
                <option value="EPM">EPM (normas RA)</option>
                <option value="ENEL">ENEL (normas LA)</option>
              </select>
            </div>
            <div>
              <label>KMZ de referencia (opcional)</label>
              <input type="file" accept=".kmz,.kml" onChange={(e) => setKmz(e.target.files?.[0] || null)} />
            </div>
          </div>
          {error && <div className="error-box">{error}</div>}
          <button className="btn" disabled={guardando}>{guardando ? 'Creando…' : 'Crear línea'}</button>
        </form>
      </div>

      <div className="card">
        <h2>Líneas registradas</h2>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontWeight: 400, margin: '6px 0 12px' }}>
          <input type="checkbox" checked={verTodas} onChange={(e) => setVerTodas(e.target.checked)} /> Mostrar también revisiones anteriores
        </label>
        {!lineas ? <p className="muted">Cargando…</p> : !visibles.length ? <p className="muted">Aún no hay líneas registradas.</p> : (
          <div className="tabla-scroll">
            <table>
              <thead>
                <tr><th>Línea</th><th>Rev.</th><th>Operador</th><th className="num">Longitud</th><th className="num">Postes</th><th>Pendientes</th><th>Estado</th><th>Actualizada</th></tr>
              </thead>
              <tbody>
                {visibles.map((l) => (
                  <tr key={l.id}>
                    <td><Link href={`/lineas/${l.id}`} style={{ color: 'var(--blue)', fontWeight: 600 }}>{l.nombre}</Link></td>
                    <td>{l.revision}</td>
                    <td>{l.operador}</td>
                    <td className="num">{num(l.longitudKm)} km</td>
                    <td className="num">{l.postes}</td>
                    <td>{l.pendientes ? <span className="etiqueta-pend">{l.pendientes}</span> : <span className="etiqueta-ok">0</span>}</td>
                    <td><span className={`estado estado-${l.estado}`}>{ESTADO_LABEL[l.estado]}</span></td>
                    <td className="muted">{fecha(l.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
