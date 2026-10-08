// Modo de asignación (paso 2) y vista por trayecto (paso 3): API + interfaz.
const puppeteer = require('puppeteer-core')
const { BASE, CHROME, usuarios, login, sesionEnPagina } = require('./lib')
let fallas = 0
const ok = (c, m) => { console.log(`${c ? '✔' : '✘'} ${m}`); if (!c) fallas++ }
const esperar = (ms) => new Promise((r) => setTimeout(r, ms))
let token
async function api(path, { method, body } = {}) {
  const res = await fetch(BASE + path, { method: method || (body ? 'POST' : 'GET'), headers: { Cookie: token, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined })
  return { status: res.status, ...(await res.json().catch(() => ({}))) }
}

;(async () => {
  token = await login(usuarios[0])

  // ── API ──
  const { id } = await api('/api/lineas', { body: { nombre: 'Prueba modo', longitudKm: 5, operador: 'ENEL' } })
  ok((await api(`/api/lineas/${id}`)).modoAsignacion === null, 'línea nueva sin modo elegido')
  ok((await api(`/api/lineas/${id}`, { method: 'PATCH', body: { modoAsignacion: 'OTRO' } })).status === 400, 'rechaza modo inválido')
  ok((await api(`/api/lineas/${id}`, { method: 'PATCH', body: { modoAsignacion: 'TRAYECTO' } })).ok === true, 'guarda modo sin pedir motivo')
  ok((await api(`/api/lineas/${id}`)).modoAsignacion === 'TRAYECTO', 'modo TRAYECTO persistido')
  ok((await api(`/api/lineas/${id}`, { method: 'PATCH', body: { nombre: 'x' } })).status === 400, 'editar nombre sigue exigiendo motivo')

  // ── Interfaz ──
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new' })
  const p = await b.newPage()
  await p.setViewport({ width: 1400, height: 1100 })
  const errores = []
  p.on('pageerror', (e) => errores.push(e.message))
  p.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errores.push(m.text()) })
  await sesionEnPagina(p, token)

  // Segunda línea, sin modo: el paso 2 debe preguntar
  const l2 = (await api('/api/lineas', { body: { nombre: 'Prueba modo UI', longitudKm: 4, operador: 'EPM' } })).id
  for (const [t, n] of [[1, 6], [2, 0], [3, 4]]) if (n) await api(`/api/lineas/${l2}/trayectos/${t}`, { method: 'PATCH', body: { cantidad: n } })
  await p.goto(`${BASE}/lineas/${l2}`, { waitUntil: 'networkidle0' }); await esperar(1200)
  const clic = async (sel, txt) => {
    await p.waitForFunction((s, t) => [...document.querySelectorAll(s)].some((x) => x.textContent.includes(t) && !x.disabled), { timeout: 10000 }, sel, txt)
      .catch(() => { throw new Error(`no encontré ${sel} ${txt}`) })
    await p.evaluate((s, t) => [...document.querySelectorAll(s)].find((x) => x.textContent.includes(t) && !x.disabled).click(), sel, txt)
    await esperar(1500)
  }
  await clic('.pasos button', 'Trayectos')
  ok(await p.evaluate(() => document.body.innerText.includes('¿Cómo quieres asignar las normas') && document.querySelectorAll('.opcion-modo').length === 2), 'paso 2 pregunta el modo con 2 opciones')
  ok(await p.evaluate(() => !!document.querySelector('.note') && document.querySelector('.note').textContent.includes('Elige un modo')), 'avisa que falta elegir el modo')
  await p.evaluate(() => [...document.querySelectorAll('.opcion-modo')].find((x) => x.textContent.includes('Por trayecto')).querySelector('input').click()); await esperar(1800)
  ok((await api(`/api/lineas/${l2}`)).modoAsignacion === 'TRAYECTO', 'elegir "Por trayecto" en la UI lo guarda')
  await p.screenshot({ path: `${require('os').tmpdir()}/e2e_modo_paso2.png`, clip: await p.evaluate(() => { const r = document.querySelector('.opciones-modo').getBoundingClientRect(); return { x: r.x - 20, y: r.y + scrollY - 70, width: r.width + 40, height: r.height + 100 } }) })

  // Paso 3 abre en modo trayecto con subsecciones 3.1 y 3.3 (trayecto 2 vacío no aparece)
  await clic('.pasos button', 'Postes')
  const subs = await p.evaluate(() => [...document.querySelectorAll('.subpasos button')].map((x) => x.textContent))
  ok(subs.length === 2 && subs[0].startsWith('3.1') && subs[1].startsWith('3.3'), `subsecciones por trayecto: ${subs.join(' | ')}`)
  ok(await p.evaluate(() => document.querySelector('.modo-toggle .activo').textContent.includes('Por trayecto')), 'abre en el modo elegido')
  ok(await p.evaluate(() => document.querySelectorAll('.layout-postes tbody tr').length) === 6, 'trayecto 1 muestra solo sus 6 postes')

  // Aplicar norma a todo el trayecto 1
  const idNorma = await p.evaluate(() => [...document.querySelectorAll('.barra-trayecto select option')].find((o) => o.textContent.startsWith('RA2-101')).value)
  await p.select('.barra-trayecto select', idNorma); await esperar(300)
  await clic('.barra-trayecto button', 'Aplicar a los 6')
  await p.waitForFunction(() => /6 poste\(s\) actualizados/.test(document.querySelector('.ok-box')?.textContent || ''), { timeout: 20000 })
  let l = await api(`/api/lineas/${l2}`)
  ok(l.postes.filter((x) => x.trayecto === 1).every((x) => x.normaId === Number(idNorma)) && l.postes.filter((x) => x.trayecto === 3).every((x) => !x.normaId), 'aplica la norma solo a los postes del trayecto 1')
  const sinPend = await p.waitForFunction(() => !document.querySelector('.subpasos button').textContent.includes('pend.'), { timeout: 10000 }).then(() => true).catch(() => false)
  ok(sinPend, 'subsección 3.1 ya sin pendientes')

  // Ajuste individual dentro del trayecto: cambiar T01-P006 con motivo
  const idRet = await p.evaluate(() => [...document.querySelectorAll('tbody select option')].find((o) => o.textContent.startsWith('RA2-104')).value)
  await p.evaluate((v) => { const s = [...document.querySelectorAll('.layout-postes tbody tr')].pop().querySelector('select'); const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set; set.call(s, v); s.dispatchEvent(new Event('change', { bubbles: true })) }, idRet)
  await p.waitForSelector('.modal textarea', { timeout: 10000 })
  await p.type('.modal textarea', 'Último poste en ángulo')
  await clic('.modal button', 'Confirmar')
  await p.waitForFunction(() => /^1 poste\(s\) actualizados/.test(document.querySelector('.ok-box')?.textContent || ''), { timeout: 20000 })
  l = await api(`/api/lineas/${l2}`)
  ok(l.postes.find((x) => x.codigo === 'T01-P006').normaId === Number(idRet), 'ajuste individual dentro del trayecto (con motivo)')

  // Reaplicar norma al trayecto 1 → pide motivo y lista los configurados
  await p.select('.barra-trayecto select', idNorma); await esperar(300)
  await clic('.barra-trayecto button', 'Aplicar a los 6')
  await p.waitForSelector('.modal', { timeout: 10000 })
  ok(await p.evaluate(() => document.querySelector('.modal')?.textContent.includes('T01-P006')), 'reaplicar al trayecto lista el poste que cambia y pide motivo')
  await clic('.modal button', 'Cancelar')

  // Trayecto 3 y alternar a modo de corrido
  await clic('.subpasos button', '3.3')
  ok(await p.evaluate(() => [...document.querySelectorAll('.layout-postes tbody tr td:nth-child(2)')].every((td) => td.textContent.startsWith('T03'))), 'subsección 3.3 muestra solo postes T03')
  await p.screenshot({ path: `${require('os').tmpdir()}/e2e_modo_paso3.png` })
  await clic('.modo-toggle button', 'De corrido')
  ok(await p.evaluate(() => document.querySelectorAll('.layout-postes tbody tr').length === 10 && !document.querySelector('.subpasos')), 'modo de corrido muestra los 10 postes en una lista')

  ok(!errores.length, `sin errores JS ${errores.length ? JSON.stringify(errores) : ''}`)
  await b.close()

  console.log(fallas ? `\n${fallas} PRUEBA(S) FALLARON` : '\nTODAS LAS PRUEBAS PASARON')
  process.exit(fallas ? 1 : 0)
})().catch((e) => { console.error('FALLO:', e); process.exit(1) })
