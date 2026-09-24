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

export const TIPOS_CABLEADO = {
  'Cobre': ['1/0 AWG', '2 AWG', '4 AWG', '6 AWG', '8 AWG'],
  'Aluminio': ['1/0 AWG', '2 AWG', '4 AWG', '6 AWG', '8 AWG'],
  'ACSR': ['1/0 AWG', '2 AWG', '4 AWG', '6 AWG', '8 AWG'],
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

export const OPERADORES = [
  'Red Eléctrica Nacional (REN)',
  'Interconexión Eléctrica (ISA)',
  'Codensa',
  'Emcali',
  'Empresas Públicas de Medellín (EPM)',
  'Otro',
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
    id: 'aislamiento',
    titulo: 'Aislamiento y Herrajes',
    incluido: true,
    items: [
      { nombre: 'Aisladores de porcelana', cantidad: 0, especificaciones: 'Según especificación' },
      { nombre: 'Aisladores poliméricos', cantidad: 0, especificaciones: 'Según especificación' },
      { nombre: 'Grapas de retención', cantidad: 0, especificaciones: 'Aluminio o acero galvanizado' },
      { nombre: 'Herrajes de sujeción', cantidad: 0, especificaciones: 'Acero galvanizado' },
    ]
  },
  {
    id: 'conductores',
    titulo: 'Conductores',
    incluido: true,
    items: [
      { nombre: 'Conductor principal', cantidad: 0, familia: 'Cobre', calibre: '1/0 AWG' },
      { nombre: 'Cable de guarda', cantidad: 0, especificaciones: 'Acero galvanizado' },
    ]
  },
  {
    id: 'proteccion',
    titulo: 'Equipos de Protección',
    incluido: false,
    items: [
      { nombre: 'Pararrayos', cantidad: 0, especificaciones: 'Según nivel de tensión' },
      { nombre: 'Seccionadores', cantidad: 0, especificaciones: 'Según especificación' },
      { nombre: 'Interruptores', cantidad: 0, especificaciones: 'Según carga' },
    ]
  },
  {
    id: 'estructura',
    titulo: 'Estructura y Soporte',
    incluido: false,
    items: [
      { nombre: 'Postes de concreto', cantidad: 0, altura: '10 m' },
      { nombre: 'Torres de acero', cantidad: 0, especificaciones: 'Según diseño' },
      { nombre: 'Cimentaciones', cantidad: 0, especificaciones: 'Según tipo de poste' },
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
