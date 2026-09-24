'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Error en la autenticación')
        return
      }

      localStorage.setItem('token', data.token)
      router.push('/dashboard')
    } catch (err) {
      setError('Error al conectarse al servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)'
    }}>
      <div className="card" style={{ maxWidth: '400px', width: '100%' }}>
        <header style={{ margin: '-24px -28px 24px -28px', background: 'var(--navy)', padding: '24px 28px' }}>
          <h1>Agente 1 — Login</h1>
          <p>RFP Agent • Sistema de Cotizaciones</p>
        </header>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label>Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div style={{
              background: '#ffebee',
              color: '#c62828',
              padding: '10px 12px',
              borderRadius: '6px',
              marginBottom: '16px',
              fontSize: '13px'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn"
            disabled={loading}
            style={{ width: '100%', marginTop: '24px' }}
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <div className="note" style={{ marginTop: '24px', marginBottom: '0' }}>
          Demo: usa <strong>rfpagent@rfp.local</strong> / <strong>rfpagent123</strong>
        </div>
      </div>
    </div>
  )
}
