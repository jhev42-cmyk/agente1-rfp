// Pruebas de la sección "Validación" de PLAN.md contra el servidor local (esquema test).
const { BASE, usuarios, catalogo, login } = require('./lib')

let token, tokenAnalista
let fallas = 0
const ok = (cond, msg) => { console.log(`${cond ? '✔' : '✘'} ${msg}`); if (!cond) fallas++ }

async function api(path, { method, body, tok } = {}) {
  const res = await fetch(BASE + path, {
    method: method || (body ? 'POST' : 'GET'),
    headers: { Cookie: tok || token, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const j = await res.json().catch(() => ({}))
  return { status: res.status, ...j, _json: j }
}


// Cálculo de referencia independiente: a partir del JSON del catálogo, no del servidor.
function referencia(asignaciones, partidasMat) {
  const tot = {}
  for (const { codigo, n } of asignaciones) {
    const norma = catalogo.normas.find((x) => x.operador === 'EPM' && x.codigo === codigo)
    for (const m of norma.configuraciones[0].materiales) tot[m.codigoMaterial] = (tot[m.codigoMaterial] || 0) + m.cantidad * n
  }
  for (const [c, q] of Object.entries(partidasMat)) tot[c] = (tot[c] || 0) + q
  return tot
}

;(async () => {
  token = await login(usuarios[0]) // admin
  tokenAnalista = await login(usuarios[1])
  ok(!!token && !!tokenAnalista, 'login admin y analista')

  // Sin sesión → 401
  ok((await api('/api/lineas', { tok: 'sesion=x.y' })).status === 401, 'API rechaza token inválido')

  // 1. Registrar línea → 10 trayectos
  const { id } = await api('/api/lineas', { body: { nombre: 'Prueba PLAN 250 postes', longitudKm: 18.5, operador: 'EPM' } })
  let linea = await api(`/api/lineas/${id}`)
  ok(linea.trayectos.length === 10 && linea.trayectos.every((t, i) => t.numero === i + 1), 'se crean 10 trayectos numerados 1–10')

  // 2. Postes por trayecto (con trayectos vacíos): 30,25,0,40,35,0,30,25,30,0 = 215
  const cant = [30, 25, 0, 40, 35, 0, 30, 25, 30, 0]
  for (let i = 0; i < 10; i++) if (cant[i]) await api(`/api/lineas/${id}/trayectos/${i + 1}`, { method: 'PATCH', body: { cantidad: cant[i] } })
  linea = await api(`/api/lineas/${id}`)
  const suma = linea.trayectos.reduce((a, t) => a + t.cantidadPostes, 0)
  ok(suma === 215 && linea.postes.length === 215, `total de postes = suma de trayectos (${suma} / ${linea.postes.length})`)
  ok(linea.postes[0].codigo === 'T01-P001' && linea.postes.find((p) => p.trayecto === 4).codigo === 'T04-P001', 'códigos T01-P001, T04-P001…')

  // Modificar trayecto con postes sin motivo → 400
  ok((await api(`/api/lineas/${id}/trayectos/1`, { method: 'PATCH', body: { cantidad: 31 } })).status === 400, 'cambiar trayecto con postes exige motivo')

  // 3. Normas distintas en el mismo trayecto
  const normas = await api('/api/catalogo/normas?operador=EPM')
  const lista = normas._json
  const N = (c) => lista.find((n) => n.codigo === c && n.vigente)
  ok(lista.every((n) => n.operador === 'EPM'), 'normas filtradas por operador')
  const enel = (await api('/api/catalogo/normas?operador=ENEL'))._json[0]
  const t1 = linea.postes.filter((p) => p.trayecto === 1)
  ok((await api(`/api/lineas/${id}/postes`, { method: 'PATCH', body: { posteIds: [t1[0].id], normaId: enel.id } })).status === 400, 'rechaza norma de otro operador')

  // T1: P001 terminal RA2-201, P002–P029 tangente RA2-101, P030 retención RA2-104
  await api(`/api/lineas/${id}/postes`, { method: 'PATCH', body: { posteIds: [t1[0].id], normaId: N('RA2-201').id } })
  await api(`/api/lineas/${id}/postes`, { method: 'PATCH', body: { posteIds: t1.slice(1, 29).map((p) => p.id), normaId: N('RA2-101').id } })
  await api(`/api/lineas/${id}/postes`, { method: 'PATCH', body: { posteIds: [t1[29].id], normaId: N('RA2-104').id } })
  const det201 = await api(`/api/catalogo/normas/${N('RA2-201').id}`)
  const det101 = await api(`/api/catalogo/normas/${N('RA2-101').id}`)
  ok(det201.tipoPoste !== det101.tipoPoste && det201.configuraciones[0].materiales.length !== det101.configuraciones[0].materiales.length, `tipo y materiales distintos por norma (${det201.tipoPoste} / ${det101.tipoPoste})`)

  // Resto de trayectos: todos tangente salvo el último poste de cada trayecto (RA2-102)
  const resto = linea.postes.filter((p) => p.trayecto !== 1)
  const ultimos = new Set([2, 4, 5, 7, 8, 9].map((t) => resto.filter((p) => p.trayecto === t).pop().id))
  await api(`/api/lineas/${id}/postes`, { method: 'PATCH', body: { posteIds: resto.filter((p) => !ultimos.has(p.id)).map((p) => p.id), normaId: N('RA2-101').id } })

  // Pendientes antes de aprobar
  let calc = await api(`/api/lineas/${id}/calculo`)
  ok(calc.postes.pendientes.length === 6, `detecta postes pendientes (${calc.postes.pendientes.length}: ${calc.postes.pendientes.join(', ')})`)
  await api(`/api/lineas/${id}/postes`, { method: 'PATCH', body: { posteIds: [...ultimos], normaId: N('RA2-102').id } })

  // Partida general de conductor
  await api(`/api/lineas/${id}/partidas`, { body: { tipo: 'MATERIAL', codigoMaterial: '10.1', cantidad: 57165 } })

  // 4. Comparar con cálculo manual de referencia
  calc = await api(`/api/lineas/${id}/calculo`)
  const ref = referencia([{ codigo: 'RA2-201', n: 1 }, { codigo: 'RA2-101', n: 28 + (185 - 6) }, { codigo: 'RA2-104', n: 1 }, { codigo: 'RA2-102', n: 6 }], { '10.1': 57165 })
  const srv = Object.fromEntries(calc.materiales.map((m) => [m.codigo, m.cantidad]))
  const difs = Object.keys({ ...ref, ...srv }).filter((c) => Math.abs((ref[c] || 0) - (srv[c] || 0)) > 1e-9)
  ok(!difs.length, `materiales = cálculo manual de referencia (${Object.keys(ref).length} códigos)${difs.length ? ' DIF: ' + difs.map((c) => `${c} ref ${ref[c]} srv ${srv[c]}`).join('; ') : ''}`)
  ok(calc.materiales.every((m) => m.cantidad === m.detalle.reduce((a, d) => a + d.cantidad, 0)), 'detalle por poste suma el consolidado')
  ok(new Set(calc.materiales.map((m) => m.codigo + m.unidad)).size === calc.materiales.length, 'consolidado sin claves duplicadas')

  // Cambiar norma de un poste: sin motivo 400, con motivo recalcula sin duplicar
  const p = t1[5]
  ok((await api(`/api/lineas/${id}/postes`, { method: 'PATCH', body: { posteIds: [p.id], normaId: N('RA2-105').id } })).status === 400, 'cambiar norma de poste configurado exige motivo')
  await api(`/api/lineas/${id}/postes`, { method: 'PATCH', body: { posteIds: [p.id], normaId: N('RA2-105').id, motivo: 'Cambio de ángulo en replanteo' } })
  const calc2 = await api(`/api/lineas/${id}/calculo`)
  const ref2 = referencia([{ codigo: 'RA2-201', n: 1 }, { codigo: 'RA2-101', n: 28 + 179 - 1 }, { codigo: 'RA2-104', n: 1 }, { codigo: 'RA2-102', n: 6 }, { codigo: 'RA2-105', n: 1 }], { '10.1': 57165 })
  const srv2 = Object.fromEntries(calc2.materiales.map((m) => [m.codigo, m.cantidad]))
  const difs2 = Object.keys({ ...ref2, ...srv2 }).filter((c) => Math.abs((ref2[c] || 0) - (srv2[c] || 0)) > 1e-9)
  ok(!difs2.length, `recálculo tras cambio de norma sin duplicaciones${difs2.length ? ' DIF: ' + difs2.join(',') : ''}`)
  ok(calc2.materiales.find((m) => m.codigo === '1.1').detalle.filter((d) => d.poste === p.codigo).length === 1, 'el poste cambiado aparece una sola vez en el detalle')

  // Reducir trayecto con postes configurados → 409 con lista, luego confirmar
  const r409 = await api(`/api/lineas/${id}/trayectos/2`, { method: 'PATCH', body: { cantidad: 20, motivo: 'Ajuste de diseño' } })
  ok(r409.status === 409 && r409.data?.afectados?.length === 5 && r409.data.afectados[0].codigo === 'T02-P021', `reducir trayecto muestra afectados (${r409.data?.afectados?.map((a) => a.codigo).join(', ')})`)
  const rConf = await api(`/api/lineas/${id}/trayectos/2`, { method: 'PATCH', body: { cantidad: 20, motivo: 'Ajuste de diseño', confirmar: true } })
  linea = await api(`/api/lineas/${id}`)
  ok(rConf.retirados?.length === 5 && linea.postes.length === 210, `confirmar retira postes (${linea.postes.length} postes)`)

  // Faltantes de precio antes de aprobar
  await api(`/api/lineas/${id}/estado`, { body: { estado: 'EN_REVISION' } })
  let rAprob = await api(`/api/lineas/${id}/estado`, { body: { estado: 'APROBADA' } })
  ok(rAprob.status === 409 && rAprob.data?.errores?.some((e) => e.includes('sin precio')), `no aprueba con precios faltantes: ${rAprob.data?.errores?.join(' | ')}`)
  ok((await api(`/api/lineas/${id}/trayectos/1`, { method: 'PATCH', body: { cantidad: 1, motivo: 'x' } })).status === 409, 'línea en revisión no es editable')
  await api(`/api/lineas/${id}/estado`, { body: { estado: 'BORRADOR', motivo: 'Faltan precios' } })

  // Importar precios: analista no puede, admin sí; filas inválidas no importan nada
  const filas = catalogo.materiales.map((m, i) => ({ codigo: m.codigo, precio: 1000 + i * 100, proveedor: 'Proveedor prueba' }))
  ok((await api('/api/catalogo/precios', { body: { filas, motivo: 'x' }, tok: tokenAnalista })).status === 403, 'analista no puede importar precios')
  const malo = await api('/api/catalogo/precios', { body: { filas: [...filas, { codigo: '99.9', precio: 5 }], motivo: 'x' } })
  ok(malo.status === 400 && malo.data?.errores?.length === 1, 'importación con código inválido se rechaza completa')
  const imp = await api('/api/catalogo/precios', { body: { filas, motivo: 'Lista de prueba' } })
  ok(imp.importados === 40, 'importa 40 precios')

  // Mano de obra/transporte/indirectos
  await api(`/api/lineas/${id}/partidas`, { body: { tipo: 'MANO_OBRA', descripcion: 'Hincado y vestida', unidad: 'UN', cantidad: 210, precioUnitario: 180000 } })
  await api(`/api/lineas/${id}/partidas`, { body: { tipo: 'TRANSPORTE', descripcion: 'Transporte de postes', unidad: 'GLB', cantidad: 1, precioUnitario: 25000000 } })
  await api(`/api/lineas/${id}/partidas`, { body: { tipo: 'INDIRECTO', descripcion: 'Administración e imprevistos', unidad: 'GLB', cantidad: 1, precioUnitario: 40000000 } })
  calc = await api(`/api/lineas/${id}/calculo`)
  const precio = Object.fromEntries(filas.map((f) => [f.codigo, f.precio]))
  const totalRef = calc.materiales.reduce((a, m) => a + Math.round(m.cantidad * precio[m.codigo]), 0) + 210 * 180000 + 25000000 + 40000000
  ok(calc.cotizacion.total === totalRef && !calc.cotizacion.sinPrecio.length, `total cotización = referencia ($${totalRef.toLocaleString('es-CO')})`)

  // Aprobar
  await api(`/api/lineas/${id}/estado`, { body: { estado: 'EN_REVISION' } })
  rAprob = await api(`/api/lineas/${id}/estado`, { body: { estado: 'APROBADA' } })
  ok(rAprob.ok === true, 'aprueba con todo configurado y con precio')
  const congelada = await api(`/api/lineas/${id}/calculo`)
  ok(congelada.congelado && congelada.cotizacion.total === totalRef, 'cotización congelada al aprobar')

  // Actualizar catálogo (precio y nueva versión de norma) no altera la aprobada
  await api('/api/catalogo/precios', { body: { filas: filas.map((f) => ({ ...f, precio: f.precio * 2 })), motivo: 'Alza de precios' } })
  const d101 = await api(`/api/catalogo/normas/${N('RA2-101').id}`)
  const conf = d101.configuraciones.map((c) => ({ nombre: c.nombre, materiales: c.materiales.map((m) => ({ ...m, cantidad: m.codigoMaterial === '1.1' ? 2 : m.cantidad })) }))
  ok((await api(`/api/catalogo/normas/${N('RA2-101').id}`, { body: { configuraciones: conf, motivo: 'x' }, tok: tokenAnalista })).status === 403, 'analista no puede versionar normas')
  const v2 = await api(`/api/catalogo/normas/${N('RA2-101').id}`, { body: { configuraciones: conf, motivo: 'Prueba versión 2' } })
  ok(v2.version === 2, 'crea RA2-101 v2')
  const tras = await api(`/api/lineas/${id}/calculo`)
  ok(tras.cotizacion.total === totalRef && JSON.stringify(tras.materiales) === JSON.stringify(congelada.materiales), 'la aprobada no cambia tras actualizar precios y normas')
  ok((await api(`/api/lineas/${id}/estado`, { body: { estado: 'BORRADOR', motivo: 'x' } })).status === 409, 'aprobada no vuelve a borrador')

  // Nueva revisión: copia y conserva versiones v1; precios nuevos aplican en borrador
  const rev = await api(`/api/lineas/${id}/revision`, { body: { motivo: 'Cambio de alcance' } })
  ok(rev.revision === 2, 'crea revisión 2')
  const l2 = await api(`/api/lineas/${rev.id}`)
  ok(l2.estado === 'BORRADOR' && l2.postes.length === 210 && l2.partidas.length === 4, 'revisión copia postes y partidas en borrador')
  const c2 = await api(`/api/lineas/${rev.id}/calculo`)
  ok(c2.normasUsadas.find((n) => n.codigo === 'RA2-101').version === 1 && c2.cotizacion.total > totalRef, 'revisión conserva normas v1 y usa precios vigentes')
  ok((await api(`/api/lineas/${id}/revision`, { body: { motivo: 'x' } })).status === 409, 'no crea dos revisiones desde la misma aprobada')

  const hist = await api(`/api/lineas/${id}/auditoria`)
  ok(hist._json.some((h) => h.motivo === 'Cambio de ángulo en replanteo' && h.usuario === usuarios[0].email), 'historial registra usuario y motivo')

  console.log(fallas ? `\n${fallas} PRUEBA(S) FALLARON` : '\nTODAS LAS PRUEBAS PASARON')
  process.exit(fallas ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(1) })
