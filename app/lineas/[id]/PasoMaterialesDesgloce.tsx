'use client'

import { useEffect, useState } from 'react'

interface Material {
  descripcion: string
}

interface Familia {
  nombre: string
  materiales: Material[]
}

interface EstructuraData {
  [codigo: string]: Familia
}

const ORDEN_FAMILIAS = ['1-Pos', '2-F.Po', '3-Ais', '4-Esp', '5-Cond', '6-Suj', '7-Torni', '8-Cone', '9-P.Ele', '10-Vien']

export default function PasoMaterialesDesgloce() {
  const [estructura, setEstructura] = useState<EstructuraData | null>(null)

  useEffect(() => {
    fetch('/estructura-materiales.json')
      .then(r => r.json())
      .then(data => setEstructura(data))
      .catch(e => console.error('Error cargando estructura:', e))
  }, [])

  if (!estructura) return <p className="muted">Cargando estructura de materiales…</p>

  return (
    <div style={{ marginTop: '24px' }}>
      {ORDEN_FAMILIAS.map((codigo) => {
        const familia = estructura[codigo]
        if (!familia) return null

        return (
          <div key={codigo} style={{ marginBottom: '40px' }}>
            {/* Encabezado de familia */}
            <h3 style={{
              fontSize: '16px',
              fontWeight: '700',
              color: '#1e293b',
              marginBottom: '12px',
              paddingBottom: '8px',
              borderBottom: '2px solid #0f172a'
            }}>
              {familia.nombre}
            </h3>

            {/* Tabla de materiales */}
            <div style={{ overflowX: 'auto', marginBottom: '8px' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '14px',
                marginBottom: '12px'
              }}>
                <thead>
                  <tr style={{ background: '#1e293b', color: '#ffffff' }}>
                    <th style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontWeight: '600',
                      fontSize: '13px',
                      borderRight: '1px solid #0f172a'
                    }}>Descripción técnica</th>
                    <th style={{
                      padding: '12px 16px',
                      textAlign: 'center',
                      fontWeight: '600',
                      fontSize: '13px',
                      width: '100px',
                      borderRight: '1px solid #0f172a'
                    }}>Cant. (ud)</th>
                    <th style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontWeight: '600',
                      fontSize: '13px'
                    }}>Presente en</th>
                  </tr>
                </thead>
                <tbody>
                  {familia.materiales.map((material, idx) => (
                    <tr key={idx} style={{
                      borderBottom: '1px solid #e2e8f0',
                      background: idx % 2 === 0 ? '#ffffff' : '#f8fafc'
                    }}>
                      <td style={{
                        padding: '12px 16px',
                        color: '#1e293b',
                        borderRight: '1px solid #e2e8f0'
                      }}>
                        {material.descripcion}
                      </td>
                      <td style={{
                        padding: '12px 16px',
                        textAlign: 'center',
                        fontWeight: '600',
                        color: '#0f172a',
                        borderRight: '1px solid #e2e8f0'
                      }}>
                        —
                      </td>
                      <td style={{
                        padding: '12px 16px',
                        color: '#64748b',
                        fontSize: '13px'
                      }}>
                        —
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Fila de total */}
            <div style={{
              padding: '12px 16px',
              background: '#0f172a',
              color: '#ffffff',
              fontWeight: '700',
              textAlign: 'right',
              borderRadius: '4px'
            }}>
              Total {familia.nombre}: {familia.materiales.length} items
            </div>
          </div>
        )
      })}
    </div>
  )
}
