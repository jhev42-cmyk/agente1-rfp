// Eliminación de líneas: API (permisos, motivo, cascada, registro) + interfaz.
const puppeteer = require('puppeteer-core')
const { BASE, CHROME, usuarios, catalogo, login, sesionEnPagina } = require('./lib')
let fallas = 0
const ok = (c, m) => { console.log(`${c ? '✔' : '✘'} ${m}`); if (!c) fallas++ }
const esperar = (ms) => new Promise((r) => setTimeout(r, ms))
const tokens = {}
async function api(path, { method, body, como = 'admin' } = {}) {
  const res = await fetch(BASE + path, { method: method || (body ? 'POST' : 'GET'), headers: { Cookie: tokens[como], ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined })
  const j = await res.json().catch(() => ({}))
  return { status: res.status, ...(Array.isArray(j) ? { lista: j } : j) }
}
async function lineaConPostes(nombre, como = 'admin') {
  const { id } = await api('/api/lineas', { body: { nombre, longitudKm: 2, operador: 'EPM' }, como })
  await api(`/api/lineas/${id}/trayectos/1`, { method: 'PATCH', body: { cantidad: 3 }, como })
  return id
}

;(async () => {
  tokens.admin = await login(usuarios[0])
  tokens.analista = await login(usuarios[1])

  // Borrador eliminado por un analista
  const a = await lineaConPostes('Prueba borrar borrador', 'analista')
  ok((await api(`/api/lineas/${a}`, { method: 'DELETE', body: {}, como: 'analista' })).status === 400, 'eliminar exige motivo')
  const r1 = await api(`/api/lineas/${a}`, { method: 'DELETE', body: { motivo: 'Era de prueba' }, como: 'analista' })
  ok(r1.eliminadas === 1, 'analista elimina una línea en borrador')
  ok((await api(`/api/lineas/${a}`)).status === 404, 'la línea ya no existe')
  ok((await api(`/api/lineas/${a}/calculo`)).status === 404, 'sus postes y cálculo ya no existen')
  const reg = (await api('/api/lineas/eliminadas')).lista
  const r = reg.find((x) => x.entidadId === 'Prueba borrar borrador')
  ok(r && r.usuario === usuarios[1].email && r.motivo === 'Era de prueba' && JSON.parse(r.valorAnterior).revisiones[0].postes === 3, 'registro de eliminación con usuario, motivo y resumen')
  ok(!(await api('/api/catalogo/auditoria')).lista.some((x) => x.accion === 'eliminar'), 'el historial del catálogo no muestra líneas eliminadas')

  // Línea aprobada con una revisión en borrador
  const b = await lineaConPostes('Prueba borrar aprobada')
  const normas = (await api('/api/catalogo/normas?operador=EPM')).lista
  const linea = await api(`/api/lineas/${b}`)
  await api(`/api/lineas/${b}/postes`, { method: 'PATCH', body: { posteIds: linea.postes.map((p) => p.id), normaId: normas.find((n) => n.codigo === 'RA2-101' && n.vigente).id } })
  await api('/api/catalogo/precios', { body: { filas: catalogo.materiales.map((m) => ({ codigo: m.codigo, precio: 1000 })), motivo: 'Precios de prueba' } })
  await api(`/api/lineas/${b}/estado`, { body: { estado: 'EN_REVISION' } })
  ok((await api(`/api/lineas/${b}/estado`, { body: { estado: 'APROBADA' } })).ok, 'línea de prueba aprobada')
  const rev = await api(`/api/lineas/${b}/revision`, { body: { motivo: 'Revisión de prueba' } })
  ok((await api(`/api/lineas/${rev.id}`, { method: 'DELETE', body: { motivo: 'x' }, como: 'analista' })).status === 403, 'analista no elimina una línea con revisión aprobada')
  ok((await api(`/api/lineas/${rev.id}`)).status === 200 && (await api(`/api/lineas/${b}`)).status === 200, 'tras el rechazo ambas revisiones siguen existiendo')
  const r2 = await api(`/api/lineas/${rev.id}`, { method: 'DELETE', body: { motivo: 'Proyecto cancelado' } })
  ok(r2.eliminadas === 2 && (await api(`/api/lineas/${b}`)).status === 404, 'admin elimina la línea con sus 2 revisiones')

  // ── Interfaz ──
  const c = await lineaConPostes('Prueba borrar desde lista', 'analista')
  const d = await lineaConPostes('Prueba borrar desde paso 1', 'analista')
  const br = await puppeteer.launch({ executablePath: CHROME, headless: 'new' })
  const p = await br.newPage()
  await p.setViewport({ width: 1400, height: 1000 })
  const errores = []
  p.on('pageerror', (e) => errores.push(e.message))
  await sesionEnPagina(p, tokens.analista)
  await p.goto(`${BASE}/lineas`, { waitUntil: 'networkidle0' })
  await p.waitForSelector('tbody tr')

  const fila = (nombre) => p.evaluate((n) => [...document.querySelectorAll('tbody tr')].findIndex((tr) => tr.textContent.includes(n)), nombre)
  ok((await fila('Prueba borrar desde lista')) >= 0, 'la línea aparece en la lista')
  await p.evaluate(() => [...document.querySelectorAll('tbody tr')].find((tr) => tr.textContent.includes('Prueba borrar desde lista')).querySelector('button').click())
  await p.waitForSelector('.modal textarea')
  ok(await p.evaluate(() => [...document.querySelectorAll('.modal button')].find((b) => b.textContent.includes('Eliminar definitivamente')).disabled), 'el botón de confirmar está deshabilitado sin motivo')
  await p.type('.modal textarea', 'Ejercicio de prueba')
  await p.evaluate(() => [...document.querySelectorAll('.modal button')].find((b) => b.textContent.includes('Eliminar definitivamente')).click())
  await p.waitForFunction(() => document.querySelector('.ok-box')?.textContent.includes('eliminada'), { timeout: 10000 })
  ok((await fila('Prueba borrar desde lista')) < 0 || await p.evaluate(() => [...document.querySelectorAll('tbody tr')].filter((tr) => tr.textContent.includes('Prueba borrar desde lista') && tr.querySelector('button')).length === 0), 'desaparece de la lista tras eliminar')
  ok(await p.evaluate(() => [...document.querySelectorAll('h2')].some((h) => h.textContent === 'Líneas eliminadas') && document.body.innerText.includes('Ejercicio de prueba')), 'aparece en el registro de líneas eliminadas')
  await p.screenshot({ path: `${require('os').tmpdir()}/e2e_eliminar_lista.png`, fullPage: true })

  // Desde el paso 1
  await p.goto(`${BASE}/lineas/${d}`, { waitUntil: 'networkidle0' })
  await p.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => b.textContent === 'Eliminar línea'))
  await p.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent === 'Eliminar línea').click())
  await p.waitForSelector('.modal textarea')
  await p.type('.modal textarea', 'Ya no se va a cotizar')
  await p.evaluate(() => [...document.querySelectorAll('.modal button')].find((b) => b.textContent.includes('Eliminar definitivamente')).click())
  await p.waitForFunction(() => location.pathname === '/lineas', { timeout: 10000 })
  ok((await api(`/api/lineas/${d}`)).status === 404, 'eliminar desde el paso 1 borra la línea y vuelve a la lista')

  ok(!errores.length, `sin errores JS ${errores.length ? JSON.stringify(errores) : ''}`)
  await br.close()
  console.log(fallas ? `\n${fallas} PRUEBA(S) FALLARON` : '\nTODAS LAS PRUEBAS PASARON')
  process.exit(fallas ? 1 : 0)
})().catch((e) => { console.error('FALLO:', e); process.exit(1) })
