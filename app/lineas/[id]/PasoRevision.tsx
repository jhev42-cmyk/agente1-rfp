'use client'

import { useEffect, useState } from 'react'
import { ESTADO_LABEL, fecha, api } from '../../lib/cliente'
import { PropsPaso } from './tipos'
import { exportarExcel } from './exportar'

export default function PasoRevision({ linea, calculo }: PropsPaso & { calculo?: any }) {
  const [materialesCotizacion, setMaterialesCotizacion] = useState<any[] | null>(null)
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    cargarMateriales()
  }, [linea.id])

  const cargarMateriales = async () => {
    setCargando(true)
    try {
      const resultado = await api<{ success: boolean; familias: any[] }>(
        `/api/lineas/${linea.id}/materiales-con-precios`
      )
      if (resultado.success && resultado.familias) {
        setMaterialesCotizacion(resultado.familias)
      }
    } catch (e) {
      console.error('Error cargando cotización:', e)
    } finally {
      setCargando(false)
    }
  }

  const costoTotal = materialesCotizacion
    ? materialesCotizacion.reduce((total, familia) =>
        total + familia.items.reduce((sum: number, item: any) => sum + (item.costo || 0), 0),
        0
      )
    : 0

  return (
    <>
      <div className="card">
        <h2>6. Revisión final y aprobación</h2>
        <p>Estado actual: <span className={`estado estado-${linea.estado}`}>{ESTADO_LABEL[linea.estado]}</span>
          {linea.aprobadaPor && <span className="muted"> · aprobada por {linea.aprobadaPor} el {fecha(linea.aprobadaAt)}</span>}
        </p>

        {cargando && <p className="muted" style={{ marginTop: 12 }}>Cargando cotización…</p>}

        {materialesCotizacion && Array.isArray(materialesCotizacion) && (
          <div style={{ marginTop: 16 }}>
            {(materialesCotizacion as any[]).map((familia, famIdx) => {
              const totalCostoFamilia = familia.items.reduce((sum: number, item: any) => sum + (item.costo || 0), 0)
              return (
                <div key={famIdx} style={{ marginBottom: 20 }}>
                  <h3 style={{ marginBottom: 12, fontSize: 13, fontWeight: 600, color: '#1a1f35' }}>{familia.nombre}</h3>
                  <div className="tabla-scroll">
                    <table style={{ fontSize: 12 }}>
                      <thead>
                        <tr>
                          <th>Descripción técnica</th>
                          <th style={{ width: 80, textAlign: 'right' }}>Cant.</th>
                          <th style={{ width: 110, textAlign: 'right' }}>Precio Unit.</th>
                          <th style={{ width: 110, textAlign: 'right' }}>Costo Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {familia.items.map((item: any, idx: number) => (
                          <tr key={idx}>
                            <td>{item.descripcion}</td>
                            <td style={{ textAlign: 'right' }}>{item.cantidad || '—'}</td>
                            <td style={{ textAlign: 'right' }}>
                              {item.precioUnit ? `$${item.precioUnit.toLocaleString('es-CO')}` : '—'}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 500 }}>
                              {item.costo ? `$${item.costo.toLocaleString('es-CO', { maximumFractionDigits: 0 })}` : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{
                    backgroundColor: '#1a1f35',
                    color: 'white',
                    padding: '12px 16px',
                    marginTop: 8,
                    fontWeight: 600,
                    borderRadius: 4,
                    textAlign: 'right'
                  }}>
                    Total {familia.nombre}: ${totalCostoFamilia.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                  </div>
                </div>
              )
            })}

            {materialesCotizacion.length > 0 && (
              <div style={{
                backgroundColor: '#1a1f35',
                color: 'white',
                padding: '16px',
                fontWeight: 700,
                borderRadius: 4,
                textAlign: 'right',
                fontSize: 14,
                marginTop: 20
              }}>
                COSTO TOTAL DEL PROYECTO: ${costoTotal.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {calculo && (
            <button className="btn btn-claro" onClick={() => exportarExcel(linea, calculo)}>
              Exportar a Excel
            </button>
          )}
          <a className="btn btn-claro" style={{ textDecoration: 'none' }} href={`/lineas/${linea.id}/imprimir`} target="_blank" rel="noopener">
            Exportar a PDF
          </a>
        </div>
      </div>
    </>
  )
}
