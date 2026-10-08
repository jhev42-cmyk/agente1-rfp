'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api, ApiError, ESTADO_LABEL, fecha } from '../../lib/cliente'
import { Calculo, PropsPaso } from './tipos'
import { useUsuario } from '../../components/Marco'
import { exportarExcel } from './exportar'

type Registro = { id: number; entidad: string; entidadId: string; accion: string; valorAnterior: string | null; valorNuevo: string | null; motivo: string; usuario: string; fecha: string }

export default function PasoRevision({ linea, recargar, pedir, calculo }: PropsPaso & { calculo: Calculo | null }) {
  const router = useRouter()
  const usuario = useUsuario()
  const puedeAprobar = usuario.role === 'admin' || usuario.role === 'aprobador'
  const [historial, setHistorial] = useState<Registro[]>([])
  const [error, setError] = useState('')
  const [errores, setErrores] = useState<string[]>([])

  useEffect(() => {
    api<Registro[]>(`/api/lineas/${linea.id}/auditoria`).then(setHistorial).catch(() => {})
  }, [linea.id, linea.estado, linea.updatedAt])

  const cambiar = async (estado: string, opciones: Parameters<typeof pedir>[0]) => {
    setError(''); setErrores([])
    const motivo = await pedir(opciones)
    if (motivo === null) return
    try {
      await api(`/api/lineas/${linea.id}/estado`, { body: { estado, motivo } })
      await recargar()
    } catch (e) {
      if (e instanceof ApiError && e.data?.errores) setErrores(e.data.errores)
      setError((e as Error).message)
    }
  }

  const nuevaRevision = async () => {
    const motivo = await pedir({
      titulo: `Crear revisión ${linea.revision + 1}`,
      mensaje: 'Se copia la línea con sus trayectos, postes y partidas en estado borrador. La revisión aprobada actual se conserva sin cambios.',
      pedirMotivo: true, textoConfirmar: 'Crear revisión',
    })
    if (motivo === null) return
    try {
      const r = await api<{ id: number }>(`/api/lineas/${linea.id}/revision`, { body: { motivo } })
      router.push(`/lineas/${r.id}`)
    } catch (e: any) { setError(e.message) }
  }

  const listaErrores = calculo?.errores || []
  const esUltima = linea.revisiones[linea.revisiones.length - 1]?.id === linea.id

  return (
    <>
      <div className="card">
        <h2>6. Revisión final y aprobación</h2>
        <div className="sub">Borrador → En revisión → Aprobada. Al enviar a revisión se congela la cotización: lo que se revisa es lo que se aprueba, aunque cambien los precios del catálogo. Para aprobar, todos los postes deben estar configurados y todas las partidas deben tener precio. Solo un aprobador o un administrador puede aprobar.</div>

        <p>Estado actual: <span className={`estado estado-${linea.estado}`}>{ESTADO_LABEL[linea.estado]}</span>
          {linea.aprobadaPor && <span className="muted"> · aprobada por {linea.aprobadaPor} el {fecha(linea.aprobadaAt)}</span>}
        </p>

        {linea.estado !== 'APROBADA' && (
          listaErrores.length
            ? <div className="note"><b>{linea.estado === 'EN_REVISION' ? 'La cotización enviada a revisión está incompleta (devuélvela a borrador para corregirla):' : 'Pendiente para aprobar:'}</b><ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>{listaErrores.map((e) => <li key={e}>{e}</li>)}</ul></div>
            : <div className="ok-box">Validación completa: todos los postes configurados y todas las partidas con precio.</div>
        )}

        <div className="acciones">
          {linea.estado === 'BORRADOR' && (
            <button className="btn" onClick={() => cambiar('EN_REVISION', { titulo: 'Enviar a revisión', mensaje: 'La línea queda bloqueada para edición mientras está en revisión.', textoConfirmar: 'Enviar a revisión' })}>Enviar a revisión</button>
          )}
          {linea.estado === 'EN_REVISION' && (
            <>
              {puedeAprobar
                ? <button className="btn" disabled={listaErrores.length > 0} onClick={() => cambiar('APROBADA', { titulo: 'Aprobar línea', mensaje: 'Se aprobará la cotización tal como quedó congelada al enviarla a revisión.', textoConfirmar: 'Aprobar' })}>Aprobar</button>
                : <span className="muted">Pendiente de aprobación por un aprobador o administrador.</span>}
              <button className="btn btn-claro" onClick={() => cambiar('BORRADOR', { titulo: 'Devolver a borrador', pedirMotivo: true, textoConfirmar: 'Devolver' })}>Devolver a borrador</button>
            </>
          )}
          {linea.estado === 'APROBADA' && esUltima && <button className="btn" onClick={nuevaRevision}>Crear nueva revisión</button>}
          {calculo && <button className="btn btn-claro" onClick={() => exportarExcel(linea, calculo)}>Exportar materiales y costos (Excel)</button>}
          <a className="btn btn-claro" style={{ textDecoration: 'none' }} href={`/lineas/${linea.id}/imprimir`} target="_blank" rel="noopener">Cotización en PDF</a>
        </div>
        {error && <div className="error-box">{error}{errores.length > 0 && <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>{errores.map((e) => <li key={e}>{e}</li>)}</ul>}</div>}

        {linea.revisiones.length > 1 && (
          <p className="muted" style={{ marginTop: 18 }}>
            Revisiones: {linea.revisiones.map((r) => (
              <span key={r.id} style={{ marginRight: 12 }}>
                {r.id === linea.id ? <b>Rev. {r.revision}</b> : <Link href={`/lineas/${r.id}`} style={{ color: 'var(--blue)' }}>Rev. {r.revision}</Link>} ({ESTADO_LABEL[r.estado]})
              </span>
            ))}
          </p>
        )}
      </div>

      <div className="card">
        <h2>Historial de cambios</h2>
        <div className="sub">Cada modificación de cantidades, normas, configuraciones, partidas y estados, con usuario, fecha y motivo.</div>
        {!historial.length ? <p className="muted">Sin registros.</p> : (
          <div className="tabla-scroll alto">
            <table style={{ fontSize: 12.5 }}>
              <thead><tr><th>Fecha</th><th>Usuario</th><th>Elemento</th><th>Cambio</th><th>Antes</th><th>Después</th><th>Motivo</th></tr></thead>
              <tbody>
                {historial.map((h) => (
                  <tr key={h.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{fecha(h.fecha)}</td>
                    <td>{h.usuario}</td>
                    <td>{h.entidad} {h.entidadId}</td>
                    <td>{h.accion}</td>
                    <td className="muted" style={{ maxWidth: 220, wordBreak: 'break-word' }}>{h.valorAnterior || '—'}</td>
                    <td style={{ maxWidth: 220, wordBreak: 'break-word' }}>{h.valorNuevo || '—'}</td>
                    <td>{h.motivo}</td>
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
