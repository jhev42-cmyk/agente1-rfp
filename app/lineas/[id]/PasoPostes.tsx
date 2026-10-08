'use client'

import { useEffect, useMemo, useState } from 'react'
import EsquemaNorma from '../../components/EsquemaNorma'
import { api, num } from '../../lib/cliente'
import { ModoAsignacion, NormaDetalle, NormaResumen, Poste, PropsPaso, etiquetaNorma } from './tipos'

export default function PasoPostes({ linea, editable, recargar, pedir, normas }: PropsPaso & { normas: NormaResumen[] }) {
  const conPostes = linea.trayectos.filter((t) => t.cantidadPostes > 0)
  // Vista de trabajo: la elegida en el paso 2, pero se puede alternar aquí en cualquier momento.
  const [modo, setModo] = useState<ModoAsignacion>(linea.modoAsignacion || 'CORRIDO')
  const [trayectoActivo, setTrayectoActivo] = useState(conPostes[0]?.numero || 1)
  const [filtroTrayecto, setFiltroTrayecto] = useState(0)
  const [trayectoNorma, setTrayectoNorma] = useState('')
  const [trayectoConfig, setTrayectoConfig] = useState('')
  const [soloPendientes, setSoloPendientes] = useState(false)
  const [seleccion, setSeleccion] = useState<Set<number>>(new Set())
  const [activo, setActivo] = useState<number | null>(null)
  const [masivaNorma, setMasivaNorma] = useState('')
  const [masivaConfig, setMasivaConfig] = useState('')
  const [copiarDe, setCopiarDe] = useState('')
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [detalles, setDetalles] = useState<Record<number, NormaDetalle>>({})

  const normaPorId = useMemo(() => new Map(normas.map((n) => [n.id, n])), [normas])
  const vigentes = normas.filter((n) => n.vigente)
  const pendiente = (p: Poste) => !p.normaId || !p.configuracionId
  const porTrayecto = modo === 'TRAYECTO'
  const trayectoVista = porTrayecto ? trayectoActivo : filtroTrayecto
  const visibles = linea.postes.filter((p) =>
    (!trayectoVista || p.trayecto === trayectoVista) && (!soloPendientes || pendiente(p)))
  const postesTrayecto = linea.postes.filter((p) => p.trayecto === trayectoActivo)
  const pendientesDe = (n: number) => linea.postes.filter((p) => p.trayecto === n && pendiente(p)).length
  const totalPendientes = linea.postes.filter(pendiente).length
  // Las acciones masivas solo se aplican a postes seleccionados que están a la vista con el filtro actual.
  const seleccionVisible = visibles.filter((p) => seleccion.has(p.id)).map((p) => p.id)
  const posteActivo = linea.postes.find((p) => p.id === activo) || null
  const normaActiva = posteActivo?.normaId ? normaPorId.get(posteActivo.normaId) : undefined

  // Detalle (materiales) de la norma del poste activo, con caché por versión.
  useEffect(() => {
    const id = posteActivo?.normaId
    if (!id || detalles[id]) return
    api<NormaDetalle>(`/api/catalogo/normas/${id}`).then((d) => setDetalles((x) => ({ ...x, [id]: d }))).catch(() => {})
  }, [posteActivo?.normaId]) // eslint-disable-line react-hooks/exhaustive-deps

  const asignar = async (posteIds: number[], normaId: number | null, configuracionId: number | null) => {
    setError(''); setOk('')
    const afectados = linea.postes.filter((p) => posteIds.includes(p.id))
    const reemplaza = afectados.filter((p) => p.normaId && (p.normaId !== normaId || p.configuracionId !== configuracionId))
    let motivo: string | undefined
    if (reemplaza.length) {
      const m = await pedir({
        titulo: normaId ? 'Cambiar norma de postes configurados' : 'Quitar norma',
        mensaje: `${reemplaza.length} poste(s) ya tienen norma y se modificarán:`,
        lista: reemplaza.slice(0, 50).map((p) => `${p.codigo} — ${etiquetaPoste(p)}`).concat(reemplaza.length > 50 ? [`… y ${reemplaza.length - 50} más`] : []),
        pedirMotivo: true,
      })
      if (m === null) return false
      motivo = m
    }
    setOcupado(true)
    try {
      const r = await api<{ actualizados: number }>(`/api/lineas/${linea.id}/postes`, { method: 'PATCH', body: { posteIds, normaId, configuracionId, motivo } })
      await recargar()
      setOk(`${r.actualizados} poste(s) actualizados.`)
      return true
    } catch (e: any) {
      setError(e.message)
      return false
    } finally {
      setOcupado(false)
    }
  }

  const etiquetaPoste = (p: Poste) => {
    const n = p.normaId ? normaPorId.get(p.normaId) : undefined
    if (!n) return 'sin norma'
    const c = n.configuraciones.find((x) => x.id === p.configuracionId)
    return `${etiquetaNorma(n)}${c ? ` · ${c.nombre}` : ' · configuración pendiente'}`
  }

  const cambiarNormaFila = (p: Poste, valor: string) => {
    const n = valor ? normaPorId.get(Number(valor)) : undefined
    asignar([p.id], n ? n.id : null, n && n.configuraciones.length === 1 ? n.configuraciones[0].id : null)
  }

  const aplicarMasiva = async () => {
    const n = normaPorId.get(Number(masivaNorma))
    if (!n) return
    const conf = n.configuraciones.length === 1 ? n.configuraciones[0].id : Number(masivaConfig) || null
    if (await asignar(seleccionVisible, n.id, conf)) setSeleccion(new Set())
  }

  const copiarSeleccion = async () => {
    const origen = linea.postes.find((p) => p.codigo === copiarDe.trim().toUpperCase())
    if (!origen) return setError(`No existe el poste ${copiarDe}`)
    if (!origen.normaId) return setError(`El poste ${origen.codigo} no tiene norma para copiar`)
    if (await asignar(seleccionVisible.filter((id) => id !== origen.id), origen.normaId, origen.configuracionId)) setSeleccion(new Set())
  }

  const alternar = (id: number) => {
    const s = new Set(seleccion)
    if (s.has(id)) s.delete(id)
    else s.add(id)
    setSeleccion(s)
  }

  const normaMasiva = normaPorId.get(Number(masivaNorma))
  const normaTrayecto = normaPorId.get(Number(trayectoNorma))

  // Aplica una norma a todos los postes del trayecto activo (pide motivo si alguno ya estaba configurado).
  const aplicarTrayecto = async () => {
    if (!normaTrayecto) return
    const conf = normaTrayecto.configuraciones.length === 1 ? normaTrayecto.configuraciones[0].id : Number(trayectoConfig) || null
    if (await asignar(postesTrayecto.map((p) => p.id), normaTrayecto.id, conf)) { setTrayectoNorma(''); setTrayectoConfig('') }
  }

  // Al cambiar de vista se limpian la selección, la norma elegida para el trayecto y los mensajes.
  const reiniciarVista = () => { setSeleccion(new Set()); setActivo(null); setTrayectoNorma(''); setTrayectoConfig(''); setOk(''); setError('') }
  const cambiarModo = (m: ModoAsignacion) => { setModo(m); reiniciarVista() }
  const irATrayecto = (n: number) => { setTrayectoActivo(n); reiniciarVista() }

  // Resumen de normas usadas en el trayecto activo.
  const resumenTrayecto = Object.entries(postesTrayecto.reduce<Record<string, number>>((acc, p) => {
    const k = p.normaId ? etiquetaPoste(p) : 'Pendiente'
    acc[k] = (acc[k] || 0) + 1
    return acc
  }, {}))

  if (!linea.postes.length) {
    return <div className="card"><h2>3. Postes</h2><p className="muted">Primero define la cantidad de postes por trayecto en el paso 2.</p></div>
  }

  return (
    <div className="card">
      <h2>3. Configuración de postes</h2>
      <div className="sub">Selecciona la norma de cada poste. Al elegirla se muestran el tipo de poste, la versión, el esquema y los materiales. Puedes trabajar de corrido sobre toda la línea o por trayecto; en ambos modos se puede editar cada poste individualmente.</div>

      <div className="modo-toggle">
        <button className={!porTrayecto ? 'activo' : ''} onClick={() => cambiarModo('CORRIDO')}>De corrido (individual)</button>
        <button className={porTrayecto ? 'activo' : ''} onClick={() => cambiarModo('TRAYECTO')}>Por trayecto</button>
      </div>
      {!linea.modoAsignacion && editable && <div className="muted" style={{ marginTop: -8, marginBottom: 12 }}>Aún no se eligió el modo preferido en el paso 2; se muestra de corrido.</div>}

      <div className="kpis">
        <div className="kpi"><div className="v">{linea.postes.length}</div><div className="k">Postes</div></div>
        <div className="kpi"><div className="v" style={{ color: totalPendientes ? 'var(--warn)' : 'var(--ok)' }}>{totalPendientes}</div><div className="k">Pendientes de configurar</div></div>
        <div className="kpi"><div className="v">{seleccion.size}</div><div className="k">Seleccionados</div></div>
      </div>

      {porTrayecto && (
        <>
          <div className="subpasos">
            {conPostes.map((t) => (
              <button key={t.numero} className={trayectoActivo === t.numero ? 'activo' : ''} onClick={() => irATrayecto(t.numero)}>
                3.{t.numero} · Trayecto {t.numero} ({t.cantidadPostes}){pendientesDe(t.numero) > 0 && <span className="pend"> · {pendientesDe(t.numero)} pend.</span>}
              </button>
            ))}
          </div>
          <div className="barra-trayecto">
            <h3>3.{trayectoActivo} Trayecto {trayectoActivo} — {postesTrayecto.length} postes, {pendientesDe(trayectoActivo)} pendientes</h3>
            <div className="muted" style={{ width: '100%' }}>{resumenTrayecto.map(([k, v]) => `${k}: ${v}`).join(' · ')}</div>
            {editable && (
              <>
                <div style={{ minWidth: 260 }}>
                  <label>Norma para todo el trayecto</label>
                  <select value={trayectoNorma} onChange={(e) => { setTrayectoNorma(e.target.value); setTrayectoConfig('') }}>
                    <option value="">Seleccione…</option>
                    {vigentes.map((n) => <option key={n.id} value={n.id}>{etiquetaNorma(n)} — {n.tipoPoste}</option>)}
                  </select>
                </div>
                {normaTrayecto && normaTrayecto.configuraciones.length > 1 && (
                  <div>
                    <label>Configuración</label>
                    <select value={trayectoConfig} onChange={(e) => setTrayectoConfig(e.target.value)}>
                      <option value="">Seleccione…</option>
                      {normaTrayecto.configuraciones.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </div>
                )}
                <button className="btn btn-sm" disabled={!normaTrayecto || ocupado || (normaTrayecto.configuraciones.length > 1 && !trayectoConfig)} onClick={aplicarTrayecto}>
                  Aplicar a los {postesTrayecto.length} postes del trayecto
                </button>
              </>
            )}
          </div>
        </>
      )}

      <div className="filter-row">
        {!porTrayecto && <div>
          <label>Trayecto</label>
          <select value={filtroTrayecto} onChange={(e) => { setFiltroTrayecto(Number(e.target.value)); setSeleccion(new Set()) }}>
            <option value={0}>Todos</option>
            {conPostes.map((t) => <option key={t.numero} value={t.numero}>Trayecto {t.numero} ({t.cantidadPostes})</option>)}
          </select>
        </div>}
        <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontWeight: 400, alignSelf: 'flex-end', marginBottom: 10 }}>
          <input type="checkbox" checked={soloPendientes} onChange={(e) => { setSoloPendientes(e.target.checked); setSeleccion(new Set()) }} /> Solo pendientes
        </label>
      </div>

      {editable && (
        <div className="barra-masiva">
          <div>
            <label>Norma para los seleccionados</label>
            <select value={masivaNorma} onChange={(e) => { setMasivaNorma(e.target.value); setMasivaConfig('') }}>
              <option value="">Seleccione…</option>
              {vigentes.map((n) => <option key={n.id} value={n.id}>{etiquetaNorma(n)} — {n.tipoPoste}</option>)}
            </select>
          </div>
          {normaMasiva && normaMasiva.configuraciones.length > 1 && (
            <div>
              <label>Configuración</label>
              <select value={masivaConfig} onChange={(e) => setMasivaConfig(e.target.value)}>
                <option value="">Seleccione…</option>
                {normaMasiva.configuraciones.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
          )}
          <button className="btn btn-sm" disabled={!seleccionVisible.length || !masivaNorma || ocupado || (normaMasiva!.configuraciones.length > 1 && !masivaConfig)} onClick={aplicarMasiva}>Aplicar a {seleccionVisible.length}</button>
          <div>
            <label>Copiar norma del poste</label>
            <input type="text" placeholder="T01-P001" value={copiarDe} onChange={(e) => setCopiarDe(e.target.value)} />
          </div>
          <button className="btn btn-sm btn-claro" disabled={!seleccionVisible.length || !copiarDe.trim() || ocupado} onClick={copiarSeleccion}>Copiar a {seleccionVisible.length}</button>
          <div style={{ minWidth: 0 }}>
            <button className="btn btn-sm btn-claro" onClick={() => setSeleccion(new Set(visibles.map((p) => p.id)))}>Seleccionar visibles ({visibles.length})</button>{' '}
            <button className="btn btn-sm btn-claro" disabled={!seleccion.size} onClick={() => setSeleccion(new Set())}>Limpiar</button>
          </div>
        </div>
      )}
      {error && <div className="error-box">{error}</div>}
      {ok && <div className="ok-box">{ok}</div>}

      <div className="layout-postes">
        <div className="tabla-scroll alto">
          <table>
            <thead>
              <tr>{editable && <th style={{ width: 34 }}></th>}<th>Poste</th><th>Norma</th><th>Configuración</th><th>Tipo de poste</th><th>Estado</th></tr>
            </thead>
            <tbody>
              {visibles.map((p) => {
                const n = p.normaId ? normaPorId.get(p.normaId) : undefined
                const opciones = n && !n.vigente ? [n, ...vigentes] : vigentes
                return (
                  <tr key={p.id} className={`${pendiente(p) ? 'pendiente' : ''} ${activo === p.id ? 'seleccionado' : ''}`} onClick={() => setActivo(p.id)} style={{ cursor: 'pointer' }}>
                    {editable && <td onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={seleccion.has(p.id)} onChange={() => alternar(p.id)} /></td>}
                    <td style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12.5, whiteSpace: 'nowrap' }}>{p.codigo}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <select style={{ minWidth: 150 }} value={p.normaId || ''} disabled={!editable || ocupado} onChange={(e) => cambiarNormaFila(p, e.target.value)} onFocus={() => setActivo(p.id)}>
                        <option value="">— Sin norma —</option>
                        {opciones.map((o) => <option key={o.id} value={o.id}>{etiquetaNorma(o)}{o.vigente ? '' : ' (versión anterior)'}</option>)}
                      </select>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      {n && n.configuraciones.length > 1 ? (
                        <select value={p.configuracionId || ''} disabled={!editable || ocupado} onChange={(e) => asignar([p.id], n.id, Number(e.target.value) || null)}>
                          <option value="">Seleccione…</option>
                          {n.configuraciones.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                        </select>
                      ) : <span className="muted">{n?.configuraciones.find((c) => c.id === p.configuracionId)?.nombre || '—'}</span>}
                    </td>
                    <td className="muted">{n?.tipoPoste || '—'}</td>
                    <td>{pendiente(p) ? <span className="etiqueta-pend">Pendiente</span> : <span className="etiqueta-ok">Configurado</span>}</td>
                  </tr>
                )
              })}
              {!visibles.length && <tr><td colSpan={6} className="muted">No hay postes con este filtro.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="panel-norma">
          {!posteActivo ? <p className="muted">Selecciona un poste para ver su estructura y materiales.</p> : (
            <>
              <div className="muted">Poste {posteActivo.codigo} · Trayecto {posteActivo.trayecto}</div>
              {!normaActiva ? <p className="etiqueta-pend">Sin norma asignada.</p> : (
                <>
                  <h3>{etiquetaNorma(normaActiva)} {!normaActiva.vigente && <span className="etiqueta-pend">(versión anterior)</span>}</h3>
                  <div style={{ fontSize: 13 }}><b>Tipo de poste:</b> {normaActiva.tipoPoste}</div>
                  <div className="muted">{normaActiva.descripcion}</div>
                  <EsquemaNorma normaId={normaActiva.id} tieneImagen={normaActiva.tieneImagen} />
                  {(() => {
                    const d = detalles[normaActiva.id]
                    const conf = d?.configuraciones.find((c) => c.id === posteActivo.configuracionId)
                    if (!d) return <p className="muted">Cargando materiales…</p>
                    if (!conf) return <p className="etiqueta-pend">Selecciona la configuración para ver sus materiales.</p>
                    return (
                      <>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', margin: '6px 0' }}>Materiales · {conf.nombre}</div>
                        <div className="tabla-scroll" style={{ maxHeight: 300, overflowY: 'auto' }}>
                          <table style={{ fontSize: 12 }}>
                            <thead><tr><th>Código</th><th>Material</th><th className="num">Cant.</th></tr></thead>
                            <tbody>
                              {conf.materiales.map((m) => (
                                <tr key={m.codigoMaterial}>
                                  <td>{m.codigoMaterial}</td>
                                  <td title={m.observacion || ''}>{m.descripcion.length > 60 ? m.descripcion.slice(0, 60) + '…' : m.descripcion}</td>
                                  <td className="num">{num(m.cantidad)} {m.unidad}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )
                  })()}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
