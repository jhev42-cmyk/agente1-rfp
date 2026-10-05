// Genera prisma/catalogo-inicial.json a partir de los consolidados maestros de EPM y ENEL.
// Uso: node prisma/generar-catalogo.js
const fs = require('fs')
const path = require('path')
const XLSX = require('xlsx')

const raiz = path.join(__dirname, '..')
const FUENTES = {
  EPM: { archivo: 'Temp-EPM-Consolidado Maestro Lineas.xlsx', columna: 2 }, // columna "EPM (Normas RA)"
  ENEL: { archivo: 'Temp-ENEL-Consolidado Maestro Lineas.xlsx', columna: 3 }, // columna "Enel / GEB"
}

const hoja = (wb, nombre) => XLSX.utils.sheet_to_json(wb.Sheets[nombre], { header: 1, blankrows: false })
const esItem = (v) => /^\d+\.\d+$/.test(String(v).trim())

// "12 a16" (rango en la fuente) → se toma el límite superior; "--" o vacío → no aplica.
function cantidad(valor) {
  if (typeof valor === 'number') return { cantidad: valor }
  const s = String(valor ?? '').trim()
  if (!s || s === '--') return null
  const rango = s.match(/^(\d+(?:[.,]\d+)?)\s*a\s*(\d+(?:[.,]\d+)?)$/i)
  if (rango) return { cantidad: parseFloat(rango[2].replace(',', '.')), observacion: `Rango en la fuente: ${s}; se toma el límite superior` }
  const n = parseFloat(s.replace(',', '.'))
  return isNaN(n) ? null : { cantidad: n }
}

const materiales = []
const normas = []

for (const [operador, { archivo, columna }] of Object.entries(FUENTES)) {
  const wb = XLSX.readFile(path.join(raiz, archivo))

  if (!materiales.length) {
    let categoria = ''
    for (const fila of hoja(wb, 'Normas Config.')) {
      if (/^[IVX]+$/.test(String(fila[0]).trim())) categoria = `${fila[0]}. ${fila[1]}`
      else if (esItem(fila[0])) {
        const unidadC1 = hoja(wb, 'C1').find((f) => String(f[0]).trim() === String(fila[0]).trim())
        materiales.push({
          codigo: String(fila[0]).trim(),
          descripcion: String(fila[1]).trim(),
          unidad: String((unidadC1 && unidadC1[2]) || (String(fila[0]).startsWith('10.') ? 'MET' : 'UN')).trim(),
          categoria,
        })
      }
    }
  }

  for (const config of hoja(wb, 'Config. C1-C5').slice(1)) {
    const [codigoConfig, descripcion] = config
    const lista = []
    for (const fila of hoja(wb, String(codigoConfig).trim())) {
      if (!esItem(fila[0])) continue
      const c = cantidad(fila[3])
      if (c) lista.push({ codigoMaterial: String(fila[0]).trim(), ...c })
    }
    const tipoPoste = String(descripcion).replace(/^\d+\.\s*/, '').trim()
    for (const codigo of String(config[columna]).split('/').map((s) => s.trim()).filter(Boolean)) {
      normas.push({
        operador,
        codigo,
        tipoPoste,
        descripcion: `Configuración ${codigoConfig} — ${tipoPoste}`,
        configuraciones: [{ nombre: `${codigoConfig} estándar`, materiales: lista }],
      })
    }
  }
}

fs.writeFileSync(path.join(__dirname, 'catalogo-inicial.json'), JSON.stringify({ materiales, normas }, null, 2))
console.log(`${materiales.length} materiales, ${normas.length} normas`)
