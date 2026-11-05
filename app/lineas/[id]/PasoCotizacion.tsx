'use client'

import { useEffect, useState } from 'react'
import { Calculo, PropsPaso } from './tipos'
import { api } from '../../lib/cliente'

export default function PasoCotizacion(props: PropsPaso & { calculo: Calculo | null; materialesCSV: any[] | null }) {
  const { linea, materialesCSV } = props
  const [materialesCotizacion, setMaterialesCotizacion] = useState<any[] | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    cargarMaterialesConPrecios()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linea.id, materialesCSV])

  const cargarMaterialesConPrecios = async () => {
    setCargando(true)
    setError('')
    try {
      // Solo usar materiales cargados en Paso 4
      const familias = materialesCSV

      if (familias && familias.length > 0) {
        console.log('[PasoCotizacion] Calculando costos para:', familias.length, 'familias')
        const materialesConCostos = await calcularCostos(familias, linea.id.toString())
        setMaterialesCotizacion(materialesConCostos)
      } else {
        // Sin materiales = vacío, no mostrar error
        setMaterialesCotizacion(null)
        console.log('[PasoCotizacion] Sin materiales cargados en Paso 4')
      }
    } catch (e: any) {
      setError(e.message || 'Error al cargar cotización')
      console.error('Error cargando cotización:', e)
    } finally {
      setCargando(false)
    }
  }

  const calcularCostos = async (familias: any[], lineaId: string) => {
    try {
      // Cargar matriz de precios
      const response = await fetch('/MatrizMateriales_Precios.csv')
      const csvContent = await response.text()
      const precios = parseMatrizPrecios(csvContent)

      // Normalizar función para comparar descripciones
      const normalizarPara = (texto: string) =>
        texto.toLowerCase().replace(/\s+/g, ' ').trim()

      // Aplicar precios a los materiales
      const familiasConPrecios = familias.map(familia => ({
        ...familia,
        items: familia.items.map((item: any) => {
          const descripcionNorm = normalizarPara(item.descripcion)
          const precioObj = precios.find((p: any) =>
            normalizarPara(p.descripcion) === descripcionNorm
          )

          const precioUnit = precioObj?.precio || 0
          const costo = item.cantidad * precioUnit

          return {
            ...item,
            precioUnit,
            costo,
          }
        }),
      }))

      return familiasConPrecios
    } catch (e) {
      console.warn('Error calculando costos:', e)
      // Retornar sin costos si hay error
      return familias.map(familia => ({
        ...familia,
        items: familia.items.map((item: any) => ({
          ...item,
          precioUnit: 0,
          costo: 0,
        })),
      }))
    }
  }

  const parseMatrizPrecios = (csvContent: string) => {
    const lineas = csvContent.split('\n').filter((l: string) => l.trim())
    const precios: any[] = []

    for (const linea of lineas) {
      // Manejar líneas con comillas
      let descripcion = ''
      let precio = 0

      if (linea.startsWith('"')) {
        const endQuote = linea.lastIndexOf('"')
        descripcion = linea.substring(1, endQuote).trim()
        const resto = linea.substring(endQuote + 2).split(';').map(p => p.trim())
        precio = parseFloat(resto[0]) || 0
      } else {
        const partes = linea.split(';').map(p => p.trim())
        descripcion = partes[0]
        precio = parseFloat(partes[1]) || 0
      }

      if (descripcion && precio > 0) {
        precios.push({ descripcion, precio })
      }
    }

    return precios
  }

  return (
    <>
      <div className="card">
        <h2>5. Cotización</h2>
        <div className="sub">Detalle de materiales con precios unitarios y costos totales.</div>

        {cargando && <p className="muted" style={{ marginTop: 12 }}>Cargando cotización…</p>}
        {error && <div className="error-box" style={{ marginTop: 12 }}>{error}</div>}

        {materialesCotizacion && Array.isArray(materialesCotizacion) && (
          <div style={{ marginTop: 16 }}>
            {(materialesCotizacion as any[]).map((familia, famIdx) => {
              const totalCostoFamilia = familia.items.reduce((sum: number, item: any) => sum + (item.costo || 0), 0)
              return (
                <div key={famIdx} className="card" style={{ marginBottom: 12 }}>
                  <h3 style={{ marginBottom: 12, borderBottom: '2px solid #333', paddingBottom: 8, fontSize: 14 }}>{familia.nombre}</h3>
                  <div className="tabla-scroll">
                    <table style={{ fontSize: 12 }}>
                      <thead>
                        <tr>
                          <th>Descripción técnica</th>
                          <th style={{ width: 80, textAlign: 'right' }}>Cant.</th>
                          <th style={{ width: 110, textAlign: 'right' }}>Precio Unit.</th>
                          <th style={{ width: 110, textAlign: 'right' }}>Costo Total</th>
                          <th style={{ width: 120 }}>Presente en</th>
                        </tr>
                      </thead>
                      <tbody>
                        {familia.items.map((item: any, idx: number) => (
                          <tr key={idx}>
                            <td>{item.descripcion}</td>
                            <td style={{ textAlign: 'right' }}>{item.cantidad || '—'}</td>
                            <td style={{ textAlign: 'right' }}>
                              {item.precioUnit ? `$${item.precioUnit.toLocaleString('es-CO')}` : '—'}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 500 }}>
                              {item.costo ? `$${item.costo.toLocaleString('es-CO', { maximumFractionDigits: 0 })}` : '—'}
                            </td>
                            <td>{item.presenteEn || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{
                    backgroundColor: '#1a1f35',
                    color: 'white',
                    padding: '12px 16px',
                    marginTop: 12,
                    fontWeight: 600,
                    borderRadius: 4,
                    textAlign: 'right'
                  }}>
                    Total {familia.nombre}: ${totalCostoFamilia.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                  </div>
                </div>
              )
            })}

            {materialesCotizacion.length > 0 && (
              <div className="card" style={{ marginTop: 20, backgroundColor: '#f5f5f5' }}>
                <div style={{
                  backgroundColor: '#1a1f35',
                  color: 'white',
                  padding: '16px',
                  fontWeight: 700,
                  borderRadius: 4,
                  textAlign: 'right',
                  fontSize: 14
                }}>
                  COSTO TOTAL DEL PROYECTO: ${(materialesCotizacion as any[])
                    .reduce((total: number, familia: any) =>
                      total + familia.items.reduce((sum: number, item: any) => sum + (item.costo || 0), 0), 0
                    )
                    .toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
