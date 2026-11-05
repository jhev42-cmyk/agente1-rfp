'use client'

import { useEffect, useState } from 'react'
import Marco from '../../../components/Marco'
import { api } from '../../../lib/cliente'
import { Calculo, Linea } from '../tipos'
import ResumenMateriales from '../ResumenMateriales'

// Vista de materiales y cantidades para imprimir o guardar como PDF desde el navegador.
export default function ImprimirPage({ params }: { params: { id: string } }) {
  return <Marco ancho={false}><Imprimir id={params.id} /></Marco>
}

function Imprimir({ id }: { id: string }) {
  const [linea, setLinea] = useState<Linea | null>(null)
  const [calculo, setCalculo] = useState<Calculo | null>(null)
  const [materialesCSV, setMaterialesCSV] = useState<any[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    // Leer desde sessionStorage (guardado en Paso 6)
    let materiales = null
    try {
      const stored = sessionStorage.getItem(`materiales-${id}`)
      if (stored) {
        materiales = JSON.parse(stored)
        console.log('[Imprimir] Materiales desde sessionStorage:', materiales.length)
      }
    } catch (e) {
      console.warn('[Imprimir] Error leyendo sessionStorage:', e)
    }

    Promise.all([api<Linea>(`/api/lineas/${id}`), api<Calculo>(`/api/lineas/${id}/calculo`)])
      .then(([l, c]) => {
        setLinea(l)
        setCalculo(c)
        setMaterialesCSV(materiales)
      })
      .catch((e) => setError(e.message))
  }, [id])

  useEffect(() => {
    if (linea && calculo && materialesCSV !== null) setTimeout(() => window.print(), 400)
  }, [linea, calculo, materialesCSV])

  if (error) return <div className="error-box">{error}</div>
  if (!linea || !calculo) return <p className="muted">Preparando documento…</p>
  if (!materialesCSV) return <p className="muted">Cargando materiales…</p>

  return (
    <div className="card">
      <div className="acciones no-print" style={{ marginTop: 0, marginBottom: 16 }}>
        <button className="btn" onClick={() => window.print()}>Imprimir / Guardar PDF</button>
      </div>
      <h2 style={{ fontSize: 22 }}>Materiales y Cantidades — {linea.nombre}</h2>
      {linea.estado !== 'APROBADA' && <div className="note">Documento preliminar: la línea no está aprobada.</div>}
      <div style={{ marginTop: 20 }}>
        <ResumenMateriales linea={linea} calculo={calculo} materialesCSV={materialesCSV} />
      </div>
    </div>
  )
}
