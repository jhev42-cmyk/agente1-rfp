'use client'

import { useState } from 'react'

// Carga esquema: primero intenta URL estática, luego desde API
export default function EsquemaNorma({ normaId, tieneImagen, codigo, operador }: { normaId: number; tieneImagen: boolean; codigo?: string; operador?: string }) {
  const [imagenError, setImagenError] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [imagenUrl, setImagenUrl] = useState<string>('')

  if (!tieneImagen) {
    return <p style={{ fontSize: 13, color: '#999' }}>Sin esquema cargado en el catálogo</p>
  }

  // Para CELSIA, usar URL estática primero, fallback a API
  if (operador === 'CELSIA' && codigo) {
    const codigoLimpio = String(codigo).trim()
    const staticUrl = `/FOTOS_CELSIA/Celsia-Foto-${codigoLimpio}.png`
    const apiUrl = `/api/esquema-celsia/${codigoLimpio}`

    const handleImageError = () => {
      setCargando(false)
      setImagenError(true)
      // Try API fallback
      setImagenUrl(apiUrl)
    }

    const handleImageLoad = () => {
      setCargando(false)
      setImagenError(false)
    }

    // Usar URL actual si está seteada, sino intentar estática
    const urlToUse = imagenUrl || staticUrl

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ textAlign: 'center' }}>
          <img
            src={urlToUse}
            alt={`Esquema ${codigoLimpio}`}
            style={{ maxWidth: '100%', height: 'auto', border: '1px solid #eee', borderRadius: 4 }}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        </div>
        {cargando && <p style={{ fontSize: 12, color: '#999' }}>Cargando esquema…</p>}
        {imagenError && imagenUrl === staticUrl && <p style={{ fontSize: 12, color: '#999' }}>Sin esquema cargado en el catálogo</p>}
      </div>
    )
  }

  // Para otras normas, mostrar mensaje genérico
  return <p style={{ fontSize: 13, color: '#999' }}>Sin esquema cargado en el catálogo</p>
}
