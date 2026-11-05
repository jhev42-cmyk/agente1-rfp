'use client'

import Image from 'next/image'
import { useState } from 'react'

export default function EsquemaNorma({ normaId, tieneImagen, codigo, operador }: { normaId: number; tieneImagen: boolean; codigo?: string; operador?: string }) {
  const [error, setError] = useState(false)
  const [cargando, setCargando] = useState(true)

  if (!tieneImagen || operador !== 'CELSIA' || !codigo) {
    return <p style={{ fontSize: 13, color: '#999' }}>Sin esquema cargado en el catálogo</p>
  }

  const codigoLimpio = String(codigo).trim()
  const imagenUrl = `/FOTOS_CELSIA/Celsia-Foto-${codigoLimpio}.png`

  console.log(`[EsquemaNorma] Cargando desde: ${imagenUrl}`)

  return (
    <div style={{ textAlign: 'center' }}>
      <img
        src={imagenUrl}
        alt={`Esquema ${codigo}`}
        style={{ maxWidth: '100%', height: 'auto', border: '1px solid #eee', borderRadius: 4 }}
        onLoad={() => {
          console.log(`[EsquemaNorma] ✅ Imagen cargada: ${imagenUrl}`)
          setCargando(false)
        }}
        onError={() => {
          console.log(`[EsquemaNorma] ❌ Error cargando: ${imagenUrl}`)
          setError(true)
          setCargando(false)
        }}
      />
      {error && <p style={{ fontSize: 12, color: '#c00' }}>Error: No se pudo cargar la imagen</p>}
      {cargando && <p style={{ fontSize: 12, color: '#999' }}>Cargando...</p>}
    </div>
  )
}
