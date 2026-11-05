'use client'

import { useEffect, useState } from 'react'
import { api } from '../lib/cliente'

// Carga múltiples imágenes (01, 02, 03) para una norma
// Primero intenta desde /public/FOTOS_CELSIA/ (para CELSIA), luego desde API
export default function EsquemaNorma({ normaId, tieneImagen, codigo, operador, version = 0 }: { normaId: number; tieneImagen: boolean; codigo?: string; operador?: string; version?: number }) {
  const [urls, setUrls] = useState<(string | null)[]>([])
  const [fallo, setFallo] = useState(false)

  useEffect(() => {
    setUrls([]); setFallo(false)
    if (!tieneImagen) return

    // Si es CELSIA y tiene código, intentar URL estática primero
    if (operador === 'CELSIA' && codigo) {
      const codigoLimpio = String(codigo).trim()
      const staticUrls: (string | null)[] = []

      // Intenta cargar con números 01, 02, 03
      for (let i = 1; i <= 3; i++) {
        const url = `/FOTOS_CELSIA/Celsia-Foto-${codigoLimpio}-0${i}.png`
        const img = new Image()
        img.onload = () => { staticUrls[i - 1] = url }
        img.onerror = () => { staticUrls[i - 1] = null }
        img.src = url
      }

      // Fallback: intenta sin números
      const urlSin = `/FOTOS_CELSIA/Celsia-Foto-${codigoLimpio}.png`
      const imgSin = new Image()
      imgSin.onload = () => {
        if (!staticUrls.some(u => u)) {
          staticUrls[0] = urlSin
          setUrls(staticUrls)
        }
      }
      imgSin.onerror = () => {
        // Si no encuentra, cargar desde API
        loadFromAPI()
      }
      imgSin.src = urlSin

      // También intenta la primera con número
      if (staticUrls[0]) {
        setUrls(staticUrls)
        return
      }

      return
    }

    // Si no es CELSIA o no tiene código, cargar desde API
    loadFromAPI()

    function loadFromAPI() {
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
    }
  }, [normaId, tieneImagen, codigo, operador, version])

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
