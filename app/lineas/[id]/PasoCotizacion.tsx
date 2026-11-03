'use client'

import { useEffect, useState } from 'react'
import { Calculo, PropsPaso } from './tipos'
import { api } from '../../lib/cliente'

export default function PasoCotizacion(props: PropsPaso & { calculo: Calculo | null }) {
  const { linea } = props
  const [materialesCotizacion, setMaterialesCotizacion] = useState<any[] | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    cargarMaterialesConPrecios()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linea.id])

  const cargarMaterialesConPrecios = async () => {
    setCargando(true)
    setError('')
    try {
      const resultado = await api<{ success: boolean; familias: any[] }>(
        `/api/lineas/${linea.id}/materiales-con-precios`
      )
      if (resultado.success && resultado.familias) {
        setMaterialesCotizacion(resultado.familias)
      }
    } catch (e: any) {
      setError(e.message || 'Error al cargar cotización')
      console.error('Error cargando cotización:', e)
    } finally {
      setCargando(false)
    }
  }

  return (
    <>
      <div className="card">
        <h2>5. Cotización</h2>
        <div className="sub">Detalle de materiales con precios unitarios y costos totales.</div>

        {cargando && <p className="muted" style={{ marginTop: 12 }}>Cargando cotización…</p>}
        {error && <div className="error-box" style={{ marginTop: 12 }}>{error}</div>}

        {materialesCotizacion && Array.isArray(materialesCotizacion) && (
          <div style={{ marginTop: 16 }}>
            {(materialesCotizacion as any[]).map((familia, famIdx) => {
              const totalCostoFamilia = familia.items.reduce((sum: number, item: any) => sum + (item.costo || 0), 0)
              return (
                <div key={famIdx} className="card" style={{ marginBottom: 12 }}>
                  <h3 style={{ marginBottom: 12, borderBottom: '2px solid #333', paddingBottom: 8, fontSize: 14 }}>{familia.nombre}</h3>
                  <div className="tabla-scroll">
                    <table style={{ fontSize: 12 }}>
                      <thead>
                        <tr>
                          <th>Descripción técnica</th>
                          <th style={{ width: 80, textAlign: 'right' }}>Cant.</th>
                          <th style={{ width: 110, textAlign: 'right' }}>Precio Unit.</th>
                          <th style={{ width: 110, textAlign: 'right' }}>Costo Total</th>
                          <th style={{ width: 120 }}>Presente en</th>
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
                            <td>{item.presenteEn || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{
                    backgroundColor: '#1a1f35',
                    color: 'white',
                    padding: '12px 16px',
                    marginTop: 12,
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
              <div className="card" style={{ marginTop: 20, backgroundColor: '#f5f5f5' }}>
                <div style={{
                  backgroundColor: '#1a1f35',
                  color: 'white',
                  padding: '16px',
                  fontWeight: 700,
                  borderRadius: 4,
                  textAlign: 'right',
                  fontSize: 14
                }}>
                  COSTO TOTAL DEL PROYECTO: ${(materialesCotizacion as any[])
                    .reduce((total: number, familia: any) =>
                      total + familia.items.reduce((sum: number, item: any) => sum + (item.costo || 0), 0), 0
                    )
                    .toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
