'use client'

import { useEffect, useState } from 'react'
import { api } from '../../lib/cliente'
import { Linea, Calculo } from './tipos'

interface ResumenCotizacionProps {
  linea: Linea
  calculo: Calculo | null
  mostrarInfo?: boolean
}

export default function ResumenCotizacion({ linea, calculo, mostrarInfo = true }: ResumenCotizacionProps) {
  const [materiales, setMateriales] = useState<any[] | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    api<{ success: boolean; familias: any[] }>(
      `/api/lineas/${linea.id}/materiales-con-precios`
    )
      .then(r => r.success && setMateriales(r.familias))
      .catch(() => {})
      .finally(() => setCargando(false))
  }, [linea.id])

  if (cargando) return <p className="muted">Cargando…</p>
  if (!materiales) return <p className="muted">Sin datos</p>

  const costoTotal = materiales.reduce((total, familia) =>
    total + familia.items.reduce((sum: number, item: any) => sum + (item.costo || 0), 0),
    0
  )

  return (
    <div>
      {mostrarInfo && calculo && (
        <>
          <table style={{ width: 'auto', marginBottom: 18, fontSize: 13 }}>
            <tbody>
              <tr>
                <td><b>Operador de red</b></td><td>{linea.operador}</td>
                <td><b>Revisión</b></td><td>{linea.revision}</td>
              </tr>
              <tr>
                <td><b>Longitud de referencia</b></td><td>{linea.longitudKm} km</td>
                <td><b>Postes</b></td><td>{calculo.postes.total}</td>
              </tr>
            </tbody>
          </table>
          {calculo.normasUsadas.length > 0 && (
            <p style={{ fontSize: 12.5, marginBottom: 16 }}>
              <b>Normas usadas:</b> {calculo.normasUsadas.map((n) => `${n.codigo} v${n.version} — ${n.tipoPoste}`).join('; ')}
            </p>
          )}
        </>
      )}

      {materiales.map((familia, famIdx) => {
        const totalFamilia = familia.items.reduce((sum: number, item: any) => sum + (item.costo || 0), 0)
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
              Total {familia.nombre}: ${totalFamilia.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
            </div>
          </div>
        )
      })}

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
    </div>
  )
}
