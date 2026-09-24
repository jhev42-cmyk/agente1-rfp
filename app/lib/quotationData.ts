// Datos técnicos para los selects del formulario

export const NIVELES_TENSION = [
  { value: '1', label: '1 kV' },
  { value: '4', label: '4 kV' },
  { value: '6', label: '6 kV' },
  { value: '13.2', label: '13.2 kV' },
  { value: '34.5', label: '34.5 kV' },
  { value: '69', label: '69 kV' },
  { value: '115', label: '115 kV' },
  { value: '230', label: '230 kV' },
]

// Operadores de línea - solo EPM y ENEL activos
export const OPERADORES_LINEA = [
  { value: 'EPM', label: 'EPM', active: true },
  { value: 'ENEL', label: 'ENEL', active: true },
  { value: 'CELSIA', label: 'CELSIA', active: false },
  { value: 'ElectroHuila', label: 'ElectroHuila', active: false },
  { value: 'Enerca', label: 'Enerca', active: false },
]

export const TIPOS_CABLEADO_EPM = {
  'ACSR': [
    { calibre: '2 AWG', norma: 'NTC 309 / ASTM B232', imax: '180 A' },
    { calibre: '1/0 AWG', norma: 'NTC 309 / ASTM B232', imax: '230 A' },
    { calibre: '2/0 AWG', norma: 'NTC 309 / ASTM B232', imax: '270 A' },
    { calibre: '4/0 AWG', norma: 'NTC 309 / ASTM B232', imax: '380 A' },
  ],
  'Cu': [
    { calibre: '2 AWG', norma: 'NTC 2120 / ASTM B3', imax: '95 A' },
    { calibre: '1/0 AWG', norma: 'NTC 2120 / ASTM B3', imax: '150 A' },
  ],
  'AAAC': [
    { calibre: '2 AWG', norma: 'NTC 2104 / ASTM B399', imax: '150 A' },
    { calibre: '1/0 AWG', norma: 'NTC 2104 / ASTM B399', imax: '195 A' },
  ],
}

export const TIPOS_CABLEADO_ENEL = {
  'ACSR': [
    { calibre: '2 AWG', norma: 'NTC 309 / ASTM B232', imax: '180 A' },
    { calibre: '1/0 AWG', norma: 'NTC 309 / ASTM B232', imax: '230 A' },
  ],
  'Cu': [
    { calibre: '2 AWG', norma: 'NTC 2120 / ASTM B3', imax: '95 A' },
  ],
}

export const DEPARTAMENTOS = [
  'Bogotá D.C.',
  'Antioquia',
  'Boyacá',
  'Cauca',
  'Cundinamarca',
  'Córdoba',
  'Guajira',
  'Huila',
  'Magdalena',
  'Meta',
  'Nariño',
  'Santander',
  'Sucre',
  'Tolima',
  'Valle del Cauca',
]

export const TIPOS_CLIENTE = [
  'Empresa de Servicios',
  'Empresa de Construcción',
  'Consultoría',
  'Distribuidor',
  'Generador',
  'Transportista',
  'Otro',
]

export const ALCANCES = [
  'Suministro de materiales',
  'Diseño + Suministro',
  'Instalación',
  'Diseño + Suministro + Instalación',
  'Operación y Mantenimiento',
]

export const MODULOS_DISPONIBLES = [
  {
    id: 'conductores',
    titulo: 'Conductores Aéreos',
    incluido: true,
    items: [
      {
        nombre: 'Conductor ACSR',
        cantidad: 0,
        familia: 'ACSR',
        calibre: '2 AWG',
        norma: 'NTC 309 / ASTM B232',
        normaUrl: null
      },
      {
        nombre: 'Conductor Cobre',
        cantidad: 0,
        familia: 'Cu',
        calibre: '2 AWG',
        norma: 'NTC 2120 / ASTM B3',
        normaUrl: null
      },
      {
        nombre: 'Conductor AAAC',
        cantidad: 0,
        familia: 'AAAC',
        calibre: '2 AWG',
        norma: 'NTC 2104 / ASTM B399',
        normaUrl: null
      },
    ]
  },
  {
    id: 'aislamiento',
    titulo: 'Aislamiento y Herrajes',
    incluido: true,
    items: [
      {
        nombre: 'Aisladores de porcelana',
        cantidad: 0,
        norma: 'IEC 60383 / IEC 61109',
        normaUrl: null
      },
      {
        nombre: 'Aisladores poliméricos',
        cantidad: 0,
        norma: 'IEC 61462 / ASTM D4508',
        normaUrl: null
      },
      {
        nombre: 'Herrajes de sujeción',
        cantidad: 0,
        norma: 'ASTM A90 / NTC 1329',
        normaUrl: null
      },
      {
        nombre: 'Grapas de retención',
        cantidad: 0,
        norma: 'ASTM A90 / ASTM E376',
        normaUrl: null
      },
    ]
  },
  {
    id: 'proteccion',
    titulo: 'Equipos de Protección',
    incluido: false,
    items: [
      {
        nombre: 'Pararrayos de óxido metálico',
        cantidad: 0,
        norma: 'IEC 60099-4 / NTC 2120',
        normaUrl: null
      },
      {
        nombre: 'Seccionadores bajo carga',
        cantidad: 0,
        norma: 'IEEE C37.41 / IEC 60947-3',
        normaUrl: null
      },
      {
        nombre: 'Fusibles de protección',
        cantidad: 0,
        norma: 'NTC 2120 / ASTM D2000',
        normaUrl: null
      },
    ]
  },
  {
    id: 'estructura',
    titulo: 'Estructura y Soporte',
    incluido: false,
    items: [
      {
        nombre: 'Postes de concreto',
        cantidad: 0,
        norma: 'NTC 1329 / ASTM A615',
        normaUrl: null
      },
      {
        nombre: 'Torres de acero galvanizado',
        cantidad: 0,
        norma: 'ASTM A123 / ISO 1461',
        normaUrl: null
      },
      {
        nombre: 'Cimentaciones',
        cantidad: 0,
        norma: 'NTC 2120 / NSR-10',
        normaUrl: null
      },
    ]
  },
]

export interface FormData {
  codigoCotizacion: string
  nombreProyecto: string
  empresaSolicitante: string
  respNombreCargo: string
  respEmail: string
  respTelefono: string
  ccInterno: string
  lugarEntrega: string
  fechaLimite: string
  reunionAclaraciones: string
  kv: string
  km: number
  tipoCableado: string
  calibreCableado: string
  holgura: number
  depto: string
  operadorLinea: string
  cliente: string
  alcance: string
  modulos: any[]
}
