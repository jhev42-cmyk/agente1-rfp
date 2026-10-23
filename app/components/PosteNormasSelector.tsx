'use client'

import { useState, useEffect } from 'react'

interface Norma {
  id: number
  operador: string
  codigo: string
  tipoPoste: string
  descripcion: string
  configuraciones: { id: number; nombre: string; orden: number }[]
}

interface PosteNorma extends Norma {
  posteNormaId: number
  seleccionada: boolean
  configuracionId: number | null
}

interface Props {
  id: number
  posteId: number
  posteNumero: string
  operador?: string
  onNormasChange?: (normas: PosteNorma[]) => void
}

export default function PosteNormasSelector({
  id,
  posteId,
  posteNumero,
  operador,
  onNormasChange,
}: Props) {
  const [normasAsignadas, setNormasAsignadas] = useState<any[]>([])
  const [normasDisponibles, setNormasDisponibles] = useState<Norma[]>([])
  const [normaSeleccionada, setNormaSeleccionada] = useState<number | null>(null)
  const [configuracionSeleccionada, setConfiguracionSeleccionada] = useState<number | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cargar normas asignadas
  useEffect(() => {
    cargarNormasAsignadas()
    cargarNormasDisponibles()
  }, [id, posteId, operador])

  const cargarNormasAsignadas = async () => {
    try {
      const res = await fetch(`/api/lineas/${id}/postes/${posteId}/normas`)
      if (!res.ok) throw new Error('Error al cargar normas')
      const data = await res.json()
      setNormasAsignadas(data)
    } catch (err) {
      console.error(err)
    }
  }

  const cargarNormasDisponibles = async () => {
    try {
      // Cargar TODAS las normas del operador (no solo las no asignadas)
      const url = `/api/catalogo/normas?operador=${operador}`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Error al cargar normas disponibles')
      const data = await res.json()
      setNormasDisponibles(data)
    } catch (err) {
      console.error(err)
    }
  }

  const agregarNorma = async () => {
    if (!normaSeleccionada) {
      setError('Selecciona una norma')
      return
    }

    // Validar que no sea duplicada
    if (normasAsignadas.some((n) => n.normaId === normaSeleccionada)) {
      setError('Esta norma ya está asignada a este poste')
      return
    }

    setCargando(true)
    setError(null)

    try {
      const res = await fetch(`/api/lineas/${id}/postes/${posteId}/normas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          normaId: normaSeleccionada,
          configuracionId: configuracionSeleccionada,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al agregar norma')
      }

      setNormaSeleccionada(null)
      setConfiguracionSeleccionada(null)
      await cargarNormasAsignadas()
      await cargarNormasDisponibles()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setCargando(false)
    }
  }

  const cambiarNormaSeleccionada = async (posteNormaId: number, normaId: number) => {
    try {
      const res = await fetch(`/api/lineas/${id}/postes/${posteId}/normas/${normaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seleccionada: true }),
      })

      if (!res.ok) throw new Error('Error al seleccionar norma')

      await cargarNormasAsignadas()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const cambiarConfiguracion = async (posteNormaId: number, normaId: number, configId: number | null) => {
    try {
      const res = await fetch(`/api/lineas/${id}/postes/${posteId}/normas/${normaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configuracionId: configId }),
      })

      if (!res.ok) throw new Error('Error al cambiar configuración')

      await cargarNormasAsignadas()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const eliminarNorma = async (normaId: number) => {
    if (!confirm('¿Eliminar esta norma del poste?')) return

    try {
      const res = await fetch(`/api/lineas/${id}/postes/${posteId}/normas/${normaId}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Error al eliminar norma')

      await cargarNormasAsignadas()
      await cargarNormasDisponibles()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const normaSeleccionadaActual = normasAsignadas.find((n) => n.seleccionada)

  return (
    <div className="border rounded-lg p-4 bg-white">
      <h3 className="font-semibold text-sm mb-3">Normas para {posteNumero}</h3>

      {/* Normas actualmente asignadas */}
      <div className="mb-4">
        <label className="text-xs font-semibold text-gray-600 block mb-2">Normas asignadas:</label>
        <div className="space-y-2">
          {normasAsignadas.length === 0 ? (
            <p className="text-xs text-gray-500">Sin normas asignadas</p>
          ) : (
            normasAsignadas.map((pn) => (
              <div key={pn.id} className="border rounded p-2 bg-gray-50">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <label className="flex items-center gap-2 cursor-pointer mb-2">
                      <input
                        type="radio"
                        name={`norma-${posteId}`}
                        checked={pn.seleccionada}
                        onChange={() => cambiarNormaSeleccionada(pn.id, pn.norma.id)}
                        className="w-4 h-4"
                      />
                      <span className="text-xs">
                        <strong>{pn.norma.codigo}</strong> - {pn.norma.operador}
                      </span>
                    </label>

                    {pn.seleccionada && pn.norma.configuraciones.length > 0 && (
                      <select
                        value={pn.configuracionId || ''}
                        onChange={(e) =>
                          cambiarConfiguracion(pn.id, pn.norma.id, e.target.value ? parseInt(e.target.value) : null)
                        }
                        className="w-full text-xs px-2 py-1 border rounded bg-white"
                      >
                        <option value="">-- Selecciona configuración --</option>
                        {pn.norma.configuraciones.map((cfg: any) => (
                          <option key={cfg.id} value={cfg.id}>
                            {cfg.nombre}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <button
                    onClick={() => eliminarNorma(pn.norma.id)}
                    className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Agregar nueva norma */}
      {normasDisponibles.length > 0 && (
        <div style={{ borderTop: '1px solid #ddd', paddingTop: 16, marginTop: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#333', display: 'block', marginBottom: 8 }}>Agregar norma:</label>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <select
              value={normaSeleccionada || ''}
              onChange={(e) => {
                const normaId = e.target.value ? parseInt(e.target.value) : null
                setNormaSeleccionada(normaId)
                setConfiguracionSeleccionada(null)
              }}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13 }}
            >
              <option value="">-- Selecciona una norma --</option>
              {normasDisponibles.map((norma) => (
                <option key={norma.id} value={norma.id}>
                  {norma.codigo} - {norma.operador} ({norma.tipoPoste.slice(0, 30)})
                </option>
              ))}
            </select>

            {normaSeleccionada && (
              <select
                value={configuracionSeleccionada || ''}
                onChange={(e) => setConfiguracionSeleccionada(e.target.value ? parseInt(e.target.value) : null)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13 }}
              >
                <option value="">-- Configuración (opcional) --</option>
                {normasDisponibles
                  .find((n) => n.id === normaSeleccionada)
                  ?.configuraciones.map((cfg: any) => (
                    <option key={cfg.id} value={cfg.id}>
                      {cfg.nombre}
                    </option>
                  ))}
              </select>
            )}

            <button
              onClick={agregarNorma}
              disabled={cargando || !normaSeleccionada}
              style={{
                width: '100%',
                padding: '10px 16px',
                fontSize: 14,
                fontWeight: 600,
                backgroundColor: cargando || !normaSeleccionada ? '#ccc' : '#1e3a8a',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: cargando || !normaSeleccionada ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                if (!cargando && normaSeleccionada) {
                  (e.target as HTMLButtonElement).style.backgroundColor = '#1e40af'
                }
              }}
              onMouseLeave={(e) => {
                if (!cargando && normaSeleccionada) {
                  (e.target as HTMLButtonElement).style.backgroundColor = '#1e3a8a'
                }
              }}
            >
              {cargando ? 'Agregando...' : 'Agregar Norma'}
            </button>
          </div>

          {error && <p style={{ fontSize: 12, color: '#dc2626', marginTop: 8 }}>{error}</p>}
        </div>
      )}
    </div>
  )
}
