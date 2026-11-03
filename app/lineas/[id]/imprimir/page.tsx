'use client'

import { useEffect, useState } from 'react'
import Marco from '../../../components/Marco'
import { api, ESTADO_LABEL, fecha } from '../../../lib/cliente'
import { Calculo, Linea } from '../tipos'
import ResumenCotizacion from '../ResumenCotizacion'

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
      {linea.estado !== 'APROBADA' && <div className="note">Documento preliminar: la línea no está aprobada y los valores pueden cambiar.</div>}
      <div style={{ marginTop: 20 }}>
        <ResumenCotizacion linea={linea} calculo={calculo} mostrarInfo={true} />
      </div>
      <p className="muted" style={{ marginTop: 18, fontSize: 12 }}>Valores en pesos colombianos (COP).</p>
    </div>
  )
}
