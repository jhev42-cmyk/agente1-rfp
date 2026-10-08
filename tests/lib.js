// Utilidades comunes de las pruebas end-to-end. Las credenciales llegan por variables de entorno
// (nunca se guardan en el repositorio): ver tests/run.sh.
const BASE = process.env.E2E_BASE || 'http://localhost:3125'
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

const usuarios = [
  { email: process.env.E2E_ADMIN_EMAIL || 'admin@rfp.local', p: process.env.E2E_ADMIN_PASSWORD },
  { email: process.env.E2E_ANALISTA_EMAIL || 'analista1@rfp.local', p: process.env.E2E_ANALISTA_PASSWORD },
]
if (!usuarios[0].p || !usuarios[1].p) {
  console.error('Faltan E2E_ADMIN_PASSWORD y/o E2E_ANALISTA_PASSWORD')
  process.exit(2)
}

// Inicia sesión y devuelve la cookie "sesion=…" para enviarla en las peticiones.
async function login(u) {
  const r = await fetch(BASE + '/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: u.email, password: u.p }),
  })
  const set = r.headers.get('set-cookie') || ''
  const m = set.match(/sesion=[^;]+/)
  return m ? m[0] : null
}

// Pone la cookie de sesión en una página de puppeteer.
async function sesionEnPagina(pagina, cookie) {
  const [name, ...valor] = cookie.split('=')
  await pagina.setCookie({ name, value: valor.join('='), url: BASE })
}

module.exports = { BASE, CHROME, usuarios, login, sesionEnPagina, catalogo: require('../prisma/catalogo-inicial.json') }
