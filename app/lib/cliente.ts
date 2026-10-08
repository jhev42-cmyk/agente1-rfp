'use client'

// Error de la API con el cuerpo de la respuesta (ej. lista de postes afectados o errores por fila).
export class ApiError extends Error {
  constructor(public status: number, message: string, public data?: any) {
    super(message)
  }
}

export async function api<T = any>(path: string, opts: { method?: string; body?: unknown; form?: FormData } = {}): Promise<T> {
  // La sesión viaja en la cookie HttpOnly; no hay token en el navegador.
  const headers: Record<string, string> = {}
  let body: BodyInit | undefined
  if (opts.form) body = opts.form
  else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(opts.body)
  }
  const res = await fetch(path, { method: opts.method || (body ? 'POST' : 'GET'), headers, body })
  if (res.status === 401) {
    window.location.href = `/login?siguiente=${encodeURIComponent(window.location.pathname)}`
    throw new ApiError(401, 'Sesión expirada')
  }
  if (!res.ok) {
    const j = await res.json().catch(() => ({}))
    throw new ApiError(res.status, j.error || `Error ${res.status}`, j.data)
  }
  const tipo = res.headers.get('content-type') || ''
  return (tipo.includes('application/json') ? res.json() : res.blob()) as Promise<T>
}

export async function descargar(path: string, nombre: string) {
  const blob = await api<Blob>(path)
  guardarBlob(blob, nombre)
}

export function guardarBlob(blob: Blob, nombre: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = nombre
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

export const cop = (n: number | null | undefined) =>
  n == null ? '—' : '$' + Math.round(n).toLocaleString('es-CO')

export const num = (n: number) => n.toLocaleString('es-CO', { maximumFractionDigits: 3 })

export const fecha = (s: string | Date | null | undefined) =>
  s ? new Date(s).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) : '—'

export const ESTADO_LABEL: Record<string, string> = { BORRADOR: 'Borrador', EN_REVISION: 'En revisión', APROBADA: 'Aprobada' }
export const TIPO_PARTIDA_LABEL: Record<string, string> = {
  MATERIAL: 'Materiales', MANO_OBRA: 'Mano de obra', TRANSPORTE: 'Transporte', INDIRECTO: 'Indirectos',
}
