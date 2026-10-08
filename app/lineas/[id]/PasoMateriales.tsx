'use client'

import { Fragment, useState } from 'react'
import { num } from '../../lib/cliente'
import { Calculo, PropsPaso } from './tipos'
import Partidas from './Partidas'

export default function PasoMateriales(props: PropsPaso & { calculo: Calculo | null }) {
  const { calculo } = props
  const [abierto, setAbierto] = useState<string | null>(null)
  const [verPostes, setVerPostes] = useState(false)

  if (!calculo) return <div className="card"><p className="muted">Calculando…</p></div>

  return (
    <>
      <div className="card">
        <h2>4. Materiales consolidados</h2>
        <div className="sub">Cantidades de cada poste según su norma y configuración, consolidadas por código de material y unidad. Abre un material para ver el detalle por trayecto y poste.</div>
        {calculo.congelado && <div className="info-box">Valores congelados al enviar la línea a revisión ({new Date(calculo.generado).toLocaleString('es-CO')}).</div>}
        {calculo.postes.pendientes.length > 0 && (
          <div className="note">{calculo.postes.pendientes.length} poste(s) sin configurar no están incluidos: {calculo.postes.pendientes.slice(0, 12).join(', ')}{calculo.postes.pendientes.length > 12 ? '…' : ''}</div>
        )}
        {calculo.normasUsadas.length > 0 && (
          <p className="muted" style={{ margin: '12px 0' }}>
            Normas usadas: {calculo.normasUsadas.map((n) => `${n.codigo} v${n.version} (${n.postes})${!n.vigente && !calculo.congelado ? ' — hay versión más reciente' : ''}`).join(' · ')}
          </p>
        )}
        {!calculo.materiales.length ? <p className="muted">Aún no hay materiales: configura postes en el paso 3 o agrega partidas generales abajo.</p> : (
          <>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontWeight: 400, margin: '0 0 10px' }}>
              <input type="checkbox" checked={verPostes} onChange={(e) => setVerPostes(e.target.checked)} /> En el detalle, listar cada poste (no solo totales por trayecto)
            </label>
            <div className="tabla-scroll alto">
              <table>
                <thead><tr><th>Código</th><th>Material</th><th>Unidad</th><th className="num">Cantidad</th><th></th></tr></thead>
                <tbody>
                  {calculo.materiales.map((m) => {
                    const clave = `${m.codigo}|${m.unidad}`
                    const porTrayecto = new Map<string, number>()
                    m.detalle.forEach((d) => {
                      const k = d.trayecto ? `Trayecto ${d.trayecto}` : d.poste
                      porTrayecto.set(k, (porTrayecto.get(k) || 0) + d.cantidad)
                    })
                    return (
                      <Fragment key={clave}>
                        <tr>
                          <td>{m.codigo}</td>
                          <td>{m.descripcion}</td>
                          <td>{m.unidad}</td>
                          <td className="num"><b>{num(m.cantidad)}</b></td>
                          <td><button className="btn btn-sm btn-claro" onClick={() => setAbierto(abierto === clave ? null : clave)}>{abierto === clave ? 'Ocultar' : 'Detalle'}</button></td>
                        </tr>
                        {abierto === clave && (
                          <tr>
                            <td colSpan={5} style={{ background: '#f7f9fd' }}>
                              <table style={{ fontSize: 12.5 }}>
                                <tbody>
                                  {[...porTrayecto.entries()].map(([k, v]) => (
                                    <Fragment key={k}>
                                      <tr className="grupo"><td colSpan={2}>{k}</td><td className="num">{num(v)} {m.unidad}</td></tr>
                                      {verPostes && m.detalle.filter((d) => (d.trayecto ? `Trayecto ${d.trayecto}` : d.poste) === k && d.trayecto).map((d) => (
                                        <tr key={d.poste}><td>{d.poste}</td><td className="muted">{d.norma}</td><td className="num">{num(d.cantidad)}</td></tr>
                                      ))}
                                    </Fragment>
                                  ))}
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <div className="card">
        <h2>Partidas generales de materiales</h2>
        <div className="sub">Materiales de la línea que no dependen de un poste, como el conductor. La cantidad la ingresa el ingeniero y se suma al consolidado.</div>
        <Partidas {...props} tipos={['MATERIAL']} />
      </div>
    </>
  )
}
