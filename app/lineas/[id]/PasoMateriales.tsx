'use client'

import { useEffect, useState } from 'react'
import { Calculo, PropsPaso } from './tipos'
import Partidas from './Partidas'
import PasoMaterialesDesgloce from './PasoMaterialesDesgloce'
import { api } from '../../lib/cliente'

export default function PasoMateriales(props: PropsPaso & { calculo: Calculo | null; materialesCSV: any[] | null; setMaterialesCSV: (materiales: any[] | null) => void }) {
  const { calculo, linea, materialesCSV, setMaterialesCSV } = props
  const [cargandoCelsia, setCargandoCelsia] = useState(false)
  const [errorCelsia, setErrorCelsia] = useState('')
  const [materialesCelsia, setMaterialesCelsia] = useState<any[] | null>(materialesCSV)
  const [cargandoCSV, setCargandoCSV] = useState(false)
  const [csvCargado, setCSVCargado] = useState(materialesCSV !== null)
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
        let descripcion = ''
        let cantidad = 0
        let presenteEn = ''

        if (linea.startsWith('"')) {
          const endQuote = linea.lastIndexOf('"')
          const content = linea.substring(0, endQuote + 1)
          const resto = linea.substring(endQuote + 2)

          descripcion = content.substring(1, content.length - 1).trim()
          const partes = resto.split(';').map(p => p.trim())
          cantidad = partes.length > 0 ? parseFloat(partes[0]) || 0 : 0
          presenteEn = partes.length > 1 ? partes[1] : ''
        } else {
          const partes = linea.split(';').map(p => p.trim().replace(/^"|"$/g, ''))
          descripcion = partes[0] || ''
          cantidad = partes.length > 1 ? parseFloat(partes[1]) || 0 : 0
          presenteEn = partes.length > 2 ? partes[2] : ''
        }

        if (!descripcion) continue

        if (descripcion === '' && cantidad === 0 && presenteEn === '') {
          if (familiaActual) familias.push(familiaActual)
          familiaActual = null
          enHeaders = false
        } else if (descripcion === 'Descripción técnica' || descripcion === 'Descripción') {
          enHeaders = true
        } else if (enHeaders && descripcion && !descripcion.includes('Total')) {
          if (familiaActual) {
            familiaActual.items.push({
              descripcion,
              cantidad,
              presenteEn,
            })
          }
        } else if (enHeaders && descripcion.includes('Total')) {
          if (familiaActual) {
            familiaActual.total = {
              nombre: descripcion,
              cantidad: cantidad,
            }
          }
          enHeaders = false
        } else if (descripcion && cantidad === 0 && presenteEn === '') {
          if (familiaActual) familias.push(familiaActual)
          familiaActual = {
            nombre: descripcion,
            items: [],
          }
          enHeaders = false
        }
      }

      if (familiaActual) familias.push(familiaActual)

      setMaterialesCelsia(familias)
      setMaterialesCSV(familias)
      setCSVCargado(true)
      console.log('[PasoMateriales] CSV cargado:', familias.length, 'familias')
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

        <div style={{ marginTop: 16, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ position: 'relative', cursor: 'pointer', margin: 0 }}>
            <input
              type="file"
              accept=".csv"
              onChange={handleCSVUpload}
              disabled={cargandoCSV}
              style={{ display: 'none' }}
            />
            <button
              className="btn btn-sm"
              disabled={cargandoCSV}
              onClick={(e) => {
                const input = (e.currentTarget.previousElementSibling as HTMLInputElement)
                input?.click()
              }}
              style={{ minWidth: 140, fontWeight: 500, lineHeight: 1.5 }}
            >
              {cargandoCSV ? 'Cargando...' : 'Cargar Matriz CSV'}
            </button>
          </label>
          <button
            className="btn btn-sm"
            disabled={!csvCargado || actualizando}
            onClick={handleActualizar}
            style={{
              minWidth: 105,
              fontWeight: 500,
              lineHeight: 1.5,
              opacity: csvCargado ? 1 : 0.5,
              cursor: csvCargado ? 'pointer' : 'not-allowed'
            }}
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
