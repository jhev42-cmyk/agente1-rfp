import { Fragment } from 'react'
import { cop, num, TIPO_PARTIDA_LABEL } from '../../lib/cliente'
import { Calculo } from './tipos'

const ORDEN = ['MATERIAL', 'MANO_OBRA', 'TRANSPORTE', 'INDIRECTO'] as const

// Detalle de la cotización agrupado por tipo de partida, con subtotales y total. Se usa en el
// paso 5 y en la vista de impresión (PDF).
export default function TablaCotizacion({ calculo, mostrarFuente = true }: { calculo: Calculo; mostrarFuente?: boolean }) {
  const c = calculo.cotizacion
  return (
    <table>
      <thead>
        <tr><th>Código</th><th>Descripción</th><th>Unidad</th><th className="num">Cantidad</th><th className="num">Precio unitario</th><th className="num">Subtotal</th>{mostrarFuente && <th>Fuente</th>}</tr>
      </thead>
      <tbody>
        {ORDEN.map((tipo) => {
          const items = c.items.filter((i) => i.tipo === tipo)
          if (!items.length) return null
          return (
            <Fragment key={tipo}>
              <tr className="grupo"><td colSpan={mostrarFuente ? 7 : 6}>{TIPO_PARTIDA_LABEL[tipo]}</td></tr>
              {items.map((i, k) => (
                <tr key={`${tipo}-${k}`} className={i.precioUnitario == null ? 'pendiente' : ''}>
                  <td>{i.codigo || '—'}</td>
                  <td>{i.descripcion}</td>
                  <td>{i.unidad}</td>
                  <td className="num">{num(i.cantidad)}</td>
                  <td className="num">{i.precioUnitario == null ? <span className="etiqueta-pend">Sin precio</span> : cop(i.precioUnitario)}</td>
                  <td className="num">{cop(i.subtotal)}</td>
                  {mostrarFuente && <td className="muted">{i.fuentePrecio || '—'}</td>}
                </tr>
              ))}
              <tr className="subtotal"><td colSpan={5}>Subtotal {TIPO_PARTIDA_LABEL[tipo].toLowerCase()}</td><td className="num">{cop(c.subtotales[tipo])}</td>{mostrarFuente && <td></td>}</tr>
            </Fragment>
          )
        })}
        <tr className="total"><td colSpan={5}>Total{c.sinPrecio.length ? ' (parcial: hay partidas sin precio)' : ''}</td><td className="num">{cop(c.total)}</td>{mostrarFuente && <td></td>}</tr>
      </tbody>
    </table>
  )
}
