'use client'

import { useState } from 'react'
import { api, ApiError } from '../../lib/cliente'
import { ModoAsignacion, PropsPaso } from './tipos'

export default function PasoTrayectos({ linea, editable, recargar, pedir }: PropsPaso) {
  const inicial = Object.fromEntries(linea.trayectos.map((t) => [t.numero, String(t.cantidadPostes)]))
  const [valores, setValores] = useState<Record<number, string>>(inicial)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [guardando, setGuardando] = useState(false)

  const cambios = linea.trayectos.filter((t) => Number(valores[t.numero] || 0) !== t.cantidadPostes)
  const total = linea.trayectos.reduce((a, t) => a + (Number(valores[t.numero]) || 0), 0)
  const configuradosPorTrayecto = (n: number) => linea.postes.filter((p) => p.trayecto === n && p.normaId).length

  const elegirModo = async (modo: ModoAsignacion) => {
    setError(''); setOk('')
    try {
      await api(`/api/lineas/${linea.id}`, { method: 'PATCH', body: { modoAsignacion: modo } })
      await recargar()
    } catch (e: any) { setError(e.message) }
  }

  const guardar = async () => {
    setError(''); setOk('')
    const invalido = cambios.find((t) => { const v = Number(valores[t.numero]); return !Number.isInteger(v) || v < 0 })
    if (invalido) return setError(`Trayecto ${invalido.numero}: la cantidad debe ser un entero mayor o igual a cero.`)

    // Solo se pide motivo si se modifica un trayecto que ya tenía postes.
    let motivo = ''
    if (cambios.some((t) => t.cantidadPostes > 0)) {
      const m = await pedir({ titulo: 'Modificar cantidad de postes', mensaje: 'Indica por qué cambian las cantidades de los trayectos que ya tenían postes.', pedirMotivo: true })
      if (m === null) return
      motivo = m
    }

    setGuardando(true)
    const retirados: string[] = []
    try {
      for (const t of cambios) {
        const cantidad = Number(valores[t.numero])
        const url = `/api/lineas/${linea.id}/trayectos/${t.numero}`
        try {
          const r = await api<{ retirados: string[] }>(url, { method: 'PATCH', body: { cantidad, motivo } })
          retirados.push(...r.retirados)
        } catch (e) {
          // Reducir un trayecto con postes configurados exige confirmación explícita.
          if (e instanceof ApiError && e.status === 409 && e.data?.afectados) {
            const afectados: { codigo: string; norma: string | null }[] = e.data.afectados
            const conf = await pedir({
              titulo: `Trayecto ${t.numero}: retirar postes configurados`,
              mensaje: `Al bajar a ${cantidad} postes se retirarán estos ${afectados.length} poste(s) ya configurado(s), con su norma:`,
              lista: afectados.map((a) => `${a.codigo} — ${a.norma}`),
              textoConfirmar: 'Retirar postes', peligro: true,
            })
            if (conf === null) continue
            const r = await api<{ retirados: string[] }>(url, { method: 'PATCH', body: { cantidad, motivo, confirmar: true } })
            retirados.push(...r.retirados)
          } else throw e
        }
      }
      await recargar()
      setOk(retirados.length ? `Cambios guardados. Postes retirados: ${retirados.join(', ')}.` : 'Cambios guardados.')
    } catch (e: any) {
      setError(e.message)
      await recargar()
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="card">
      <h2>2. Trayectos</h2>
      <div className="sub">Ingresa la cantidad de postes de cada trayecto; los que no apliquen quedan en cero. Los trayectos son divisiones de trabajo y no implican la misma longitud. Al guardar se generan los postes T01-P001, T01-P002…</div>
      <div className="trayectos-grid">
        {linea.trayectos.map((t) => (
          <div key={t.numero} className="trayecto-box">
            <label>Trayecto {t.numero}</label>
            <input
              type="number" min="0" step="1" disabled={!editable}
              value={valores[t.numero] ?? '0'}
              onChange={(e) => setValores({ ...valores, [t.numero]: e.target.value })}
            />
            <div className="muted" style={{ marginTop: 6 }}>
              {t.cantidadPostes} guardados · {configuradosPorTrayecto(t.numero)} configurados
            </div>
          </div>
        ))}
      </div>
      <div className="kpis" style={{ marginTop: 18 }}>
        <div className="kpi"><div className="v">{total}</div><div className="k">Total de postes (suma de trayectos)</div></div>
        <div className="kpi"><div className="v">{linea.postes.length}</div><div className="k">Postes generados</div></div>
      </div>
      {editable && (
        <div className="acciones">
          <button className="btn" disabled={!cambios.length || guardando} onClick={guardar}>{guardando ? 'Guardando…' : `Guardar ${cambios.length || ''} cambio(s)`}</button>
          {cambios.length > 0 && <button className="btn btn-claro" onClick={() => setValores(inicial)}>Descartar</button>}
        </div>
      )}
      {error && <div className="error-box">{error}</div>}
      {ok && <div className="ok-box">{ok}</div>}

      <h3 style={{ color: 'var(--navy)', fontSize: 15, margin: '26px 0 4px' }}>¿Cómo quieres asignar las normas a los postes?</h3>
      <div className="sub" style={{ marginBottom: 12 }}>Define cómo se abre el paso 3. Ambos modos siguen disponibles allí y puedes cambiar de uno a otro en cualquier momento.</div>
      <div className="opciones-modo">
        {OPCIONES.map((o) => (
          <label key={o.valor} className={`opcion-modo ${linea.modoAsignacion === o.valor ? 'activa' : ''} ${!editable ? 'bloqueada' : ''}`}>
            <input type="radio" name="modoAsignacion" checked={linea.modoAsignacion === o.valor} disabled={!editable || guardando} onChange={() => elegirModo(o.valor)} />
            <div>
              <b>{o.titulo}</b>
              <div className="muted">{o.texto}</div>
            </div>
          </label>
        ))}
      </div>
      {!linea.modoAsignacion && editable && <div className="note">Elige un modo para continuar con la configuración de postes.</div>}
    </div>
  )
}

const OPCIONES: { valor: ModoAsignacion; titulo: string; texto: string }[] = [
  { valor: 'CORRIDO', titulo: 'De corrido (poste a poste)', texto: 'Una sola lista con todos los postes de la línea; asignas la norma a cada poste o a una selección.' },
  { valor: 'TRAYECTO', titulo: 'Por trayecto', texto: 'Una sección por trayecto (3.1, 3.2…) donde puedes asignar una norma a todo el trayecto y ajustar postes puntuales.' },
]
