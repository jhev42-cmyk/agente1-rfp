// Seguridad y correcciones de la revisión de código: sesión en cookie, middleware, roles, revocación,
// límite de intentos, cotización congelada en revisión, XSS en agente.html, selección en el paso 3,
// concurrencia en trayectos y precios/cantidades del catálogo en agente.html.
// Se ejecuta al final: la prueba de límite de intentos deja bloqueado 15 minutos un correo ficticio.
const puppeteer = require('puppeteer-core')
const { BASE, CHROME, usuarios, catalogo, login, sesionEnPagina } = require('./lib')

let fallas = 0
const ok = (c, m) => { console.log(`${c ? '✔' : '✘'} ${m}`); if (!c) fallas++ }
const esperar = (ms) => new Promise((r) => setTimeout(r, ms))

async function api(cookie, path, { method, body, headers = {} } = {}) {
  const res = await fetch(BASE + path, {
    method: method || (body ? 'POST' : 'GET'), redirect: 'manual',
    headers: { ...(cookie ? { Cookie: cookie } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  })
  const j = await res.json().catch(() => ({}))
  return { status: res.status, location: res.headers.get('location'), setCookie: res.headers.get('set-cookie'), ...(Array.isArray(j) ? { lista: j } : j) }
}

;(async () => {
  const admin = await login(usuarios[0])
  const analista = await login(usuarios[1])
  ok(!!admin && !!analista, 'login devuelve cookie de sesión')

  // ── Cookie y middleware ──
  const rl = await fetch(BASE + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: usuarios[0].email, password: usuarios[0].p }) })
  const sc = rl.headers.get('set-cookie') || ''
  ok(/HttpOnly/i.test(sc) && /SameSite=Lax/i.test(sc) && /Path=\//i.test(sc), `cookie HttpOnly + SameSite=Lax (${sc.split(';').slice(1).join(';').trim()})`)
  ok(!(await rl.clone().json().catch(() => ({}))).token, 'el login ya no devuelve el token en el cuerpo')
  for (const ruta of ['/agente.html', '/proveedores.json', '/Formato_Cotizacion_Conductores.xlsx', '/lineas', '/catalogo']) {
    const r = await fetch(BASE + ruta, { redirect: 'manual' })
    ok(r.status === 307 && (r.headers.get('location') || '').includes('/login?siguiente='), `sin sesión ${ruta} redirige al login`)
  }
  const conSesion = await fetch(BASE + '/agente.html', { headers: { Cookie: admin }, redirect: 'manual' })
  ok(conSesion.status === 200, 'con sesión agente.html carga')
  ok((await fetch(BASE + '/proveedores.json', { headers: { Cookie: admin } })).status === 200, 'con sesión proveedores.json carga')
  ok((await fetch(BASE + '/precios_negociados.json', { headers: { Cookie: admin } })).status === 404, 'precios_negociados.json ya no existe')
  ok((await fetch(BASE + '/login', { redirect: 'manual' })).status === 200, 'el login es público')
  ok((await api(admin, '/api/quotations')).status === 404, 'API antigua /api/quotations eliminada')
  const dash = await fetch(BASE + '/dashboard', { headers: { Cookie: admin }, redirect: 'manual' })
  ok([307, 308].includes(dash.status) && (dash.headers.get('location') || '').endsWith('/lineas'), '/dashboard redirige a /lineas')

  // ── CSRF: petición que modifica datos desde otro origen ──
  ok((await api(admin, '/api/lineas', { body: { nombre: 'x', longitudKm: 1, operador: 'EPM' }, headers: { Origin: 'https://sitio-ajeno.example' } })).status === 403, 'rechaza escritura con Origin de otro sitio')

  // ── Roles: aprobador ──
  const nuevo = await api(admin, '/api/usuarios', { body: { email: `aprobador.${Date.now()}@rfp.local`, nombre: 'Aprobador prueba', rol: 'APROBADOR' } })
  ok(nuevo.status === 201 && nuevo.passwordTemporal?.length === 12, 'admin crea un aprobador con contraseña temporal')
  ok((await api(analista, '/api/usuarios')).status === 403, 'analista no gestiona usuarios')
  const usuariosLista = (await api(admin, '/api/usuarios')).usuarios
  const aprob = usuariosLista.find((u) => u.id === nuevo.id)
  const aprobador = await login({ email: aprob.email, p: nuevo.passwordTemporal })
  ok(!!aprobador, 'el aprobador inicia sesión con la contraseña temporal')

  // Línea lista para aprobar
  await api(admin, '/api/catalogo/precios', { body: { filas: catalogo.materiales.map((m) => ({ codigo: m.codigo, precio: 1000 })), motivo: 'Precios base de prueba' } })
  const { id } = await api(analista, '/api/lineas', { body: { nombre: 'Prueba seguridad', longitudKm: 1, operador: 'EPM' } })
  await api(analista, `/api/lineas/${id}/trayectos/1`, { method: 'PATCH', body: { cantidad: 4 } })
  const normas = (await api(analista, '/api/catalogo/normas?operador=EPM')).lista
  const norma = normas.find((n) => n.codigo === 'RA2-101' && n.vigente)
  let linea = await api(analista, `/api/lineas/${id}`)
  await api(analista, `/api/lineas/${id}/postes`, { method: 'PATCH', body: { posteIds: linea.postes.map((p) => p.id), normaId: norma.id } })

  // ── Cotización congelada al enviar a revisión ──
  await api(analista, `/api/lineas/${id}/estado`, { body: { estado: 'EN_REVISION' } })
  const enviada = await api(analista, `/api/lineas/${id}/calculo`)
  ok(enviada.congelado === true, 'al enviar a revisión la cotización queda congelada')
  await api(admin, '/api/catalogo/precios', { body: { filas: catalogo.materiales.map((m) => ({ codigo: m.codigo, precio: 5000 })), motivo: 'Alza durante la revisión' } })
  const tras = await api(analista, `/api/lineas/${id}/calculo`)
  ok(tras.cotizacion.total === enviada.cotizacion.total, `cambiar precios durante la revisión no altera lo revisado (${enviada.cotizacion.total})`)
  ok((await api(analista, `/api/lineas/${id}/estado`, { body: { estado: 'APROBADA' } })).status === 403, 'analista no puede aprobar')
  ok((await api(aprobador, `/api/lineas/${id}/estado`, { body: { estado: 'APROBADA' } })).ok === true, 'aprobador aprueba')
  const aprobada = await api(analista, `/api/lineas/${id}/calculo`)
  ok(aprobada.cotizacion.total === enviada.cotizacion.total, 'se aprueba exactamente la cotización enviada a revisión')

  // Devolver a borrador descongela y toma precios vigentes
  const { id: id2 } = await api(analista, '/api/lineas', { body: { nombre: 'Prueba seguridad 2', longitudKm: 1, operador: 'EPM' } })
  await api(analista, `/api/lineas/${id2}/trayectos/1`, { method: 'PATCH', body: { cantidad: 2 } })
  const l2 = await api(analista, `/api/lineas/${id2}`)
  await api(analista, `/api/lineas/${id2}/postes`, { method: 'PATCH', body: { posteIds: l2.postes.map((p) => p.id), normaId: norma.id } })
  await api(analista, `/api/lineas/${id2}/estado`, { body: { estado: 'EN_REVISION' } })
  const c2 = await api(analista, `/api/lineas/${id2}/calculo`)
  await api(admin, '/api/catalogo/precios', { body: { filas: catalogo.materiales.map((m) => ({ codigo: m.codigo, precio: 7000 })), motivo: 'Otra alza' } })
  await api(analista, `/api/lineas/${id2}/estado`, { body: { estado: 'BORRADOR', motivo: 'Ajustes' } })
  const c2b = await api(analista, `/api/lineas/${id2}/calculo`)
  ok(!c2b.congelado && c2b.cotizacion.total === c2.cotizacion.total * 7 / 5, 'devolver a borrador descongela y usa precios vigentes')

  // ── Revocación de sesiones ──
  ok((await api(aprobador, '/api/auth/me')).status === 200, 'sesión del aprobador activa')
  await api(admin, `/api/usuarios/${aprob.id}`, { method: 'PATCH', body: { activo: false } })
  ok((await api(aprobador, '/api/auth/me')).status === 401, 'desactivar al usuario cierra su sesión de inmediato')
  ok(!(await login({ email: aprob.email, p: nuevo.passwordTemporal })), 'usuario desactivado no puede iniciar sesión')
  await api(admin, `/api/usuarios/${aprob.id}`, { method: 'PATCH', body: { activo: true } })
  const rest = await api(admin, `/api/usuarios/${aprob.id}`, { method: 'PATCH', body: { restablecer: true } })
  ok(!(await login({ email: aprob.email, p: nuevo.passwordTemporal })) && !!(await login({ email: aprob.email, p: rest.passwordTemporal })), 'restablecer invalida la contraseña anterior y entrega una temporal')
  const s1 = await login({ email: aprob.email, p: rest.passwordTemporal })
  const s2 = await login({ email: aprob.email, p: rest.passwordTemporal })
  const cambio = await api(s1, '/api/auth/password', { body: { actual: rest.passwordTemporal, nueva: 'NuevaClaveSegura2026' } })
  const s1nueva = (cambio.setCookie || '').match(/sesion=[^;]+/)?.[0]
  ok(cambio.ok && (await api(s2, '/api/auth/me')).status === 401 && (await api(s1nueva, '/api/auth/me')).status === 200, 'cambiar contraseña cierra las otras sesiones y renueva la actual')
  ok((await api(s1nueva, '/api/auth/password', { body: { actual: 'NuevaClaveSegura2026', nueva: 'corta' } })).status === 400, 'rechaza contraseñas de menos de 10 caracteres')
  const yoAdmin = (await api(admin, '/api/auth/me')).user
  ok((await api(admin, `/api/usuarios/${yoAdmin.id}`, { method: 'PATCH', body: { activo: false } })).status === 400, 'el admin no puede desactivarse a sí mismo')

  // ── Concurrencia en trayectos ──
  const { id: id3 } = await api(analista, '/api/lineas', { body: { nombre: 'Prueba concurrencia', longitudKm: 1, operador: 'EPM' } })
  const rs = await Promise.all([5, 8, 6].map((n) => api(analista, `/api/lineas/${id3}/trayectos/1`, { method: 'PATCH', body: { cantidad: n, motivo: 'Prueba concurrente' } })))
  const l3 = await api(analista, `/api/lineas/${id3}`)
  const nums = l3.postes.map((p) => p.numero)
  ok(rs.every((r) => r.status === 200), `cambios simultáneos al mismo trayecto sin error 500 (${rs.map((r) => r.status).join(', ')})`)
  ok(nums.length === l3.trayectos[0].cantidadPostes && new Set(nums).size === nums.length && Math.max(...nums) === nums.length, `postes consistentes tras concurrencia (${nums.length} postes, sin números repetidos)`)

  // ── Navegador: XSS, selección y catálogo en agente.html ──
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new' })
  const p = await b.newPage()
  await p.setViewport({ width: 1400, height: 1000 })
  const errores = []
  p.on('pageerror', (e) => errores.push(e.message))
  await sesionEnPagina(p, analista)

  await p.goto(`${BASE}/agente.html`, { waitUntil: 'networkidle0' })
  await p.waitForFunction(() => /catálogo central/i.test(document.getElementById('bomStatus')?.textContent || ''), { timeout: 15000 }).catch(() => {})
  const xss = await p.evaluate(() => {
    window.__xss = false
    const html = chip({ nombre: '<img src=x onerror="window.__xss=true">Proveedor', url: 'javascript:window.__xss=true', fuente: 'investigacion_web' })
      + chipConCheckbox({ nombre: "X'); window.__xss=true; ('", url: 'https://ok.example', fuente: 'investigacion_web' })
    const d = document.createElement('div'); d.innerHTML = html; document.body.appendChild(d)
    return { html, img: !!d.querySelector('img'), js: /href="javascript:/i.test(html) }
  })
  await esperar(300)
  ok(!xss.img && !xss.js && !(await p.evaluate(() => window.__xss)), 'agente.html escapa nombres y descarta enlaces javascript:')
  await p.evaluate(() => document.querySelector('.chip-select input').click()); await esperar(200)
  ok(!(await p.evaluate(() => window.__xss)), 'el nombre con comillas no inyecta código en el onchange')
  ok(/Cantidades por configuración tomadas del catálogo central \(EPM\)/.test(await p.$eval('#bomStatus', (e) => e.textContent)), 'agente.html toma las cantidades por configuración del catálogo')
  ok(await p.evaluate(() => ITEMS_MASTER.find((m) => m.item === '8.2').bom_por_config.C1 === 16), 'material 8.2 coincide con el catálogo (16 m), igual que en Líneas')
  await p.evaluate(() => cargarPrecios()); await esperar(1500)
  ok(/Precios del catálogo central cargados: 40 de 40/.test(await p.$eval('#preciosStatus', (e) => e.textContent)), 'el presupuesto de agente.html lee los precios del catálogo central')

  // Selección en el paso 3: cambiar de filtro limpia la selección
  const { id: id4 } = await api(analista, '/api/lineas', { body: { nombre: 'Prueba selección', longitudKm: 1, operador: 'EPM' } })
  await api(analista, `/api/lineas/${id4}/trayectos/1`, { method: 'PATCH', body: { cantidad: 3 } })
  await api(analista, `/api/lineas/${id4}/trayectos/2`, { method: 'PATCH', body: { cantidad: 2 } })
  await api(analista, `/api/lineas/${id4}`, { method: 'PATCH', body: { modoAsignacion: 'CORRIDO' } })
  await p.goto(`${BASE}/lineas/${id4}`, { waitUntil: 'networkidle0' })
  await p.waitForFunction(() => [...document.querySelectorAll('.pasos button')].some((x) => x.textContent.includes('Postes')))
  await p.evaluate(() => [...document.querySelectorAll('.pasos button')].find((x) => x.textContent.includes('Postes')).click())
  await p.waitForSelector('.filter-row select')
  await p.select('.filter-row select', '1'); await esperar(300)
  await p.evaluate(() => [...document.querySelectorAll('.barra-masiva button')].find((x) => x.textContent.includes('Seleccionar visibles')).click()); await esperar(300)
  const antes = await p.evaluate(() => document.querySelectorAll('.kpi .v')[2].textContent)
  await p.select('.filter-row select', '2'); await esperar(300)
  const despues = await p.evaluate(() => ({ sel: document.querySelectorAll('.kpi .v')[2].textContent, boton: [...document.querySelectorAll('.barra-masiva button')].find((x) => x.textContent.startsWith('Aplicar a')).textContent }))
  ok(antes === '3' && despues.sel === '0' && despues.boton === 'Aplicar a 0', `cambiar el filtro de trayecto limpia la selección (antes ${antes}, después ${despues.sel})`)

  // Analista no ve el botón Aprobar
  await api(analista, `/api/lineas/${id4}/estado`, { body: { estado: 'EN_REVISION' } })
  await p.goto(`${BASE}/lineas/${id4}`, { waitUntil: 'networkidle0' })
  await p.waitForFunction(() => [...document.querySelectorAll('.pasos button')].some((x) => x.textContent.includes('Revisión')))
  await p.evaluate(() => [...document.querySelectorAll('.pasos button')].find((x) => x.textContent.includes('Revisión')).click()); await esperar(800)
  ok(await p.evaluate(() => ![...document.querySelectorAll('button')].some((x) => x.textContent === 'Aprobar') && document.body.innerText.includes('Pendiente de aprobación por un aprobador')), 'analista no ve el botón Aprobar')

  // Cerrar sesión borra la cookie
  await p.evaluate(() => [...document.querySelectorAll('.topbar button')].find((x) => x.textContent.includes('Cerrar sesión')).click())
  await p.waitForFunction(() => location.pathname === '/login', { timeout: 10000 })
  ok(!(await p.cookies()).some((c) => c.name === 'sesion' && c.value), 'cerrar sesión borra la cookie')
  ok(!errores.length, `sin errores JS ${errores.length ? JSON.stringify(errores) : ''}`)
  await b.close()

  // ── Límite de intentos (con un correo ficticio: no afecta a los usuarios reales) ──
  const malo = { email: `inexistente.${Date.now()}@rfp.local`, password: 'incorrecta' }
  const codigos = []
  for (let i = 0; i < 6; i++) {
    const r = await fetch(BASE + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(malo) })
    codigos.push(r.status)
  }
  ok(codigos.slice(0, 5).every((c) => c === 401) && codigos[5] === 429, `tras 5 intentos fallidos se bloquea el login (${codigos.join(', ')})`)
  const reg = (await api(admin, '/api/usuarios')).accesos
  ok(reg.filter((a) => a.email === malo.email && !a.exito).length >= 5, 'los intentos quedan registrados')

  console.log(fallas ? `\n${fallas} PRUEBA(S) FALLARON` : '\nTODAS LAS PRUEBAS PASARON')
  process.exit(fallas ? 1 : 0)
})().catch((e) => { console.error('FALLO:', e); process.exit(1) })
