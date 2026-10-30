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
      {materialesCelsia && (
        <div className="card">
          <h2>Materiales CELSIA (demo_MediaTension.py)</h2>
          <div className="sub">Datos generados desde el script Python con las normas seleccionadas.</div>
          <div className="tabla-scroll alto">
            <table style={{ fontSize: 12 }}>
              <thead>
                <tr>
                  {materialesCelsia.length > 0 && Object.keys(materialesCelsia[0]).map((col) => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {materialesCelsia.map((row, idx) => (
                  <tr key={idx}>
                    {Object.values(row).map((val, i) => (
                      <td key={i}>{val}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
