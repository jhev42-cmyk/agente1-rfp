'use client'

import { useCallback, useEffect, useState } from 'react'
import Marco, { useUsuario } from '../components/Marco'
import EsquemaNorma from '../components/EsquemaNorma'
import { useDialogo } from '../components/Dialogo'
import { api, ApiError, cop, fecha, guardarBlob, num } from '../lib/cliente'
import { NormaDetalle, NormaResumen } from '../lineas/[id]/tipos'

type Material = {
  codigo: string; descripcion: string; unidad: string; categoria: string
  precio: { valor: number; proveedor: string | null; lote: string; fecha: string; importadoPor: string } | null
}
type Registro = { id: number; entidad: string; entidadId: string; accion: string; valorAnterior: string | null; valorNuevo: string | null; motivo: string; usuario: string; fecha: string }

export default function CatalogoPage() {
  return <Marco><Catalogo /></Marco>
}

function Catalogo() {
  const [tab, setTab] = useState<'normas' | 'precios' | 'historial'>('normas')
  const { pedir, elemento } = useDialogo()
  return (
    <>
      <div className="titulo-pagina">
        <div>
          <h1>Catálogo central</h1>
          <div className="meta">Normas de estructura por operador (con versiones, esquema y materiales) y precios de materiales.</div>
        </div>
      </div>
      <div className="pasos">
        <button className={tab === 'normas' ? 'activo' : ''} onClick={() => setTab('normas')}>Normas</button>
        <button className={tab === 'precios' ? 'activo' : ''} onClick={() => setTab('precios')}>Precios de materiales</button>
        <button className={tab === 'historial' ? 'activo' : ''} onClick={() => setTab('historial')}>Historial del catálogo</button>
      </div>
      {tab === 'normas' && <Normas pedir={pedir} />}
      {tab === 'precios' && <Precios />}
      {tab === 'historial' && <Historial />}
      {elemento}
    </>
  )
}

// ─── Normas ──────────────────────────────────────────────────────────────────

