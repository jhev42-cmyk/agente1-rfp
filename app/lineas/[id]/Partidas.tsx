'use client'

import { useEffect, useState } from 'react'
import { api, cop, num, TIPO_PARTIDA_LABEL } from '../../lib/cliente'
import { Partida, PropsPaso } from './tipos'

type MaterialCat = { codigo: string; descripcion: string; unidad: string }

// Lista y formulario de partidas generales de la línea. `tipos` define cuáles se gestionan aquí:
// en Materiales solo MATERIAL (ej. conductor); en Cotización mano de obra, transporte e indirectos.
export default function Partidas({ linea, editable, recargar, pedir, tipos }: PropsPaso & { tipos: Partida['tipo'][] }) {
  const esMaterial = tipos.includes('MATERIAL')
  const [materiales, setMateriales] = useState<MaterialCat[]>([])
  const [form, setForm] = useState({ tipo: tipos[0], codigoMaterial: '', descripcion: '', unidad: '', cantidad: '', precioUnitario: '' })
  const [error, setError] = useState('')

  useEffect(() => {
    if (esMaterial) api<MaterialCat[]>('/api/catalogo/materiales').then(setMateriales).catch(() => {})
  }, [esMaterial])

  const partidas = linea.partidas.filter((p) => tipos.includes(p.tipo))

  const crear = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await api(`/api/lineas/${linea.id}/partidas`, {
        body: { ...form, cantidad: Number(form.cantidad), precioUnitario: form.precioUnitario === '' ? undefined : Number(form.precioUnitario) },
      })
      setForm({ ...form, codigoMaterial: '', descripcion: '', unidad: '', cantidad: '', precioUnitario: '' })
      await recargar()
    } catch (err: any) { setError(err.message) }
  }

  const editar = async (p: Partida, campo: 'cantidad' | 'precioUnitario', valor: string) => {
    const v = Number(valor)
    if (!(v >= 0) || v === p[campo]) return
    setError('')
    const motivo = await pedir({ titulo: `Modificar ${campo === 'cantidad' ? 'cantidad' : 'precio'}: ${p.descripcion}`, mensaje: `De ${p[campo] ?? '—'} a ${v}.`, pedirMotivo: true })
    if (motivo === null) return recargar()
    try {
      await api(`/api/lineas/${linea.id}/partidas/${p.id}`, { method: 'PATCH', body: { [campo]: v, motivo } })
      await recargar()
    } catch (err: any) { setError(err.message); await recargar() }
  }

  const eliminar = async (p: Partida) => {
    const motivo = await pedir({ titulo: 'Eliminar partida', mensaje: p.descripcion, pedirMotivo: true, peligro: true, textoConfirmar: 'Eliminar' })
    if (motivo === null) return
    try {
      await api(`/api/lineas/${linea.id}/partidas/${p.id}`, { method: 'DELETE', body: { motivo } })
      await recargar()
    } catch (err: any) { setError(err.message) }
  }

  return (
    <div>
      {partidas.length > 0 && (
        <div className="tabla-scroll">
          <table>
            <thead>
              <tr>
                {!esMaterial && <th>Tipo</th>}<th>Partida</th><th className="num">Cantidad</th><th>Unidad</th>
                {!esMaterial && <th className="num">Precio unitario</th>}{editable && <th></th>}
              </tr>
            </thead>
            <tbody>
              {partidas.map((p) => (
                <tr key={p.id}>
                  {!esMaterial && <td>{TIPO_PARTIDA_LABEL[p.tipo]}</td>}
                  <td>{p.codigoMaterial ? `${p.codigoMaterial} — ` : ''}{p.descripcion}</td>
                  <td className="num">
                    {editable
                      ? <input type="number" min="0" step="any" defaultValue={p.cantidad} key={`c${p.id}-${p.cantidad}`} onBlur={(e) => editar(p, 'cantidad', e.target.value)} />
                      : num(p.cantidad)}
                  </td>
                  <td>{p.unidad}</td>
                  {!esMaterial && (
                    <td className="num">
                      {editable
                        ? <input type="number" min="0" step="any" defaultValue={p.precioUnitario ?? ''} key={`p${p.id}-${p.precioUnitario}`} onBlur={(e) => editar(p, 'precioUnitario', e.target.value)} />
                        : cop(p.precioUnitario)}
                    </td>
                  )}
                  {editable && <td><button className="btn btn-sm btn-claro" onClick={() => eliminar(p)}>Eliminar</button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!partidas.length && <p className="muted">Sin partidas registradas.</p>}

      {editable && (
        <form onSubmit={crear} className="barra-masiva" style={{ marginTop: 14 }}>
          {esMaterial ? (
            <div style={{ minWidth: 320, flex: 1 }}>
              <label>Material del catálogo</label>
              <select required value={form.codigoMaterial} onChange={(e) => setForm({ ...form, codigoMaterial: e.target.value })}>
                <option value="">Seleccione…</option>
                {materiales.map((m) => <option key={m.codigo} value={m.codigo}>{m.codigo} — {m.descripcion.slice(0, 70)} ({m.unidad})</option>)}
              </select>
            </div>
          ) : (
            <>
              <div>
                <label>Tipo</label>
                <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as Partida['tipo'] })}>
                  {tipos.map((t) => <option key={t} value={t}>{TIPO_PARTIDA_LABEL[t]}</option>)}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 220 }}>
                <label>Descripción</label>
                <input type="text" required value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} placeholder="Ej: Hincado y vestida de postes" />
              </div>
              <div style={{ minWidth: 90 }}>
                <label>Unidad</label>
                <input type="text" value={form.unidad} onChange={(e) => setForm({ ...form, unidad: e.target.value })} placeholder="GLB, UN, km…" />
              </div>
              <div style={{ minWidth: 130 }}>
                <label>Precio unitario</label>
                <input type="number" required min="0" step="any" value={form.precioUnitario} onChange={(e) => setForm({ ...form, precioUnitario: e.target.value })} />
              </div>
            </>
          )}
          <div style={{ minWidth: 110 }}>
            <label>Cantidad</label>
            <input type="number" required min="0.001" step="any" value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} />
          </div>
          <button className="btn btn-sm">Agregar partida</button>
        </form>
      )}
      {error && <div className="error-box">{error}</div>}
    </div>
  )
}
