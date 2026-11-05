'use client'

import { useState } from 'react'

// Carga esquema: primero intenta URL estática para CELSIA, luego muestra la imagen
export default function EsquemaNorma({ normaId, tieneImagen, codigo, operador }: { normaId: number; tieneImagen: boolean; codigo?: string; operador?: string }) {
  const [imagenError, setImagenError] = useState(false)
  const [cargando, setCargando] = useState(true)

  if (!tieneImagen) {
    return <p style={{ fontSize: 13, color: '#999' }}>Sin esquema cargado en el catálogo</p>
  }

  // Para CELSIA, usar URL estática directamente
  if (operador === 'CELSIA' && codigo) {
    const codigoLimpio = String(codigo).trim()
    const imagenUrl = `/FOTOS_CELSIA/Celsia-Foto-${codigoLimpio}.png`

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ textAlign: 'center' }}>
          <img
            src={imagenUrl}
            alt={`Esquema ${codigoLimpio}`}
            style={{ maxWidth: '100%', height: 'auto', border: '1px solid #eee', borderRadius: 4 }}
            onLoad={() => setCargando(false)}
            onError={() => {
              setCargando(false)
              setImagenError(true)
            }}
          />
        </div>
        {cargando && <p style={{ fontSize: 12, color: '#999' }}>Cargando esquema…</p>}
        {imagenError && <p style={{ fontSize: 12, color: '#999' }}>Sin esquema cargado en el catálogo</p>}
      </div>
    )
  }

  // Para otras normas, mostrar mensaje genérico
  return <p style={{ fontSize: 13, color: '#999' }}>Sin esquema cargado en el catálogo</p>
}
