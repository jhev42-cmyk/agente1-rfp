'use client'

import { useEffect, useState } from 'react'
import { api } from '../lib/cliente'

// La imagen requiere sesión, así que se descarga con el token y se muestra como blob.
export default function EsquemaNorma({ normaId, tieneImagen, version = 0 }: { normaId: number; tieneImagen: boolean; version?: number }) {
  const [url, setUrl] = useState<string | null>(null)
  const [fallo, setFallo] = useState(false)

  useEffect(() => {
    setUrl(null); setFallo(false)
    if (!tieneImagen) return
    let actual: string | null = null
    api<Blob>(`/api/catalogo/normas/${normaId}/imagen`)
      .then((b) => { actual = URL.createObjectURL(b); setUrl(actual) })
      .catch(() => setFallo(true))
    return () => { if (actual) URL.revokeObjectURL(actual) }
  }, [normaId, tieneImagen, version])

  return (
    <div className="esquema">
      {/* Imagen local (blob) descargada con la sesión: next/image no aplica aquí. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url ? <img src={url} alt="Esquema de la estructura" /> : tieneImagen && !fallo ? 'Cargando esquema…' : 'Sin esquema cargado en el catálogo'}
    </div>
  )
}
