'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import QuotationForm from '../components/QuotationForm'

export default function DashboardPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'new' | 'list'>('new')

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
    } else {
      setIsAuthenticated(true)
      setLoading(false)
    }
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('token')
    router.push('/login')
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px' }}>Cargando...</div>
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div>
      <header>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>Agente 1 — Generador de Cotizaciones</h1>
            <p>RFP Agent • Sistema de Cotizaciones</p>
          </div>
          <button onClick={handleLogout} className="btn btn-secondary">
            Cerrar sesión
          </button>
        </div>
      </header>

      <main>
        <div style={{ marginBottom: '20px', borderBottom: '2px solid var(--border)' }}>
          <button
            onClick={() => setActiveTab('new')}
            style={{
              background: activeTab === 'new' ? 'var(--navy)' : 'transparent',
              color: activeTab === 'new' ? '#fff' : 'var(--navy)',
              border: 'none',
              padding: '12px 20px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            Nueva Cotización
          </button>
          <button
            onClick={() => setActiveTab('list')}
            style={{
              background: activeTab === 'list' ? 'var(--navy)' : 'transparent',
              color: activeTab === 'list' ? '#fff' : 'var(--navy)',
              border: 'none',
              padding: '12px 20px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            Mis Cotizaciones
          </button>
        </div>

        {activeTab === 'new' ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p style={{ marginBottom: '20px', fontSize: '16px', color: '#666' }}>
              Accede a la herramienta completa de generación de cotizaciones:
            </p>
            <a
              href="/agente.html"
              style={{
                display: 'inline-block',
                background: 'var(--navy)',
                color: '#fff',
                padding: '14px 28px',
                borderRadius: '6px',
                textDecoration: 'none',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              → Ir a Agente 1 - Generador de Cotizaciones
            </a>
          </div>
        ) : (
          <QuotationsList />
        )}
      </main>

      <footer>
        <p>© 2026 RFP Agent • Agente 1 | Última actualización: {new Date().toLocaleDateString('es-CO')}</p>
      </footer>
    </div>
  )
}

function QuotationsList() {
  const [quotations, setQuotations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchQuotations = async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await fetch('/api/quotations', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (res.ok) {
          const data = await res.json()
          setQuotations(data)
        }
      } catch (err) {
        console.error('Error fetching quotations:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchQuotations()
  }, [])

  if (loading) return <div>Cargando cotizaciones...</div>

  if (quotations.length === 0) {
    return (
      <div className="card">
        <p style={{ textAlign: 'center', color: '#999' }}>No hay cotizaciones guardadas aún.</p>
      </div>
    )
  }

  return (
    <div className="card">
      <h2>Cotizaciones Guardadas</h2>
      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Proyecto</th>
            <th>Empresa</th>
            <th>Fecha</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {quotations.map((q) => (
            <tr key={q.id}>
              <td>{q.codigoCotizacion}</td>
              <td>{q.nombreProyecto}</td>
              <td>{q.empresaSolicitante}</td>
              <td>{new Date(q.createdAt).toLocaleDateString('es-CO')}</td>
              <td>
                <a href={`/quotation/${q.id}`} style={{ color: 'var(--blue)', textDecoration: 'none', fontWeight: '600' }}>
                  Ver
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
