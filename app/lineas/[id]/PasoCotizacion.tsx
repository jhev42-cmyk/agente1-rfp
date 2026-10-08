'use client'

import Link from 'next/link'
import { Calculo, PropsPaso } from './tipos'
import Partidas from './Partidas'
import TablaCotizacion from './TablaCotizacion'

export default function PasoCotizacion(props: PropsPaso & { calculo: Calculo | null }) {
  const { calculo } = props
  if (!calculo) return <div className="card"><p className="muted">Calculando…</p></div>

  return (
    <>
      <div className="card">
        <h2>5. Cotización</h2>
        <div className="sub">
          Los materiales toman el precio vigente del catálogo (<Link href="/catalogo" style={{ color: 'var(--blue)' }}>importable desde Excel/CSV</Link>).
          Mano de obra, transporte e indirectos se agregan como partidas identificadas. Valores en COP.
        </div>
        {calculo.congelado
          ? <div className="info-box">Cotización congelada al enviar a revisión ({new Date(calculo.generado).toLocaleString('es-CO')}): conserva los precios y versiones de norma de ese momento.</div>
          : calculo.cotizacion.sinPrecio.length > 0 && (
            <div className="note">{calculo.cotizacion.sinPrecio.length} partida(s) sin precio: {calculo.cotizacion.sinPrecio.join(', ')}. Importa los precios en el catálogo para completarlas.</div>
          )}
        {!calculo.cotizacion.items.length ? <p className="muted">Aún no hay partidas para cotizar.</p> : (
          <div className="tabla-scroll alto" style={{ marginTop: 12 }}><TablaCotizacion calculo={calculo} /></div>
        )}
      </div>

      <div className="card">
        <h2>Mano de obra, transporte e indirectos</h2>
        <div className="sub">Partidas identificadas con su propio precio unitario. Editar o eliminar una partida pide el motivo y queda en el historial.</div>
        <Partidas {...props} tipos={['MANO_OBRA', 'TRANSPORTE', 'INDIRECTO']} />
      </div>
    </>
  )
}
