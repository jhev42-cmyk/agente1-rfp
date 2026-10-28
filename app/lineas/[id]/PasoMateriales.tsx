'use client'

import { useEffect, useState } from 'react'
import { num } from '../../lib/cliente'
import { Calculo, PropsPaso } from './tipos'
import Partidas from './Partidas'
import PasoMaterialesDesgloce from './PasoMaterialesDesgloce'

export default function PasoMateriales(props: PropsPaso & { calculo: Calculo | null }) {
  const { calculo } = props
  const [desgloce, setDesgloce] = useState<any>(null)

  useEffect(() => {
    // Cargar el desgloce desde el JSON
    fetch('/materiales-desgloce.json')
      .then(r => r.json())
      .then(data => {
        if (data.familias) {
          // Convertir a formato esperado por el componente
          const familias = Object.entries(data.familias).map(([nombre, familia]: [string, any]) => ({
            codigo: familia.codigo,
            materiales: familia.materiales || []
          }))
          setDesgloce(familias)
        }
      })
      .catch(e => console.error('Error cargando desgloce:', e))
  }, [])

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
        <PasoMaterialesDesgloce desgloce={desgloce} />}

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
