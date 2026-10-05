'use client'

import { useCallback, useRef, useState } from 'react'

type Opciones = {
  titulo: string
  mensaje?: React.ReactNode
  lista?: string[] // registros afectados, se muestran antes de confirmar
  pedirMotivo?: boolean
  textoConfirmar?: string
  peligro?: boolean
}

// Diálogo de confirmación que devuelve una promesa: el motivo escrito (o '' si no se pide),
// o null si el usuario cancela.
export function useDialogo() {
  const [abierto, setAbierto] = useState<Opciones | null>(null)
  const [motivo, setMotivo] = useState('')
  const resolver = useRef<(v: string | null) => void>()

  const pedir = useCallback((opciones: Opciones) => {
    setMotivo('')
    setAbierto(opciones)
    return new Promise<string | null>((resolve) => { resolver.current = resolve })
  }, [])

  const cerrar = (valor: string | null) => {
    setAbierto(null)
    resolver.current?.(valor)
  }

  const elemento = abierto && (
    <div className="modal-fondo" onClick={() => cerrar(null)}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{abierto.titulo}</h3>
        {abierto.mensaje && <div style={{ fontSize: 13.5, marginBottom: 10 }}>{abierto.mensaje}</div>}
        {abierto.lista && abierto.lista.length > 0 && <ul>{abierto.lista.map((x) => <li key={x}>{x}</li>)}</ul>}
        {abierto.pedirMotivo && (
          <div style={{ marginTop: 12 }}>
            <label>Motivo del cambio</label>
            <textarea rows={3} value={motivo} autoFocus onChange={(e) => setMotivo(e.target.value)} placeholder="Queda registrado en el historial" />
          </div>
        )}
        <div className="acciones">
          <button
            className={`btn ${abierto.peligro ? 'btn-peligro' : ''}`}
            disabled={abierto.pedirMotivo && !motivo.trim()}
            onClick={() => cerrar(motivo.trim())}
          >
            {abierto.textoConfirmar || 'Confirmar'}
          </button>
          <button className="btn btn-claro" onClick={() => cerrar(null)}>Cancelar</button>
        </div>
      </div>
    </div>
  )

  return { pedir, elemento }
}
