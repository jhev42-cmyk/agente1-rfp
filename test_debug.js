const { JSDOM } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', url: 'http://localhost/' });

dom.window.onerror = (msg, src, line, col, err) => {
  console.log('WINDOW ERROR:', msg, 'line', line, 'col', col);
  if (err && err.stack) console.log(err.stack);
};

setTimeout(() => {
  const doc = dom.window.document;
  const selFamilia = doc.getElementById('tipoCableado');
  const selCalibre = doc.getElementById('calibreCableado');
  console.log('tipoCableado options:', selFamilia ? selFamilia.options.length : 'NOT FOUND');
  console.log('calibreCableado options:', selCalibre ? selCalibre.options.length : 'NOT FOUND');
  if (selFamilia) {
    console.log('tipoCableado values:', [...selFamilia.options].map(o=>o.value));
  }
  if (selCalibre) {
    console.log('calibreCableado values:', [...selCalibre.options].map(o=>o.value));
  }

  // try clicking generar desglose
  try {
    dom.window.generarDesglose();
    console.log('generarDesglose() called OK');
  } catch(e) {
    console.log('generarDesglose ERROR:', e.message);
    console.log(e.stack);
  }
}, 1000);
