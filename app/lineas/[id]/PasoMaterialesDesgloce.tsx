'use client'

import { Calculo } from './tipos'

interface MaterialItem {
  descripcion: string
  cantidad: number
  presenteEn: string[]
}

interface FamiliaDesgloce {
  codigo: string
  materiales: MaterialItem[]
}

const FAMILIA_ORDEN = ['1-Pos', '2-F.Po', '3-Ais', '4-Esp', '5-Cond', '6-Suj', '7-Torni', '8-Cone', '9-P.Ele', '10-Vien']

const FAMILIA_NOMBRES: Record<string, string> = {
  '1-Pos': 'Estructura de soporte principal',
  '2-F.Po': 'Fijación al poste',
  '3-Ais': 'Aisladores',
  '4-Esp': 'Espaciamiento de red compacta',
  '5-Cond': 'Conductores y cableado',
  '6-Suj': 'Sujeción y amarre del conductor',
  '7-Torni': 'Tornillería y herrajes de unión',
  '8-Cone': 'Conectores y empalmes eléctricos',
  '9-P.Ele': 'Protección eléctrica y puesta a tierra',
  '10-Vien': 'Anclaje y retención mecánica',
}

export default function PasoMaterialesDesgloce({ desgloce }: { desgloce: FamiliaDesgloce[] | undefined }) {
  if (!desgloce || desgloce.length === 0) {
    return <p className="muted">Sin materiales</p>
  }

  // Ordenar por familia
  const desgloceOrdenado = FAMILIA_ORDEN
    .map(codigo => desgloce.find(d => d.codigo === codigo))
    .filter(Boolean) as FamiliaDesgloce[]

  return (
    <div style={{ marginTop: '32px' }}>
      {desgloceOrdenado.map((familia) => {
        const nombreFamilia = FAMILIA_NOMBRES[familia.codigo] || familia.codigo
        const materiales = familia.materiales || []
        const totalUnidades = materiales.reduce((sum, m) => sum + m.cantidad, 0)

        return (
          <div key={familia.codigo} style={{ marginBottom: '40px' }}>
            {/* Encabezado familia */}
            <h3 style={{
              fontSize: '16px',
              fontWeight: '700',
              color: '#1e293b',
              marginBottom: '12px',
              paddingBottom: '8px',
              borderBottom: '2px solid #0f172a'
            }}>
              {nombreFamilia}
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
                  {materiales.map((material, idx) => (
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
                        {material.cantidad}
                      </td>
                      <td style={{
                        padding: '12px 16px',
                        color: '#64748b',
                        fontSize: '13px'
                      }}>
                        {material.presenteEn.length === 38
                          ? 'Todas (38)'
                          : `${material.presenteEn.length}/38: ${material.presenteEn.join(', ')}`
                        }
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
              Total {nombreFamilia}: <strong>{totalUnidades} unidades</strong>
            </div>
          </div>
        )
      })}
    </div>
  )
}
