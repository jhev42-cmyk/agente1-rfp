'use client'

import { Calculo, PropsPaso } from './tipos'

export default function PasoCotizacion(props: PropsPaso & { calculo: Calculo | null }) {
  const { calculo } = props
  if (!calculo) return <div className="card"><p className="muted">Calculando…</p></div>

  return (
    <div className="card">
      <h2>5. Cotización</h2>
      <div className="sub">En desarrollo</div>
    </div>
  )
}
