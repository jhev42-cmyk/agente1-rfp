'use client'

import { ESTADO_LABEL, fecha } from '../../lib/cliente'
import { PropsPaso } from './tipos'
import ResumenMateriales from './ResumenMateriales'

export default function PasoRevision({ linea, calculo, materialesCSV }: PropsPaso & { calculo?: any; materialesCSV?: any[] | null }) {
  return (
    <div className="card">
      <h2>6. Revisión final y aprobación</h2>
      <p>Estado actual: <span className={`estado estado-${linea.estado}`}>{ESTADO_LABEL[linea.estado]}</span>
        {linea.aprobadaPor && <span className="muted"> · aprobada por {linea.aprobadaPor} el {fecha(linea.aprobadaAt)}</span>}
      </p>

      <div style={{ marginTop: 20 }}>
        <h3 style={{ marginBottom: 16 }}>Resumen de Materiales y Cantidades</h3>
        <ResumenMateriales linea={linea} calculo={calculo} materialesCSV={materialesCSV} />
      </div>

      <div style={{ marginTop: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <a className="btn btn-claro" style={{ textDecoration: 'none' }} href={`/api/lineas/${linea.id}/exportar-excel`}>
          Exportar a Excel
        </a>
        <a className="btn btn-claro" style={{ textDecoration: 'none' }} href={`/lineas/${linea.id}/imprimir`} target="_blank" rel="noopener">
          Exportar a PDF
        </a>
      </div>
    </div>
  )
}
