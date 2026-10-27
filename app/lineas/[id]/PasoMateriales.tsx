'use client'

import { Fragment, useState } from 'react'
import { num } from '../../lib/cliente'
import { Calculo, PropsPaso } from './tipos'
import Partidas from './Partidas'

export default function PasoMateriales(props: PropsPaso & { calculo: Calculo | null }) {
  const { calculo } = props
  const [abierto, setAbierto] = useState<string | null>(null)

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
        <div className="sub">Desgloce completo de materiales por familia funcional. Consulta la norma específica en cada ítem para validar cantidades.</div>
        {calculo.congelado && <div className="info-box">Valores congelados al enviar la línea a revisión ({new Date(calculo.generado).toLocaleString('es-CO')}).</div>}
        {calculo.postes.pendientes.length > 0 && (
          <div className="note">{calculo.postes.pendientes.length} poste(s) sin configurar no están incluidos: {calculo.postes.pendientes.slice(0, 12).join(', ')}{calculo.postes.pendientes.length > 12 ? '…' : ''}</div>
        )}

        {/* RESUMEN */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
          <div style={{ padding: '12px', background: '#f0f4f8', borderRadius: '6px' }}>
            <div style={{ fontSize: '14px', color: '#666' }}>Estructuras procesadas</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1a3a52' }}>{totalEstructuras}</div>
          </div>
          <div style={{ padding: '12px', background: '#f0f4f8', borderRadius: '6px' }}>
            <div style={{ fontSize: '14px', color: '#666' }}>Ítems únicos del catálogo</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1a3a52' }}>{itemsUnicos}</div>
          </div>
          <div style={{ padding: '12px', background: '#f0f4f8', borderRadius: '6px' }}>
            <div style={{ fontSize: '14px', color: '#666' }}>Filas de lista</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1a3a52' }}>{filasLista}</div>
          </div>
          <div style={{ padding: '12px', background: '#f0f4f8', borderRadius: '6px' }}>
            <div style={{ fontSize: '14px', color: '#666' }}>Unidades totales</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1a3a52' }}>{num(unidadesTotales)}</div>
          </div>
        </div>

        {/* DESGLOCE POR FAMILIA */}
        {calculo.desglocePoFamilia?.map((familia: any) => (
          <Fragment key={familia.familia}>
            <div style={{ marginTop: '24px', paddingBottom: '12px', borderBottom: '2px solid #e0e6ed' }}>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '600', color: '#1a3a52' }}>
                {familia.familia} — {familia.familiaDescripcion}
              </h3>
              <p style={{ margin: '0', fontSize: '13px', color: '#666' }}>
                {familia.itemsUnicos} ítems únicos · {num(familia.unidadesTotales)} unidades con cantidad fija
              </p>
            </div>

            <div className="tabla-scroll" style={{ marginTop: '12px', marginBottom: '24px' }}>
              <table>
                <thead>
                  <tr>
                    <th>Descripción técnica</th>
                    <th className="num">Cant. (ud)</th>
                    <th>Presente en</th>
                  </tr>
                </thead>
                <tbody>
                  {familia.materiales.map((mat: any, i: number) => (
                    <tr key={i}>
                      <td>{mat.descripcion}</td>
                      <td className="num"><b>{num(mat.cantidad)}</b></td>
                      <td style={{ fontSize: '13px', color: '#555' }}>
                        {mat.presenteEn.length === calculo.postes.total ? (
                          <span style={{ color: '#166534', fontWeight: '500' }}>Todas ({calculo.postes.total}/{calculo.postes.total})</span>
                        ) : (
                          <>
                            <span style={{ color: '#7c2d12', fontWeight: '500' }}>{mat.presenteEn.length}/{calculo.postes.total}:</span>
                            {' '}
                            {mat.presenteEn.map((pres: any, j: number) => (
                              <span key={j}>
                                {pres.norma}{pres.postes.length > 0 && ` (${pres.postes.join(', ')})`}
                                {j < mat.presenteEn.length - 1 ? ', ' : ''}
                              </span>
                            ))}
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                  <tr style={{ fontWeight: '600', background: '#f9fafb', borderTop: '2px solid #e5e7eb' }}>
                    <td>Total {familia.familia}</td>
                    <td className="num">{num(familia.unidadesTotales)}</td>
                    <td>{familia.itemsUnicos} ítems</td>
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
        <div className="sub">Materiales de la línea que no dependen de un poste, como el conductor. La cantidad la ingresa el ingeniero y se suma al consolidado.</div>
        <Partidas {...props} tipos={['MATERIAL']} />
      </div>
    </>
  )
}
