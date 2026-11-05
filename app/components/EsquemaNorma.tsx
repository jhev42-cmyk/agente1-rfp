'use client'

import { useEffect, useState } from 'react'

export default function EsquemaNorma({ normaId, tieneImagen, codigo, operador }: { normaId: number; tieneImagen: boolean; codigo?: string; operador?: string }) {
  const [imagenUrl, setImagenUrl] = useState<string | null>(null)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    if (!tieneImagen) return
    if (operador !== 'CELSIA' || !codigo) return

    const codigoLimpio = String(codigo).trim()
    const staticUrl = `/FOTOS_CELSIA/Celsia-Foto-${codigoLimpio}.png`
    const apiUrl = `/api/esquema-celsia/${codigoLimpio}`

    console.log(`[EsquemaNorma] Intentando cargar: ${codigoLimpio}`)
    console.log(`  Static URL: ${staticUrl}`)
    console.log(`  API URL: ${apiUrl}`)

    // Intentar cargar desde URL estática
    const img = new Image()
    img.onload = () => {
      console.log(`[EsquemaNorma] ✅ Static URL cargó correctamente`)
      setImagenUrl(staticUrl)
      setError('')
    }
    img.onerror = () => {
      console.log(`[EsquemaNorma] ❌ Static URL falló, intentando API...`)
      // Fallback a API
      fetch(apiUrl)
        .then((res) => {
          if (res.ok) {
            console.log(`[EsquemaNorma] ✅ API URL cargó correctamente`)
            setImagenUrl(apiUrl)
            setError('')
          } else {
            console.log(`[EsquemaNorma] ❌ API URL retornó ${res.status}`)
            setError(`API error: ${res.status}`)
          }
        })
        .catch((e) => {
          console.log(`[EsquemaNorma] ❌ Error en API: ${e.message}`)
          setError(`Error: ${e.message}`)
        })
    }
    img.src = staticUrl
  }, [tieneImagen, codigo, operador])

  if (!tieneImagen) {
    return <p style={{ fontSize: 13, color: '#999' }}>Sin esquema cargado en el catálogo</p>
  }

  if (!codigo || operador !== 'CELSIA') {
    return <p style={{ fontSize: 13, color: '#999' }}>Sin esquema cargado en el catálogo</p>
  }

  if (error) {
    return <p style={{ fontSize: 13, color: '#999' }}>Sin esquema: {error}</p>
  }

  if (!imagenUrl) {
    return <p style={{ fontSize: 13, color: '#999' }}>Cargando esquema…</p>
  }

  return (
    <div style={{ textAlign: 'center' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imagenUrl}
        alt={`Esquema ${codigo}`}
        style={{ maxWidth: '100%', height: 'auto', border: '1px solid #eee', borderRadius: 4 }}
      />
    </div>
  )
}
