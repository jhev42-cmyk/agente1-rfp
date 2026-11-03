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
  const [cargandoCSV, setCargandoCSV] = useState(false)
  const [csvCargado, setCSVCargado] = useState(false)
  const [actualizando, setActualizando] = useState(false)

  useEffect(() => {
    // Cargar materiales desde el script Python cuando se monta el componente
    cargarMaterialesCelsia()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linea.id])

  const cargarMaterialesCelsia = async () => {
    setCargandoCelsia(true)
    setErrorCelsia('')
    try {
      console.log('[PasoMateriales] Cargando desde:', `/api/lineas/${linea.id}/materiales-celsia`)
      const resultado = await api<{ success: boolean; familias: any[] }>(
        `/api/lineas/${linea.id}/materiales-celsia`
      )
      console.log('[PasoMateriales] Resultado:', resultado)
      if (resultado.success && resultado.familias) {
        setMaterialesCelsia(resultado.familias)
      }
    } catch (e: any) {
      setErrorCelsia(e.message || 'Error al cargar materiales CELSIA')
      console.error('Error cargando materiales CELSIA:', e)
    } finally {
      setCargandoCelsia(false)
    }
  }

  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setCargandoCSV(true)
    setErrorCelsia('')
    try {
      const contenido = await file.text()
      const lineas = contenido.split('\n').filter(l => l.trim())

      const familias: any[] = []
      let familiaActual: any = null
      let enHeaders = false

      for (const linea of lineas) {
        const partes = linea.split(';').map(p => p.trim().replace(/^"|"$/g, ''))

        if (partes.length >= 1 && partes[1] === '' && partes[2] === '' && !linea.includes('Descripción')) {
          if (familiaActual) familias.push(familiaActual)
          familiaActual = {
            nombre: partes[0],
            items: [],
          }
          enHeaders = false
        } else if (partes[0] === 'Descripción técnica' || partes[0] === 'Descripción') {
          enHeaders = true
        } else if (enHeaders && partes[0]) {
          if (partes[0].includes('Total')) {
            if (familiaActual) {
              familiaActual.total = {
                nombre: partes[0],
                cantidad: parseFloat(partes[1]) || 0,
              }
            }
          } else {
            if (familiaActual) {
              familiaActual.items.push({
                descripcion: partes[0],
                cantidad: partes[1] ? parseFloat(partes[1]) : 0,
                presenteEn: partes[2] || '',
              })
            }
          }
        }
      }

      if (familiaActual) familias.push(familiaActual)

      setMaterialesCelsia(familias)
      setCSVCargado(true)
    } catch (e: any) {
      setErrorCelsia(e.message || 'Error al cargar archivo CSV')
      console.error('Error cargando CSV:', e)
      setCSVCargado(false)
    } finally {
      setCargandoCSV(false)
      event.target.value = ''
    }
  }

  const handleActualizar = () => {
    if (!materialesCelsia) return
    setActualizando(true)
    try {
      setErrorCelsia('')
    } finally {
      setActualizando(false)
    }
  }

  if (!calculo) return <div className="card"><p className="muted">Calculando…</p></div>

  return (
    <>
      <div className="card">
        <h2>4. Materiales consolidados</h2>
        <div className="sub">Materiales desde normas CELSIA.</div>

        <div style={{ marginTop: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
          <label style={{ position: 'relative', cursor: 'pointer' }}>
            <input
              type="file"
              accept=".csv"
              onChange={handleCSVUpload}
              disabled={cargandoCSV}
              style={{ display: 'none' }}
            />
            <button className="btn btn-sm" disabled={cargandoCSV} onClick={(e) => {
              const input = (e.currentTarget.previousElementSibling as HTMLInputElement)
              input?.click()
            }}>
              {cargandoCSV ? 'Cargando...' : 'Cargar Matrix CSV'}
            </button>
          </label>
          <button
            className="btn btn-sm"
            disabled={!csvCargado || actualizando}
            onClick={handleActualizar}
            style={{ opacity: csvCargado ? 1 : 0.5 }}
          >
            {actualizando ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>

        {cargandoCelsia && <p className="muted" style={{ marginTop: 12 }}>Generando materiales desde normas CELSIA…</p>}
        {errorCelsia && <div className="error-box" style={{ marginTop: 12 }}>{errorCelsia}</div>}

        {materialesCelsia && Array.isArray(materialesCelsia) && (
          <div className="kpis" style={{ marginTop: 16 }}>
            {(materialesCelsia as any[]).map((familia, idx) => (
              <div key={idx} className="kpi">
                <div className="v">{familia.total?.cantidad || 0}</div>
                <div className="k" style={{ fontSize: 12 }}>{familia.nombre}</div>
              </div>
            ))}
          </div>
        )}
      </div>

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
