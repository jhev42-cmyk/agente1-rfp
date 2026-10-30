'use client'

import { useEffect, useState } from 'react'
import { Calculo, PropsPaso } from './tipos'
import Partidas from './Partidas'
import PasoMaterialesDesgloce from './PasoMaterialesDesgloce'
import { api } from '../../lib/cliente'

export default function PasoMateriales(props: PropsPaso & { calculo: Calculo | null }) {
  const { calculo, linea } = props
  const [cargandoCelsia, setCargandoCelsia] = useState(false)
  const [errorCelsia, setErrorCelsia] = useState('')
  const [materialesCelsia, setMaterialesCelsia] = useState<any[] | null>(null)

  useEffect(() => {
    // Cargar materiales desde el script Python cuando se monta el componente
    cargarMaterialesCelsia()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linea.id])

  const cargarMaterialesCelsia = async () => {
    setCargandoCelsia(true)
    setErrorCelsia('')
    try {
      const resultado = await api<{ success: boolean; cantidad: number; datos: any[] }>(
        `/api/lineas/${linea.id}/materiales-celsia`
      )
      if (resultado.success) {
        setMaterialesCelsia(resultado.datos)
      }
    } catch (e: any) {
      setErrorCelsia(e.message || 'Error al cargar materiales CELSIA')
      console.error('Error cargando materiales CELSIA:', e)
    } finally {
      setCargandoCelsia(false)
    }
  }

  if (!calculo) return <div className="card"><p className="muted">Calculando…</p></div>

  return (
    <>
      <div className="card">
        <h2>4. Materiales consolidados</h2>
        <div className="sub">Desgloce completo de componentes por familia funcional.</div>
        {calculo.congelado && <div className="info-box">Valores congelados al enviar la línea a revisión ({new Date(calculo.generado).toLocaleString('es-CO')}).</div>}
        {calculo.postes.pendientes.length > 0 && (
          <div className="note">{calculo.postes.pendientes.length} poste(s) sin configurar no están incluidos: {calculo.postes.pendientes.slice(0, 12).join(', ')}{calculo.postes.pendientes.length > 12 ? '…' : ''}</div>
        )}

        <PasoMaterialesDesgloce desgloce={calculo.desglocePoFamilia} />
      </div>

      {cargandoCelsia && <div className="card"><p className="muted">Generando materiales desde normas CELSIA…</p></div>}
      {errorCelsia && <div className="card error-box">{errorCelsia}</div>}
      {materialesCelsia && Array.isArray(materialesCelsia) && (
        <div>
          {(materialesCelsia as any[]).map((familia, famIdx) => (
            <div key={famIdx} className="card">
              <h3 style={{ marginBottom: 16, borderBottom: '2px solid #333', paddingBottom: 8 }}>{familia.nombre}</h3>
              <div className="tabla-scroll">
                <table style={{ fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th>Descripción técnica</th>
                      <th style={{ width: 100 }}>Cant. (ud)</th>
                      <th>Presente en</th>
                    </tr>
                  </thead>
                  <tbody>
                    {familia.items.map((item: any, idx: number) => (
                      <tr key={idx}>
                        <td>{item.descripcion}</td>
                        <td style={{ textAlign: 'right' }}>{item.cantidad || '—'}</td>
                        <td>{item.presenteEn || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {familia.total && (
                <div style={{
                  backgroundColor: '#1a1f35',
                  color: 'white',
                  padding: '12px 16px',
                  textAlign: 'right',
                  marginTop: 12,
                  fontWeight: 600,
                  borderRadius: 4
                }}>
                  {familia.total.nombre}: {familia.total.cantidad} items
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <h2>Partidas generales de materiales</h2>
        <div className="sub">Materiales de la línea que no dependen de un poste. La cantidad la ingresa el ingeniero y se suma al consolidado.</div>
        <Partidas {...props} tipos={['MATERIAL']} />
      </div>
    </>
  )
}
