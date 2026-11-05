'use client'

import { useEffect, useState } from 'react'
import { Calculo, PropsPaso } from './tipos'

export default function PasoCotizacion(props: PropsPaso & { calculo: Calculo | null; materialesCSV: any[] | null }) {
  const { materialesCSV } = props
  const [mostrarCotizacion, setMostrarCotizacion] = useState(false)

  useEffect(() => {
    if (materialesCSV && materialesCSV.length > 0) {
      setMostrarCotizacion(true)
    }
  }, [materialesCSV])

  const costoTotalProyecto = materialesCSV?.reduce((sum: number, familia: any) => sum + (familia.total?.costo || 0), 0) || 0

  return (
    <>
      <div className="card">
        <h2>5. Cotización</h2>
        <div className="sub">Costo total de materiales desde el CSV cargado en Paso 4.</div>

        {!mostrarCotizacion && (
          <p className="muted" style={{ marginTop: 12 }}>Carga un archivo CSV en el Paso 4 (Materiales) para ver la cotización.</p>
        )}

        {mostrarCotizacion && materialesCSV && (
          <div style={{ marginTop: 16 }}>
            {materialesCSV.map((familia, famIdx) => (
              <div key={famIdx} className="card" style={{ marginBottom: 12 }}>
                <h3 style={{ marginBottom: 12, borderBottom: '2px solid #333', paddingBottom: 8, fontSize: 14 }}>{familia.nombre}</h3>
                <div className="tabla-scroll">
                  <table style={{ fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th>Descripción técnica</th>
                        <th style={{ width: 80, textAlign: 'right' }}>Cant.</th>
                        <th style={{ width: 120 }}>Presente en</th>
                        <th style={{ width: 120, textAlign: 'right' }}>Costo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {familia.items.map((item: any, idx: number) => (
                        <tr key={idx}>
                          <td>{item.descripcion}</td>
                          <td style={{ textAlign: 'right' }}>{item.cantidad || '—'}</td>
                          <td>{item.presenteEn || '—'}</td>
                          <td style={{ textAlign: 'right', fontWeight: 500 }}>
                            {item.costo ? `$${item.costo.toLocaleString('es-CO', { maximumFractionDigits: 0 })}` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {familia.total?.costo && (
                  <div style={{
                    backgroundColor: '#1a1f35',
                    color: 'white',
                    padding: '12px 16px',
                    marginTop: 12,
                    fontWeight: 600,
                    borderRadius: 4,
                    textAlign: 'right'
                  }}>
                    Total {familia.nombre}: ${familia.total.costo.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                  </div>
                )}
              </div>
            ))}

            {costoTotalProyecto > 0 && (
              <div className="card" style={{ marginTop: 20, backgroundColor: '#f5f5f5' }}>
                <div style={{
                  backgroundColor: '#1a1f35',
                  color: 'white',
                  padding: '20px',
                  fontWeight: 700,
                  borderRadius: 4,
                  textAlign: 'right',
                  fontSize: 16
                }}>
                  COSTO TOTAL DEL PROYECTO: ${costoTotalProyecto.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