function Normas({ pedir }: { pedir: ReturnType<typeof useDialogo>['pedir'] }) {
  const usuario = useUsuario()
  const esAdmin = usuario.role === 'admin'
  const [operador, setOperador] = useState('EPM')
  const [normas, setNormas] = useState<NormaResumen[]>([])
  const [verAnteriores, setVerAnteriores] = useState(false)
  const [sel, setSel] = useState<number | null>(null)
  const [detalle, setDetalle] = useState<NormaDetalle | null>(null)
  const [editando, setEditando] = useState<NormaDetalle | null>(null)
  const [materiales, setMateriales] = useState<Material[]>([])
  const [imagen, setImagen] = useState<File | null>(null)
  const [verImagen, setVerImagen] = useState(0)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  const cargar = useCallback(async () => {
    setNormas(await api<NormaResumen[]>(`/api/catalogo/normas?operador=${operador}`))
  }, [operador])

  useEffect(() => { cargar(); setSel(null) }, [cargar])
  useEffect(() => { api<Material[]>('/api/catalogo/materiales').then(setMateriales).catch(() => {}) }, [])
  useEffect(() => {
    setDetalle(null); setEditando(null); setError(''); setOk('')
    if (sel) api<NormaDetalle>(`/api/catalogo/normas/${sel}`).then(setDetalle).catch((e) => setError(e.message))
  }, [sel])

  const lista = normas.filter((n) => verAnteriores || n.vigente)

  const subirImagen = async () => {
    if (!imagen || !detalle) return
    const motivo = await pedir({ titulo: `Esquema de ${detalle.codigo} v${detalle.version}`, mensaje: imagen.name, pedirMotivo: true })
    if (motivo === null) return
    const fd = new FormData()
    fd.append('archivo', imagen)
    fd.append('motivo', motivo)
    try {
      await api(`/api/catalogo/normas/${detalle.id}/imagen`, { form: fd })
      setImagen(null)
      setVerImagen((v) => v + 1)
      await cargar()
      setDetalle(await api<NormaDetalle>(`/api/catalogo/normas/${detalle.id}`))
      setOk('Esquema guardado.')
    } catch (e: any) { setError(e.message) }
  }

  const guardarVersion = async () => {
    if (!editando || !detalle) return
    const motivo = await pedir({
      titulo: `Crear ${detalle.codigo} v${detalle.version + 1}`,
      mensaje: 'Los postes ya configurados con la versión actual la conservan; las nuevas selecciones usarán la nueva versión.',
      pedirMotivo: true, textoConfirmar: 'Crear versión',
    })
    if (motivo === null) return
    try {
      const r = await api<{ id: number }>(`/api/catalogo/normas/${detalle.id}`, {
        body: { tipoPoste: editando.tipoPoste, descripcion: editando.descripcion, configuraciones: editando.configuraciones, motivo },
      })
      await cargar()
      setSel(r.id)
      setOk('Nueva versión creada.')
    } catch (e: any) { setError(e.message) }
  }

  const editarCantidad = (ci: number, mi: number, valor: string) => {
    if (!editando) return
    const copia = structuredClone(editando)
    copia.configuraciones[ci].materiales[mi].cantidad = Number(valor)
    setEditando(copia)
  }
  const quitarMaterial = (ci: number, mi: number) => {
    const copia = structuredClone(editando!)
    copia.configuraciones[ci].materiales.splice(mi, 1)
    setEditando(copia)
  }
  const agregarMaterial = (ci: number, codigo: string) => {
    const m = materiales.find((x) => x.codigo === codigo)
    if (!m) return
    const copia = structuredClone(editando!)
    copia.configuraciones[ci].materiales.push({ codigoMaterial: m.codigo, descripcion: m.descripcion, unidad: m.unidad, cantidad: 1, observacion: null })
    setEditando(copia)
  }
  const agregarConfiguracion = () => {
    const copia = structuredClone(editando!)
    copia.configuraciones.push({ id: -Date.now(), nombre: `Configuración ${copia.configuraciones.length + 1}`, materiales: [] })
    setEditando(copia)
  }

  const vista = editando || detalle

  return (
    <div className="layout-postes" style={{ gridTemplateColumns: 'minmax(0, 380px) minmax(0, 1fr)' }}>
      <div className="card" style={{ marginBottom: 0 }}>
        <div className="filter-row">
          <div>
            <label>Operador</label>
            <select value={operador} onChange={(e) => setOperador(e.target.value)}>
              <option value="EPM">EPM</option>
              <option value="ENEL">ENEL</option>
            </select>
          </div>
        </div>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontWeight: 400, marginBottom: 10 }}>
          <input type="checkbox" checked={verAnteriores} onChange={(e) => setVerAnteriores(e.target.checked)} /> Ver versiones anteriores
        </label>
        <table>
          <thead><tr><th>Norma</th><th>Tipo de poste</th></tr></thead>
          <tbody>
            {lista.map((n) => (
              <tr key={n.id} className={sel === n.id ? 'seleccionado' : ''} style={{ cursor: 'pointer' }} onClick={() => setSel(n.id)}>
                <td style={{ whiteSpace: 'nowrap' }}><b>{n.codigo}</b> v{n.version}{!n.vigente && <div className="muted">anterior</div>}</td>
                <td className="muted">{n.tipoPoste}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        {!vista ? <p className="muted">{sel ? 'Cargando…' : 'Selecciona una norma para ver su detalle.'}</p> : (
          <>
            <h2>{vista.operador} {vista.codigo} · versión {vista.version}{editando && ` → ${vista.version + 1} (edición)`}</h2>
            {!vista.vigente && <div className="info-box">Versión anterior. Se conserva para los postes y cotizaciones que la usan.</div>}
            <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div>
                <label>Tipo de poste</label>
                <input type="text" value={vista.tipoPoste} disabled={!editando} onChange={(e) => setEditando({ ...editando!, tipoPoste: e.target.value })} />
              </div>
              <div>
                <label>Descripción</label>
                <input type="text" value={vista.descripcion} disabled={!editando} onChange={(e) => setEditando({ ...editando!, descripcion: e.target.value })} />
              </div>
            </div>
            <p className="muted">Creada por {vista.creadoPor} el {fecha(vista.createdAt)} — {vista.motivo}</p>

            {!editando && (
              <>
                <EsquemaNorma normaId={vista.id} tieneImagen={vista.tieneImagen} version={verImagen} />
                {esAdmin && (
                  <div className="acciones" style={{ marginTop: 0 }}>
                    <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(e) => setImagen(e.target.files?.[0] || null)} />
                    <button className="btn btn-sm btn-claro" disabled={!imagen} onClick={subirImagen}>{vista.tieneImagen ? 'Reemplazar esquema' : 'Cargar esquema'}</button>
                  </div>
                )}
              </>
            )}

            {vista.configuraciones.map((c, ci) => (
              <div key={c.id} style={{ marginTop: 18 }}>
                {editando
                  ? <input type="text" value={c.nombre} style={{ maxWidth: 320, fontWeight: 600 }} onChange={(e) => { const x = structuredClone(editando); x.configuraciones[ci].nombre = e.target.value; setEditando(x) }} />
                  : <h3 style={{ color: 'var(--navy)', fontSize: 15, margin: '0 0 6px' }}>{c.nombre}</h3>}
                <div className="tabla-scroll">
                  <table style={{ fontSize: 12.5 }}>
                    <thead><tr><th>Código</th><th>Material</th><th className="num">Cantidad</th><th>Unidad</th>{editando && <th></th>}</tr></thead>
                    <tbody>
                      {c.materiales.map((m, mi) => (
                        <tr key={`${m.codigoMaterial}-${mi}`}>
                          <td>{m.codigoMaterial}</td>
                          <td title={m.observacion || ''}>{m.descripcion}{m.observacion && <div className="muted">{m.observacion}</div>}</td>
                          <td className="num">{editando ? <input type="number" min="0" step="any" value={m.cantidad} onChange={(e) => editarCantidad(ci, mi, e.target.value)} /> : num(m.cantidad)}</td>
                          <td>{m.unidad}</td>
                          {editando && <td><button className="btn btn-sm btn-claro" onClick={() => quitarMaterial(ci, mi)}>Quitar</button></td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {editando && (
                  <select value="" style={{ maxWidth: 420, marginTop: 8 }} onChange={(e) => agregarMaterial(ci, e.target.value)}>
                    <option value="">+ Agregar material…</option>
                    {materiales.filter((m) => !c.materiales.some((x) => x.codigoMaterial === m.codigo)).map((m) => <option key={m.codigo} value={m.codigo}>{m.codigo} — {m.descripcion.slice(0, 70)}</option>)}
                  </select>
                )}
              </div>
            ))}

            {esAdmin && vista.vigente && (
              <div className="acciones">
                {!editando
                  ? <button className="btn" onClick={() => setEditando(structuredClone(detalle!))}>Editar materiales (nueva versión)</button>
                  : <>
                    <button className="btn" onClick={guardarVersion}>Guardar como versión {vista.version + 1}</button>
                    <button className="btn btn-claro" onClick={agregarConfiguracion}>Agregar configuración</button>
                    <button className="btn btn-claro" onClick={() => setEditando(null)}>Cancelar</button>
                  </>}
              </div>
            )}
            {!esAdmin && <p className="muted">Solo un administrador puede modificar el catálogo.</p>}
          </>
        )}
        {error && <div className="error-box">{error}</div>}
        {ok && <div className="ok-box">{ok}</div>}
      </div>
    </div>
  )
}

// ─── Precios ─────────────────────────────────────────────────────────────────

type FilaImport = { fila: number; codigo: string; precio: number; proveedor: string; error?: string }

const normalizar = (s: unknown) => String(s ?? '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

function Precios() {
  const usuario = useUsuario()
  const esAdmin = usuario.role === 'admin'
  const [materiales, setMateriales] = useState<Material[]>([])
  const [filas, setFilas] = useState<FilaImport[] | null>(null)
  const [archivo, setArchivo] = useState('')
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState('')
  const [errores, setErrores] = useState<string[]>([])
  const [ok, setOk] = useState('')

  const cargar = () => api<Material[]>('/api/catalogo/materiales').then(setMateriales)
  useEffect(() => { cargar().catch((e) => setError(e.message)) }, [])

  const plantilla = async () => {
    const XLSX = await import('xlsx')
    const hoja = XLSX.utils.aoa_to_sheet([
      ['codigo', 'descripcion', 'unidad', 'precio', 'proveedor'],
      ...materiales.map((m) => [m.codigo, m.descripcion, m.unidad, m.precio?.valor ?? '', m.precio?.proveedor ?? '']),
    ])
    hoja['!cols'] = [{ wch: 8 }, { wch: 70 }, { wch: 8 }, { wch: 14 }, { wch: 30 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, hoja, 'Precios')
    guardarBlob(new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })]), 'plantilla_precios_materiales.xlsx')
  }

  // El archivo se lee en el navegador; al servidor solo llegan las filas (código, precio, proveedor).
  const leer = async (f: File | undefined) => {
    setFilas(null); setError(''); setErrores([]); setOk('')
    if (!f) return
    setArchivo(f.name)
    try {
      const XLSX = await import('xlsx')
      const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' })
      const datos = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]], { header: 1, blankrows: false })
      const enc = (datos[0] || []).map(normalizar)
      const col = (...nombres: string[]) => enc.findIndex((h) => nombres.includes(h))
      const cCodigo = col('codigo', 'cod', 'item', 'codigo material')
      const cPrecio = col('precio', 'precio unitario', 'precio_unitario', 'valor', 'valor unitario')
      const cProv = col('proveedor')
      if (cCodigo < 0 || cPrecio < 0) throw new Error('El archivo debe tener columnas "codigo" y "precio" en la primera fila. Descarga la plantilla como referencia.')
      const validos = new Set(materiales.map((m) => m.codigo))
      const vistos = new Set<string>()
      const resultado = datos.slice(1)
        .map((r, i) => ({ r, fila: i + 2 }))
        .filter(({ r }) => String(r[cPrecio] ?? '').trim() !== '')
        .map(({ r, fila }) => {
          const codigo = String(r[cCodigo] ?? '').trim()
          const bruto = r[cPrecio]
          const precio = typeof bruto === 'number' ? bruto : Number(String(bruto).replace(/[$\s]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'))
          let errorFila: string | undefined
          if (!validos.has(codigo)) errorFila = 'Código no existe en el catálogo'
          else if (!(precio > 0)) errorFila = 'Precio inválido'
          else if (vistos.has(codigo)) errorFila = 'Código repetido'
          vistos.add(codigo)
          return { fila, codigo, precio, proveedor: cProv >= 0 ? String(r[cProv] ?? '').trim() : '', error: errorFila }
        })
      if (!resultado.length) throw new Error('El archivo no tiene filas con precio.')
      setFilas(resultado)
    } catch (e: any) { setError(e.message) }
  }

  const importar = async () => {
    if (!filas) return
    setError(''); setErrores([])
    try {
      const r = await api<{ importados: number; lote: string }>('/api/catalogo/precios', {
        body: { filas: filas.map(({ codigo, precio, proveedor }) => ({ codigo, precio, proveedor })), motivo },
      })
      setOk(`Importados ${r.importados} precios (lote ${r.lote}). Las líneas en borrador ya usan estos precios; las aprobadas conservan los suyos.`)
      setFilas(null); setMotivo(''); setArchivo('')
      await cargar()
    } catch (e) {
      if (e instanceof ApiError && e.data?.errores) setErrores(e.data.errores)
      setError((e as Error).message)
    }
  }

  const conError = filas?.filter((f) => f.error) || []

  return (
    <>
      {esAdmin && (
        <div className="card">
          <h2>Importar precios desde Excel o CSV</h2>
          <div className="sub">Columnas requeridas: <b>codigo</b> y <b>precio</b> (COP, sin IVA, en la unidad del material). Opcional: <b>proveedor</b>. Cada importación crea un lote nuevo; los precios anteriores se conservan en el historial.</div>
          <div className="acciones" style={{ marginTop: 0 }}>
            <button className="btn btn-claro btn-sm" onClick={plantilla}>Descargar plantilla</button>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => leer(e.target.files?.[0])} />
          </div>
          {filas && (
            <>
              <p style={{ fontSize: 13 }}>{archivo}: {filas.length} filas con precio{conError.length ? `, ${conError.length} con error` : ''}.</p>
              <div className="tabla-scroll" style={{ maxHeight: 260, overflowY: 'auto' }}>
                <table style={{ fontSize: 12.5 }}>
                  <thead><tr><th>Fila</th><th>Código</th><th className="num">Precio</th><th>Proveedor</th><th>Validación</th></tr></thead>
                  <tbody>
                    {filas.map((f) => (
                      <tr key={f.fila} className={f.error ? 'pendiente' : ''}>
                        <td>{f.fila}</td><td>{f.codigo}</td><td className="num">{cop(f.precio)}</td><td>{f.proveedor || '—'}</td>
                        <td>{f.error ? <span className="etiqueta-pend">{f.error}</span> : <span className="etiqueta-ok">OK</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: 12 }}>
                <label>Motivo de la actualización</label>
                <input type="text" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej: Tarifario proveedor octubre 2026" />
              </div>
              <button className="btn" disabled={!!conError.length || !motivo.trim()} onClick={importar}>Importar {filas.length} precios</button>
              {conError.length > 0 && <p className="etiqueta-pend">Corrige las filas con error en el archivo y vuelve a cargarlo.</p>}
            </>
          )}
          {error && <div className="error-box">{error}{errores.length > 0 && <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>{errores.slice(0, 20).map((e) => <li key={e}>{e}</li>)}</ul>}</div>}
          {ok && <div className="ok-box">{ok}</div>}
        </div>
      )}

      <div className="card">
        <h2>Precios vigentes</h2>
        <div className="sub">El precio vigente de cada material es el de la importación más reciente.{!esAdmin && ' Solo un administrador puede importar precios.'}</div>
        <div className="tabla-scroll alto">
          <table>
            <thead><tr><th>Código</th><th>Material</th><th>Unidad</th><th className="num">Precio vigente</th><th>Proveedor</th><th>Lote</th><th>Fecha</th></tr></thead>
            <tbody>
              {materiales.map((m) => (
                <tr key={m.codigo} className={m.precio ? '' : 'pendiente'}>
                  <td>{m.codigo}</td>
                  <td>{m.descripcion}</td>
                  <td>{m.unidad}</td>
                  <td className="num">{m.precio ? cop(m.precio.valor) : <span className="etiqueta-pend">Sin precio</span>}</td>
                  <td>{m.precio?.proveedor || '—'}</td>
                  <td className="muted">{m.precio?.lote || '—'}</td>
                  <td className="muted">{m.precio ? fecha(m.precio.fecha) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

// ─── Historial ───────────────────────────────────────────────────────────────

function Historial() {
  const [registros, setRegistros] = useState<Registro[] | null>(null)
  useEffect(() => { api<Registro[]>('/api/catalogo/auditoria').then(setRegistros).catch(() => setRegistros([])) }, [])
  return (
    <div className="card">
      <h2>Historial del catálogo</h2>
      <div className="sub">Nuevas versiones de normas, esquemas cargados e importaciones de precios, con usuario, fecha y motivo.</div>
      {!registros ? <p className="muted">Cargando…</p> : !registros.length ? <p className="muted">Sin cambios registrados.</p> : (
        <div className="tabla-scroll alto">
          <table style={{ fontSize: 12.5 }}>
            <thead><tr><th>Fecha</th><th>Usuario</th><th>Elemento</th><th>Cambio</th><th>Antes</th><th>Después</th><th>Motivo</th></tr></thead>
            <tbody>
              {registros.map((h) => (
                <tr key={h.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{fecha(h.fecha)}</td><td>{h.usuario}</td><td>{h.entidad} {h.entidadId}</td>
                  <td>{h.accion}</td><td className="muted">{h.valorAnterior || '—'}</td><td>{h.valorNuevo || '—'}</td><td>{h.motivo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
