'use client'

import { useEffect, useState } from 'react'
import { api } from '../../lib/cliente'
import { Linea, Calculo } from './tipos'

interface ResumenMaterialesProps {
  linea: Linea
  calculo: Calculo | null
  materialesCSV?: any[] | null
}

export default function ResumenMateriales({ linea, calculo, materialesCSV }: ResumenMaterialesProps) {
  const [materiales, setMateriales] = useState<any[] | null>(materialesCSV || null)
  const [cargando, setCargando] = useState(!materialesCSV)

  useEffect(() => {
    // Si no recibimos materialesCSV desde props, cargar desde endpoint
    if (!materialesCSV) {
      api<{ success: boolean; familias: any[] }>(
        `/api/lineas/${linea.id}/materiales-cargados`
      )
        .then(r => r.success && setMateriales(r.familias))
        .catch(() => setMateriales([]))
        .finally(() => setCargando(false))
    }
  }, [linea.id, materialesCSV])

  if (cargando) return <p className="muted">Cargando materiales…</p>
  if (!materiales || materiales.length === 0) {
    return <p className="muted">Carga un archivo CSV en el Paso 4 para ver el resumen de materiales.</p>
  }

  return (
    <div>
      {calculo && (
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
        const cantidadTotal = (familia.items || []).reduce((sum: number, item: any) => sum + (item.cantidad || 0), 0)
        return (
          <div key={famIdx} style={{ marginBottom: 20 }}>
            <h3 style={{ marginBottom: 12, fontSize: 13, fontWeight: 600, color: '#1a1f35' }}>{familia.nombre}</h3>
            <div className="tabla-scroll">
              <table style={{ fontSize: 12 }}>
                <thead>
                  <tr>
                    <th>Descripción técnica</th>
                    <th style={{ width: 80, textAlign: 'right' }}>Cant. (ud)</th>
                  </tr>
                </thead>
                <tbody>
                  {familia.items.map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td>{item.descripcion}</td>
                      <td style={{ textAlign: 'right' }}>{item.cantidad || '—'}</td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: '2px solid #ddd', fontWeight: 600 }}>
                    <td><b>Total {familia.nombre}</b></td>
                    <td style={{ textAlign: 'right' }}><b>{cantidadTotal}</b></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </div>
  )
}
