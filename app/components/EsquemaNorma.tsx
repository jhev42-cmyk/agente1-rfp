'use client'

import { useEffect, useState } from 'react'

export default function EsquemaNorma({ normaId, tieneImagen, codigo, operador }: { normaId: number; tieneImagen: boolean; codigo?: string; operador?: string }) {
  const [imagenUrl, setImagenUrl] = useState<string | null>(null)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    console.log(`[EsquemaNorma] Props: tieneImagen=${tieneImagen}, operador=${operador}, codigo=${codigo}`)

    if (!tieneImagen) {
      console.log(`[EsquemaNorma] Sin imagen`)
      return
    }
    if (operador !== 'CELSIA' || !codigo) {
      console.log(`[EsquemaNorma] No es CELSIA o falta código`)
      return
    }

    const codigoLimpio = String(codigo).trim()

    // Intentar rutas en orden de preferencia
    const rutas = [
      `/FOTOS_CELSIA/Celsia-Foto-${codigoLimpio}.png`,
      `/FOTOS%20CELSIA/Celsia-Foto-${codigoLimpio}.png`,
      `/public/FOTOS_CELSIA/Celsia-Foto-${codigoLimpio}.png`,
    ]

    let intentoActual = 0

    const intentarCargar = () => {
      if (intentoActual >= rutas.length) {
        console.log(`[EsquemaNorma] ❌ Todas las rutas fallaron`)
        setError(`No se pudo cargar esquema para ${codigoLimpio}`)
        return
      }

      const url = rutas[intentoActual]
      console.log(`[EsquemaNorma] Intentando (${intentoActual + 1}/${rutas.length}): ${url}`)

      const img = new Image()
      img.onload = () => {
        console.log(`[EsquemaNorma] ✅ Éxito: ${url}`)
        setImagenUrl(url)
        setError('')
      }
      img.onerror = () => {
        console.log(`[EsquemaNorma] ❌ Falló: ${url}`)
        intentoActual++
        intentarCargar()
      }
      img.src = url
    }

    intentarCargar()
  }, [tieneImagen, codigo, operador])

  if (!tieneImagen) {
    return <p style={{ fontSize: 13, color: '#999' }}>Sin esquema cargado en el catálogo</p>
  }

  if (!codigo || operador !== 'CELSIA') {
    return <p style={{ fontSize: 13, color: '#999' }}>Sin esquema cargado en el catálogo</p>
  }

  if (error) {
    return <p style={{ fontSize: 13, color: '#999' }}>Sin esquema cargado en el catálogo</p>
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
