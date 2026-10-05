'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Marco, { useUsuario } from '../components/Marco'
import { useDialogo } from '../components/Dialogo'
import { api, ESTADO_LABEL, fecha, num } from '../lib/cliente'

type FilaLinea = {
  id: number; grupo: string; revision: number; nombre: string; longitudKm: number; operador: string; estado: string
  creadoPor: string; updatedAt: string; postes: number; pendientes: number
}

export default function LineasPage() {
  return <Marco><Lineas /></Marco>
}

type Eliminada = { id: number; entidadId: string; valorAnterior: string | null; motivo: string; usuario: string; fecha: string }

function Lineas() {
  const router = useRouter()
  const usuario = useUsuario()
  const { pedir, elemento } = useDialogo()
  const [eliminadas, setEliminadas] = useState<Eliminada[]>([])
  const [ok, setOk] = useState('')
  const [lineas, setLineas] = useState<FilaLinea[] | null>(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ nombre: '', longitudKm: '', operador: 'EPM' })
  const [kmz, setKmz] = useState<File | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [verTodas, setVerTodas] = useState(false)

  const cargar = () => Promise.all([
    api<FilaLinea[]>('/api/lineas').then(setLineas),
    api<Eliminada[]>('/api/lineas/eliminadas').then(setEliminadas),
  ]).catch((e) => setError(e.message))

  useEffect(() => { cargar() }, [])

  const eliminar = async (l: FilaLinea) => {
    setError(''); setOk('')
    const revs = (lineas || []).filter((o) => o.grupo === l.grupo)
    const motivo = await pedir({
      titulo: `Eliminar "${l.nombre}"`,
      mensaje: <>Se borrarán de forma permanente {revs.length > 1 ? `sus ${revs.length} revisiones` : 'la línea'}, con {l.postes} postes, partidas e historial. Esta acción no se puede deshacer; queda registrado quién la eliminó y por qué.</>,
      lista: revs.length > 1 ? revs.map((r) => `Revisión ${r.revision} — ${ESTADO_LABEL[r.estado]}`) : undefined,
      pedirMotivo: true, peligro: true, textoConfirmar: 'Eliminar definitivamente',
    })
    if (motivo === null) return
    try {
      await api(`/api/lineas/${l.id}`, { method: 'DELETE', body: { motivo } })
      await cargar()
      setOk(`Línea "${l.nombre}" eliminada.`)
    } catch (e: any) { setError(e.message) }
  }

  // Una línea con alguna revisión aprobada solo la elimina un administrador.
  const puedeEliminar = (l: FilaLinea) =>
    usuario.role === 'admin' || !(lineas || []).some((o) => o.grupo === l.grupo && o.estado === 'APROBADA')

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
                <tr><th>Línea</th><th>Rev.</th><th>Operador</th><th className="num">Longitud</th><th className="num">Postes</th><th>Pendientes</th><th>Estado</th><th>Actualizada</th><th></th></tr>
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
                    <td>
                      <button className="btn btn-sm btn-claro" disabled={!puedeEliminar(l)}
                        title={puedeEliminar(l) ? 'Eliminar la línea y todas sus revisiones' : 'Tiene una revisión aprobada: solo un administrador puede eliminarla'}
                        onClick={() => eliminar(l)}>Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {ok && <div className="ok-box">{ok}</div>}
      </div>

      {eliminadas.length > 0 && (
        <div className="card">
          <h2>Líneas eliminadas</h2>
          <div className="sub">Registro de eliminaciones. Los datos de la línea ya no existen; se conserva el resumen, quién la eliminó y el motivo.</div>
          <div className="tabla-scroll">
            <table style={{ fontSize: 12.5 }}>
              <thead><tr><th>Fecha</th><th>Línea</th><th>Detalle</th><th>Eliminada por</th><th>Motivo</th></tr></thead>
              <tbody>
                {eliminadas.map((e) => {
                  let detalle = ''
                  try {
                    const d = JSON.parse(e.valorAnterior || '{}')
                    detalle = `${d.operador} · ${(d.revisiones || []).map((r: any) => `rev. ${r.revision} ${ESTADO_LABEL[r.estado] || r.estado} (${r.postes} postes)`).join(', ')}`
                  } catch { /* registro sin resumen */ }
                  return (
                    <tr key={e.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{fecha(e.fecha)}</td><td>{e.entidadId}</td>
                      <td className="muted">{detalle}</td><td>{e.usuario}</td><td>{e.motivo}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {elemento}
    </>
  )
}
