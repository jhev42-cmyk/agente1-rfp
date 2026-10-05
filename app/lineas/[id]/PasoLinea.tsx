'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUsuario } from '../../components/Marco'
import { api, descargar, fecha, num } from '../../lib/cliente'
import { PropsPaso } from './tipos'

export default function PasoLinea({ linea, editable, recargar, pedir }: PropsPaso) {
  const [nombre, setNombre] = useState(linea.nombre)
  const [km, setKm] = useState(String(linea.longitudKm))
  const [kmz, setKmz] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const router = useRouter()
  const usuario = useUsuario()
  const tieneAprobada = linea.revisiones.some((r) => r.estado === 'APROBADA')
  const puedeEliminar = usuario.role === 'admin' || !tieneAprobada

  const eliminar = async () => {
    setError(''); setOk('')
    const motivo = await pedir({
      titulo: `Eliminar "${linea.nombre}"`,
      mensaje: `Se borrarán de forma permanente ${linea.revisiones.length > 1 ? `sus ${linea.revisiones.length} revisiones` : 'la línea'}, con sus postes, partidas e historial. Esta acción no se puede deshacer; queda registrado quién la eliminó y por qué.`,
      pedirMotivo: true, peligro: true, textoConfirmar: 'Eliminar definitivamente',
    })
    if (motivo === null) return
    try {
      await api(`/api/lineas/${linea.id}`, { method: 'DELETE', body: { motivo } })
      router.push('/lineas')
    } catch (e: any) { setError(e.message) }
  }
  const totalPostes = linea.trayectos.reduce((a, t) => a + t.cantidadPostes, 0)
  const cambiado = nombre.trim() !== linea.nombre || Number(km) !== linea.longitudKm

  const guardar = async () => {
    setError(''); setOk('')
    const motivo = await pedir({ titulo: 'Guardar datos de la línea', pedirMotivo: true })
    if (motivo === null) return
    try {
      await api(`/api/lineas/${linea.id}`, { method: 'PATCH', body: { nombre, longitudKm: Number(km), motivo } })
      await recargar()
      setOk('Datos guardados.')
    } catch (e: any) { setError(e.message) }
  }

  const subirKmz = async () => {
    if (!kmz) return
    setError(''); setOk('')
    const fd = new FormData()
    fd.append('archivo', kmz)
    if (linea.kmzNombre) {
      const motivo = await pedir({ titulo: 'Reemplazar KMZ', mensaje: `Se reemplazará ${linea.kmzNombre} por ${kmz.name}.`, pedirMotivo: true })
      if (motivo === null) return
      fd.append('motivo', motivo)
    }
    try {
      await api(`/api/lineas/${linea.id}/kmz`, { form: fd })
      setKmz(null)
      await recargar()
      setOk('KMZ guardado.')
    } catch (e: any) { setError(e.message) }
  }

  return (
    <div className="card">
      <h2>1. Registro de la línea</h2>
      <div className="sub">La longitud y el KMZ son referencia del proyecto: el sistema no estima postes desde la longitud ni interpreta el trazado.</div>
      <div className="form-grid">
        <div>
          <label>Nombre</label>
          <input type="text" value={nombre} disabled={!editable} onChange={(e) => setNombre(e.target.value)} />
        </div>
        <div>
          <label>Longitud (km)</label>
          <input type="number" min="0.01" step="0.01" value={km} disabled={!editable} onChange={(e) => setKm(e.target.value)} />
        </div>
        <div>
          <label>Operador de red</label>
          <input type="text" value={linea.operador} disabled />
        </div>
      </div>
      {editable && <button className="btn" disabled={!cambiado || !nombre.trim() || !(Number(km) > 0)} onClick={guardar}>Guardar cambios</button>}

      <div className="kpis" style={{ marginTop: 22 }}>
        <div className="kpi"><div className="v">{totalPostes}</div><div className="k">Postes (suma de trayectos)</div></div>
        <div className="kpi"><div className="v">{num(linea.longitudKm)} km</div><div className="k">Longitud de referencia</div></div>
        <div className="kpi"><div className="v">{linea.revision}</div><div className="k">Revisión</div></div>
      </div>

      <h3 style={{ color: 'var(--navy)', fontSize: 15, marginBottom: 6 }}>KMZ de referencia</h3>
      <p className="muted" style={{ marginTop: 0 }}>
        {linea.kmzNombre
          ? <>Adjunto: <button className="btn-link" style={{ background: 'none', border: 'none', color: 'var(--blue)', cursor: 'pointer', fontWeight: 600, padding: 0 }} onClick={() => descargar(`/api/lineas/${linea.id}/kmz`, linea.kmzNombre!)}>{linea.kmzNombre}</button></>
          : 'Sin KMZ adjunto.'}
      </p>
      {editable && (
        <div className="acciones" style={{ marginTop: 0 }}>
          <input type="file" accept=".kmz,.kml" onChange={(e) => setKmz(e.target.files?.[0] || null)} />
          <button className="btn btn-claro btn-sm" disabled={!kmz} onClick={subirKmz}>{linea.kmzNombre ? 'Reemplazar KMZ' : 'Adjuntar KMZ'}</button>
        </div>
      )}
      {error && <div className="error-box">{error}</div>}
      {ok && <div className="ok-box">{ok}</div>}
      <p className="muted" style={{ marginTop: 18 }}>Creada por {linea.creadoPor} el {fecha(linea.createdAt)}. Última actualización {fecha(linea.updatedAt)}.</p>

      <div style={{ borderTop: '1px solid var(--border)', marginTop: 22, paddingTop: 16 }}>
        <h3 style={{ color: '#8c1d18', fontSize: 15, margin: '0 0 4px' }}>Eliminar línea</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Para líneas que ya no se van a cotizar o que fueron de prueba. Borra todas las revisiones de forma permanente.
          {!puedeEliminar && ' Esta línea tiene una revisión aprobada: solo un administrador puede eliminarla.'}
        </p>
        <button className="btn btn-sm btn-peligro" disabled={!puedeEliminar} onClick={eliminar}>Eliminar línea</button>
      </div>
    </div>
  )
}
