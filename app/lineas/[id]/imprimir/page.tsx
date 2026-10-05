'use client'

import { useEffect, useState } from 'react'
import Marco from '../../../components/Marco'
import { api, ESTADO_LABEL, fecha, num } from '../../../lib/cliente'
import { Calculo, Linea } from '../tipos'
import TablaCotizacion from '../TablaCotizacion'

// Vista de la cotización para imprimir o guardar como PDF desde el navegador.
export default function ImprimirPage({ params }: { params: { id: string } }) {
  return <Marco ancho={false}><Imprimir id={params.id} /></Marco>
}

function Imprimir({ id }: { id: string }) {
  const [linea, setLinea] = useState<Linea | null>(null)
  const [calculo, setCalculo] = useState<Calculo | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([api<Linea>(`/api/lineas/${id}`), api<Calculo>(`/api/lineas/${id}/calculo`)])
      .then(([l, c]) => { setLinea(l); setCalculo(c) })
      .catch((e) => setError(e.message))
  }, [id])

  useEffect(() => {
    if (linea && calculo) setTimeout(() => window.print(), 400)
  }, [linea, calculo])

  if (error) return <div className="error-box">{error}</div>
  if (!linea || !calculo) return <p className="muted">Preparando cotización…</p>

  return (
    <div className="card">
      <div className="acciones no-print" style={{ marginTop: 0, marginBottom: 16 }}>
        <button className="btn" onClick={() => window.print()}>Imprimir / Guardar PDF</button>
      </div>
      <h2 style={{ fontSize: 22 }}>Cotización — {linea.nombre}</h2>
      <table style={{ width: 'auto', marginBottom: 18, fontSize: 13 }}>
        <tbody>
          <tr><td><b>Operador de red</b></td><td>{linea.operador}</td><td><b>Revisión</b></td><td>{linea.revision}</td></tr>
          <tr><td><b>Longitud de referencia</b></td><td>{num(linea.longitudKm)} km</td><td><b>Estado</b></td><td>{ESTADO_LABEL[linea.estado]}</td></tr>
          <tr><td><b>Postes</b></td><td>{calculo.postes.total}</td><td><b>Fecha</b></td><td>{calculo.congelado ? `Aprobada ${fecha(linea.aprobadaAt)} por ${linea.aprobadaPor}` : fecha(calculo.generado)}</td></tr>
        </tbody>
      </table>
      {linea.estado !== 'APROBADA' && <div className="note">Documento preliminar: la línea no está aprobada y los valores pueden cambiar.</div>}
      {calculo.normasUsadas.length > 0 && (
        <p style={{ fontSize: 12.5 }}><b>Normas usadas:</b> {calculo.normasUsadas.map((n) => `${n.codigo} v${n.version} — ${n.tipoPoste} (${n.postes} postes)`).join('; ')}</p>
      )}
      <TablaCotizacion calculo={calculo} mostrarFuente={false} />
      <p className="muted" style={{ marginTop: 18 }}>Valores en pesos colombianos (COP). Cantidades calculadas a partir de las normas del catálogo central por poste y de las partidas generales ingresadas.</p>
    </div>
  )
}
