export type Poste = { id: number; codigo: string; numero: number; trayecto: number; normaId: number | null; configuracionId: number | null }

export type Linea = {
  id: number; grupo: string; revision: number; nombre: string; longitudKm: number; operador: string
  estado: 'BORRADOR' | 'EN_REVISION' | 'APROBADA'
  kmzNombre: string | null; creadoPor: string; createdAt: string; updatedAt: string
  aprobadaPor: string | null; aprobadaAt: string | null
  trayectos: { numero: number; cantidadPostes: number }[]
  postes: Poste[]
  partidas: Partida[]
  revisiones: { id: number; revision: number; estado: string }[]
}

export type Partida = {
  id: number; tipo: 'MATERIAL' | 'MANO_OBRA' | 'TRANSPORTE' | 'INDIRECTO'; codigoMaterial: string | null
  descripcion: string; unidad: string; cantidad: number; precioUnitario: number | null
}

export type NormaResumen = {
  id: number; operador: string; codigo: string; version: number; tipoPoste: string; descripcion: string
  vigente: boolean; tieneImagen: boolean; creadoPor: string; motivo: string; createdAt: string
  configuraciones: { id: number; nombre: string; _count: { materiales: number } }[]
}

export type NormaDetalle = Omit<NormaResumen, 'configuraciones'> & {
  configuraciones: { id: number; nombre: string; materiales: { codigoMaterial: string; descripcion: string; unidad: string; cantidad: number; observacion: string | null }[] }[]
}

export type Calculo = {
  generado: string
  congelado: boolean
  errores: string[]
  postes: { total: number; configurados: number; pendientes: string[] }
  normasUsadas: { normaId: number; operador: string; codigo: string; version: number; tipoPoste: string; vigente: boolean; postes: number }[]
  materiales: {
    codigo: string; descripcion: string; unidad: string; categoria: string; cantidad: number
    detalle: { trayecto: number | null; poste: string; norma: string; cantidad: number }[]
  }[]
  cotizacion: {
    items: {
      tipo: 'MATERIAL' | 'MANO_OBRA' | 'TRANSPORTE' | 'INDIRECTO'; codigo: string | null; descripcion: string; unidad: string
      cantidad: number; precioUnitario: number | null; subtotal: number | null; fuentePrecio: string | null; partidaId?: number
    }[]
    subtotales: Record<string, number>
    total: number
    sinPrecio: string[]
  }
}

export type PropsPaso = {
  linea: Linea
  editable: boolean
  recargar: () => Promise<void>
  pedir: (o: { titulo: string; mensaje?: React.ReactNode; lista?: string[]; pedirMotivo?: boolean; textoConfirmar?: string; peligro?: boolean }) => Promise<string | null>
}

export const etiquetaNorma = (n: { codigo: string; version: number; tipoPoste?: string }) => `${n.codigo} v${n.version}`
