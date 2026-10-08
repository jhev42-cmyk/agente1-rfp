'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import Marco from '../../components/Marco'
import { useDialogo } from '../../components/Dialogo'
import { api, ESTADO_LABEL } from '../../lib/cliente'
import { Calculo, Linea, NormaResumen } from './tipos'
import PasoLinea from './PasoLinea'
import PasoTrayectos from './PasoTrayectos'
import PasoPostes from './PasoPostes'
import PasoMateriales from './PasoMateriales'
import PasoCotizacion from './PasoCotizacion'
import PasoRevision from './PasoRevision'

const PASOS = ['Línea', 'Trayectos', 'Postes', 'Materiales', 'Cotización', 'Revisión y aprobación']

export default function LineaPage({ params }: { params: { id: string } }) {
  return <Marco><Espacio id={params.id} /></Marco>
}

function Espacio({ id }: { id: string }) {
  const [linea, setLinea] = useState<Linea | null>(null)
  const [normas, setNormas] = useState<NormaResumen[]>([])
  const [calculo, setCalculo] = useState<Calculo | null>(null)
  const [paso, setPaso] = useState(0)
  const [error, setError] = useState('')
  const { pedir, elemento } = useDialogo()

  const cargarCalculo = useCallback(async () => {
    setCalculo(await api<Calculo>(`/api/lineas/${id}/calculo`))
  }, [id])

  const recargar = useCallback(async () => {
    try {
      const l = await api<Linea>(`/api/lineas/${id}`)
      setLinea(l)
      setNormas(await api<NormaResumen[]>(`/api/catalogo/normas?operador=${l.operador}`))
      await cargarCalculo()
    } catch (e: any) {
      setError(e.message)
    }
  }, [id, cargarCalculo])

  useEffect(() => { recargar() }, [recargar])

  // Al pasar a los pasos de cálculo se refresca, por si cambiaron precios o el catálogo.
  useEffect(() => { if (paso >= 3 && linea) cargarCalculo().catch(() => {}) }, [paso]) // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <div className="error-box">{error}</div>
  if (!linea) return <p className="muted">Cargando línea…</p>

  const editable = linea.estado === 'BORRADOR'
  const totalPostes = linea.trayectos.reduce((a, t) => a + t.cantidadPostes, 0)
  const pendientes = linea.postes.filter((p) => !p.normaId || !p.configuracionId).length
  const props = { linea, editable, recargar, pedir }
  const alertas = [false, totalPostes === 0, pendientes > 0, false, (calculo?.cotizacion.sinPrecio.length || 0) > 0, false]

  return (
    <>
      <div className="titulo-pagina">
        <div>
          <div className="muted"><Link href="/lineas">← Líneas</Link></div>
          <h1>{linea.nombre}</h1>
          <div className="meta">
            Revisión {linea.revision} · {linea.operador} · {totalPostes} postes · <span className={`estado estado-${linea.estado}`}>{ESTADO_LABEL[linea.estado]}</span>
          </div>
        </div>
      </div>

      {!editable && (
        <div className="info-box">
          {linea.estado === 'APROBADA'
            ? 'Línea aprobada: la cotización está congelada con las versiones de norma y precios usados. Para modificarla crea una nueva revisión en el paso 6.'
            : 'Línea en revisión: no se puede editar y su cotización quedó congelada al enviarla. Devuélvela a borrador en el paso 6 para hacer cambios.'}
        </div>
      )}

      <div className="pasos">
        {PASOS.map((p, i) => (
          <button key={p} className={paso === i ? 'activo' : ''} onClick={() => setPaso(i)}>
            <span className="num">{i + 1}</span>{p}{alertas[i] && <span className="alerta">●</span>}
          </button>
        ))}
      </div>

      {paso === 0 && <PasoLinea {...props} />}
      {paso === 1 && <PasoTrayectos {...props} />}
      {paso === 2 && <PasoPostes {...props} normas={normas} />}
      {paso === 3 && <PasoMateriales {...props} calculo={calculo} />}
      {paso === 4 && <PasoCotizacion {...props} calculo={calculo} />}
      {paso === 5 && <PasoRevision {...props} calculo={calculo} />}

      {elemento}
    </>
  )
}
