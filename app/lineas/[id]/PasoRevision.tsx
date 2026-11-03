'use client'

import { ESTADO_LABEL, fecha } from '../../lib/cliente'
import { PropsPaso } from './tipos'
import ResumenCotizacion from './ResumenCotizacion'

export default function PasoRevision({ linea, calculo }: PropsPaso & { calculo?: any }) {
  return (
    <div className="card">
      <h2>6. Revisión final y aprobación</h2>
      <p>Estado actual: <span className={`estado estado-${linea.estado}`}>{ESTADO_LABEL[linea.estado]}</span>
        {linea.aprobadaPor && <span className="muted"> · aprobada por {linea.aprobadaPor} el {fecha(linea.aprobadaAt)}</span>}
      </p>

      <div style={{ marginTop: 20 }}>
        <ResumenCotizacion linea={linea} calculo={calculo} mostrarInfo={true} />
      </div>

      <div style={{ marginTop: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <a className="btn btn-claro" style={{ textDecoration: 'none' }} href={`/lineas/${linea.id}/imprimir`} target="_blank" rel="noopener">
          Exportar a PDF
        </a>
      </div>
    </div>
  )
}
