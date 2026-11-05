'use client'

import { ESTADO_LABEL, fecha } from '../../lib/cliente'
import { PropsPaso } from './tipos'
import ResumenMateriales from './ResumenMateriales'

export default function PasoRevision({ linea, calculo, materialesCSV }: PropsPaso & { calculo?: any; materialesCSV?: any[] | null }) {
  const handleExportExcel = async () => {
    try {
      const response = await fetch(`/api/lineas/${linea.id}/exportar-excel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familias: materialesCSV || [] })
      })

      if (!response.ok) throw new Error('Error en exportación')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Materiales_${linea.nombre}_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Error exportando Excel:', e)
      alert('Error al exportar Excel')
    }
  }

  const handleExportPDF = async () => {
    try {
      // Guardar en sessionStorage antes de abrir
      if (typeof window !== 'undefined' && materialesCSV) {
        sessionStorage.setItem(`materiales-${linea.id}`, JSON.stringify(materialesCSV))
      }
      // Abrir página de impresión
      window.open(`/lineas/${linea.id}/imprimir`, '_blank')
    } catch (e) {
      console.error('Error exportando PDF:', e)
      alert('Error al exportar PDF')
    }
  }

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
        <button className="btn btn-claro" onClick={handleExportExcel}>
          Exportar a Excel
        </button>
        <button className="btn btn-claro" onClick={handleExportPDF}>
          Exportar a PDF
        </button>
      </div>
    </div>
  )
}
