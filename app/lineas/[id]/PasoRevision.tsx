'use client'

import { ESTADO_LABEL, fecha } from '../../lib/cliente'
import { PropsPaso } from './tipos'

export default function PasoRevision({ linea }: PropsPaso) {

  return (
    <div className="card">
      <h2>6. Revisión final y aprobación</h2>
      <p>Estado actual: <span className={`estado estado-${linea.estado}`}>{ESTADO_LABEL[linea.estado]}</span>
        {linea.aprobadaPor && <span className="muted"> · aprobada por {linea.aprobadaPor} el {fecha(linea.aprobadaAt)}</span>}
      </p>
    </div>
  )
}
