'use client'

import { Fragment } from 'react'
import { num } from '../../lib/cliente'
import { Calculo, PropsPaso } from './tipos'
import Partidas from './Partidas'

export default function PasoMateriales(props: PropsPaso & { calculo: Calculo | null }) {
  const { calculo } = props

  if (!calculo) return <div className="card"><p className="muted">Calculando…</p></div>

  // Calcular resumen
  const totalEstructuras = calculo.postes.total
  const itemsUnicos = calculo.desglocePoFamilia?.reduce((sum, f) => sum + f.itemsUnicos, 0) || 0
  const filasLista = calculo.materiales.reduce((sum, m) => sum + m.detalle.length, 0)
  const unidadesTotales = calculo.materiales.reduce((sum, m) => sum + m.cantidad, 0)

  return (
    <>
      <div className="card">
        <h2>4. Materiales consolidados</h2>
        <div className="sub">Desgloce completo de componentes por familia funcional.</div>
        {calculo.congelado && <div className="info-box">Valores congelados al enviar la línea a revisión ({new Date(calculo.generado).toLocaleString('es-CO')}).</div>}
        {calculo.postes.pendientes.length > 0 && (
          <div className="note">{calculo.postes.pendientes.length} poste(s) sin configurar no están incluidos: {calculo.postes.pendientes.slice(0, 12).join(', ')}{calculo.postes.pendientes.length > 12 ? '…' : ''}</div>
        )}

        {/* RESUMEN */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
          gap: '16px', 
          marginBottom: '32px',
          padding: '20px',
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
          borderRadius: '8px',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Estructuras</div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#1e293b' }}>{totalEstructuras}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Componentes</div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#1e293b' }}>{itemsUnicos}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Filas</div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#1e293b' }}>{filasLista}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Unidades</div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#1e293b' }}>{num(unidadesTotales)}</div>
          </div>
        </div>

        {/* DESGLOCE POR FAMILIA */}
        {calculo.desglocePoFamilia?.map((familia: any) => (
          <Fragment key={familia.familia}>
            {/* Encabezado de familia */}
            <div style={{ 
              marginTop: '28px', 
              marginBottom: '16px',
              paddingBottom: '12px',
              borderBottom: '3px solid #0f172a',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline'
            }}>
              <div>
                <h3 style={{ 
                  margin: '0 0 6px 0', 
                  fontSize: '18px', 
                  fontWeight: '700', 
                  color: '#0f172a',
                  fontFamily: 'ui-monospace, Menlo, monospace'
                }}>
                  {familia.familia}
                </h3>
                <p style={{ 
                  margin: '0', 
                  fontSize: '14px', 
                  color: '#475569',
                  fontWeight: '500'
                }}>
                  {familia.familiaDescripcion}
                </p>
              </div>
              <div style={{
                textAlign: 'right',
                fontSize: '13px',
                color: '#64748b'
              }}>
                <div style={{ fontWeight: '600' }}>{familia.itemsUnicos} componentes</div>
                <div>{num(familia.unidadesTotales)} unid. total</div>
              </div>
            </div>

            {/* Tabla de componentes */}
            <div className="tabla-scroll" style={{ marginBottom: '28px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: '#1e293b', color: '#ffffff' }}>
                    <th style={{
                      padding: '14px 16px',
                      textAlign: 'left',
                      fontWeight: '600',
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      borderBottom: '2px solid #0f172a'
                    }}>Componente</th>
                    <th style={{
                      padding: '14px 16px',
                      textAlign: 'center',
                      fontWeight: '600',
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      borderBottom: '2px solid #0f172a',
                      width: '120px'
                    }}>Cantidad</th>
                  </tr>
                </thead>
                <tbody>
                  {familia.materiales.map((comp: any, i: number) => (
                    <tr key={i} style={{
                      borderBottom: '1px solid #e2e8f0',
                      background: i % 2 === 0 ? '#ffffff' : '#f8fafc',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#eff6ff')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = i % 2 === 0 ? '#ffffff' : '#f8fafc')}>
                      <td style={{
                        padding: '14px 16px',
                        color: '#1e293b',
                        fontWeight: '500',
                        lineHeight: '1.5'
                      }}>{comp.descripcion}</td>
                      <td style={{
                        padding: '14px 16px',
                        textAlign: 'center',
                        fontWeight: '700',
                        color: '#0f172a',
                        fontSize: '16px'
                      }}>{num(comp.cantidad)}</td>
                    </tr>
                  ))}
                  {/* Fila de total */}
                  <tr style={{ background: '#0f172a', color: '#ffffff', fontWeight: '700' }}>
                    <td style={{ padding: '14px 16px' }}>Total {familia.familia}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: '16px' }}>{num(familia.unidadesTotales)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Fragment>
        ))}

        {!calculo.materiales.length && <p className="muted">Aún no hay materiales: configura postes en el paso 3 o agrega partidas generales abajo.</p>}
      </div>

      <div className="card">
        <h2>Partidas generales de materiales</h2>
        <div className="sub">Materiales de la línea que no dependen de un poste. La cantidad la ingresa el ingeniero y se suma al consolidado.</div>
        <Partidas {...props} tipos={['MATERIAL']} />
      </div>
    </>
  )
}
