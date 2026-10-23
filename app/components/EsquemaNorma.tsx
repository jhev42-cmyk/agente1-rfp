'use client'

import { useEffect, useState } from 'react'
import { api } from '../lib/cliente'

// Carga múltiples imágenes (01, 02, 03) para una norma
export default function EsquemaNorma({ normaId, tieneImagen, version = 0 }: { normaId: number; tieneImagen: boolean; version?: number }) {
  const [urls, setUrls] = useState<(string | null)[]>([])
  const [fallo, setFallo] = useState(false)

  useEffect(() => {
    setUrls([]); setFallo(false)
    if (!tieneImagen) return

    const numeros = ['01', '02', '03']
    const actuales: (string | null)[] = []
    let cargadas = 0
    let errores = 0

    Promise.all(
      numeros.map((num) =>
        api<Blob>(`/api/catalogo/normas/${normaId}/imagen?num=${num}`)
          .then((b) => {
            const url = URL.createObjectURL(b)
            actuales[numeros.indexOf(num)] = url
            cargadas++
          })
          .catch(() => {
            actuales[numeros.indexOf(num)] = null
            errores++
          })
      )
    ).then(() => {
      setUrls(actuales)
      if (cargadas === 0) setFallo(true)
    })

    return () => {
      actuales.forEach((url) => { if (url) URL.revokeObjectURL(url) })
    }
  }, [normaId, tieneImagen, version])

  return (
    <div className="esquema" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {!tieneImagen ? (
        <p>Sin esquema cargado en el catálogo</p>
      ) : urls.length === 0 ? (
        <p>Cargando esquemas…</p>
      ) : urls.every((u) => !u) ? (
        <p>Sin esquema cargado en el catálogo</p>
      ) : (
        urls.map((url, idx) =>
          url ? (
            <div key={idx} style={{ textAlign: 'center' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Esquema ${idx + 1} de la estructura`}
                style={{ maxWidth: '100%', height: 'auto', border: '1px solid #eee', borderRadius: 4 }}
              />
            </div>
          ) : null
        )
      )}
    </div>
  )
}
