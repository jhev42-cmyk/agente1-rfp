/**
 * Integración de Operadores de Línea y Normas Técnicas
 * Inyecta dinámicamente:
 * - Selector de Operador (ENEL, EPM, CELSIA, ElectroHuila, Enerca)
 * - Solo ENEL y EPM activos inicialmente
 * - Datos de cables dependientes del operador
 * - Normas técnicas en componentes
 */

const OPERADORES_CONFIG = {
  EPM: {
    nombre: 'EPM',
    active: true,
    tiposCable: {
      'ACSR': ['2 AWG', '1/0 AWG', '2/0 AWG', '4/0 AWG'],
      'Cu': ['2 AWG', '1/0 AWG'],
      'AAAC': ['2 AWG', '1/0 AWG']
    },
    normasBase: 'NTC 309 / ASTM B232 / RETIE'
  },
  ENEL: {
    nombre: 'ENEL (Codensa)',
    active: true,
    tiposCable: {
      'ACSR': ['2 AWG', '1/0 AWG', '2/0 AWG'],
      'Cu': ['2 AWG']
    },
    normasBase: 'NTC 309 / ASTM B232 / RETIE'
  },
  CELSIA: {
    nombre: 'CELSIA',
    active: false,
    tiposCable: {},
    normasBase: 'Próximamente'
  },
  ElectroHuila: {
    nombre: 'ElectroHuila',
    active: false,
    tiposCable: {},
    normasBase: 'Próximamente'
  },
  Enerca: {
    nombre: 'Enerca',
    active: false,
    tiposCable: {},
    normasBase: 'Próximamente'
  }
};

const NORMAS_COMPONENTES = {
  'Postes de Concreto Armado / Pretensado o PRFV': 'NTC 1329 / ASTM C1089 / RETIE',
  'Cruceta metálica angular': 'NTC 2134 / ASTM A36 / NTC 2076',
  'Aisladores tipo PIN / Line Post': 'ANSI C29.5 / IEC 60383 / NTC 2618',
  'Aisladores poliméricos': 'ANSI C29.13 / IEC 61109 / NTC 2618',
  'Grapas de retención tipo pistola': 'ANSI C119.4 / ASTM B211',
  'Cortacircuitos (Cutout)': 'IEEE C37.41 / NTC 2132 / RETIE',
  'Descargadores de sobretensión (DPS)': 'IEC 60099-4 / IEEE C62.11 / RETIE',
  'Varilla de puesta a tierra': 'NTC 2206 / UL 467 / RETIE',
  'Conductores Aéreos MT': 'NTC 360 / ASTM B231 / ASTM B232 / RETIE'
};

/**
 * Inyecta el selector de operador en el formulario (Paso 2)
 */
function inyectarSelectorOperador() {
  const formGrid = document.querySelector('.form-grid');
  if (!formGrid) return;

  // Crear div para el operador
  const operadorDiv = document.createElement('div');
  operadorDiv.innerHTML = `
    <label>Operador de la línea</label>
    <select id="operadorLinea" onchange="cambiarOperador()">
      <option value="">Seleccione operador...</option>
      ${Object.entries(OPERADORES_CONFIG).map(([key, op]) => `
        <option value="${key}" ${op.active ? '' : 'disabled'}>${op.nombre} ${!op.active ? '(próximamente)' : ''}</option>
      `).join('')}
    </select>
  `;

  // Insertar después del select de kV
  const kvSelect = formGrid.querySelector('#kv');
  if (kvSelect && kvSelect.parentElement) {
    kvSelect.parentElement.parentElement.insertAdjacentHTML('afterend', operadorDiv.innerHTML);
  }
}

/**
 * Maneja cambios de operador
 */
function cambiarOperador() {
  const operador = document.getElementById('operadorLinea')?.value;
  if (!operador) return;

  const config = OPERADORES_CONFIG[operador];
  if (!config) return;

  // Limpiar y llenar tipos de cable basado en operador
  const tipoCableadoSelect = document.getElementById('tipoCableado');
  if (tipoCableadoSelect) {
    tipoCableadoSelect.innerHTML = '<option value="">Seleccione tipo...</option>';
    Object.keys(config.tiposCable).forEach(tipo => {
      const opt = document.createElement('option');
      opt.value = tipo;
      opt.textContent = tipo;
      tipoCableadoSelect.appendChild(opt);
    });
  }

  console.log(`Operador seleccionado: ${operador} - Tipos de cable disponibles: ${Object.keys(config.tiposCable).join(', ')}`);
}

/**
 * Actualiza los calibres disponibles según operador y tipo de cable
 */
function actualizarCalibresConOperador() {
  const operador = document.getElementById('operadorLinea')?.value;
  const tipoCableado = document.getElementById('tipoCableado')?.value;

  if (!operador || !tipoCableado) return;

  const config = OPERADORES_CONFIG[operador];
  if (!config) return;

  const calibres = config.tiposCable[tipoCableado] || [];
  const calibreSelect = document.getElementById('calibreCableado');

  if (calibreSelect) {
    calibreSelect.innerHTML = '<option value="">Seleccione calibre...</option>';
    calibres.forEach(cal => {
      const opt = document.createElement('option');
      opt.value = cal;
      opt.textContent = cal;
      calibreSelect.appendChild(opt);
    });
  }
}

/**
 * Enriquece items con normas técnicas
 */
function enriquecerItemsConNormas() {
  if (!window.ITEMS_MASTER) return;

  ITEMS_MASTER.forEach(item => {
    // Buscar norma en el diccionario
    if (!item.norma_publica) {
      item.norma_publica = NORMAS_COMPONENTES[item.descripcion] || item.normas_fabricacion || '';
    }
  });

  console.log('Items enriquecidos con normas técnicas');
}

/**
 * Inyecta información de normas en el panel de especificaciones
 */
function mostrarNormaEnPanel(descripcion) {
  return NORMAS_COMPONENTES[descripcion] || 'Norma no especificada';
}

/**
 * Inicialización al cargar la página
 */
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(() => {
    inyectarSelectorOperador();
    enriquecerItemsConNormas();
    console.log('Integración de operadores y normas completada');
  }, 500);
});

// Parchear actualizarCalibres original para que use el operador
const actualizarCalibresOriginal = window.actualizarCalibres;
window.actualizarCalibres = function() {
  if (document.getElementById('operadorLinea')?.value) {
    actualizarCalibresConOperador();
  } else {
    if (actualizarCalibresOriginal) actualizarCalibresOriginal();
  }
};
