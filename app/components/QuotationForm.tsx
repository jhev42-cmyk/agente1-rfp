'use client'

import { useState } from 'react'
import {
  NIVELES_TENSION,
  TIPOS_CABLEADO,
  DEPARTAMENTOS,
  OPERADORES,
  TIPOS_CLIENTE,
  ALCANCES,
  MODULOS_DISPONIBLES,
  FormData,
} from '../lib/quotationData'

export default function QuotationForm() {
  const [formData, setFormData] = useState<Partial<FormData>>({
    codigoCotizacion: '',
    nombreProyecto: '',
    empresaSolicitante: 'Consulting RZ',
    respNombreCargo: '',
    respEmail: '',
    respTelefono: '',
    ccInterno: '',
    lugarEntrega: '',
    fechaLimite: '',
    reunionAclaraciones: '',
    kv: '13.2',
    km: 12,
    tipoCableado: 'Cobre',
    calibreCableado: '1/0 AWG',
    holgura: 3,
    depto: 'Boyacá',
    operadorLinea: '',
    cliente: '',
    alcance: '',
    modulos: MODULOS_DISPONIBLES,
  })

  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tipoSelected = e.target.value
    setFormData(prev => ({
      ...prev,
      tipoCableado: tipoSelected,
      calibreCableado: TIPOS_CABLEADO[tipoSelected as keyof typeof TIPOS_CABLEADO]?.[0] || '',
    }))
  }

  const handleGenerateCotizacion = async () => {
    setSaving(true)
    setMessage('')

    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/quotations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        setMessage(`Error: ${data.error}`)
        return
      }

      setMessage('✓ Cotización guardada exitosamente')
      setTimeout(() => setMessage(''), 3000)

      // Reset form
      setFormData({
        codigoCotizacion: '',
        nombreProyecto: '',
        empresaSolicitante: 'Consulting RZ',
        respNombreCargo: '',
        respEmail: '',
        respTelefono: '',
        ccInterno: '',
        lugarEntrega: '',
        fechaLimite: '',
        reunionAclaraciones: '',
        kv: '13.2',
        km: 12,
        tipoCableado: 'Cobre',
        calibreCableado: '1/0 AWG',
        holgura: 3,
        depto: 'Boyacá',
        operadorLinea: '',
        cliente: '',
        alcance: '',
        modulos: MODULOS_DISPONIBLES,
      })
    } catch (err) {
      setMessage('Error al guardar la cotización')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      {message && (
        <div style={{
          background: message.includes('Error') ? '#ffebee' : '#e8f5e9',
          color: message.includes('Error') ? '#c62828' : '#2e7d32',
          padding: '12px 16px',
          borderRadius: '6px',
          marginBottom: '20px',
          fontSize: '14px'
        }}>
          {message}
        </div>
      )}

      <div className="card">
        <h2>Datos del Proyecto</h2>
        <div className="form-grid">
          <div>
            <label>Código de cotización</label>
            <input
              type="text"
              placeholder="COT-2026-LMT-001"
              value={formData.codigoCotizacion || ''}
              onChange={(e) => handleInputChange('codigoCotizacion', e.target.value)}
            />
          </div>
          <div>
            <label>Nombre del proyecto</label>
            <input
              type="text"
              placeholder="Ej: Línea de Media Tensión en Boyacá"
              value={formData.nombreProyecto || ''}
              onChange={(e) => handleInputChange('nombreProyecto', e.target.value)}
            />
          </div>
          <div>
            <label>Empresa solicitante</label>
            <input
              type="text"
              value={formData.empresaSolicitante || ''}
              onChange={(e) => handleInputChange('empresaSolicitante', e.target.value)}
            />
          </div>
          <div>
            <label>Responsable (nombre y cargo)</label>
            <input
              type="text"
              placeholder="Ej: Nombre Apellido – Gerente"
              value={formData.respNombreCargo || ''}
              onChange={(e) => handleInputChange('respNombreCargo', e.target.value)}
            />
          </div>
          <div>
            <label>Correo del responsable</label>
            <input
              type="email"
              placeholder="nombre@empresa.com"
              value={formData.respEmail || ''}
              onChange={(e) => handleInputChange('respEmail', e.target.value)}
            />
          </div>
          <div>
            <label>Teléfono del responsable</label>
            <input
              type="text"
              placeholder="+57 3XX XXX XXXX"
              value={formData.respTelefono || ''}
              onChange={(e) => handleInputChange('respTelefono', e.target.value)}
            />
          </div>
          <div>
            <label>CC interno (opcional)</label>
            <input
              type="text"
              placeholder="Equipo de compras"
              value={formData.ccInterno || ''}
              onChange={(e) => handleInputChange('ccInterno', e.target.value)}
            />
          </div>
          <div>
            <label>Lugar de entrega</label>
            <input
              type="text"
              placeholder="Ej: Km 15 vía Tunja"
              value={formData.lugarEntrega || ''}
              onChange={(e) => handleInputChange('lugarEntrega', e.target.value)}
            />
          </div>
          <div>
            <label>Fecha límite de ofertas</label>
            <input
              type="text"
              placeholder="dd/mm/aaaa"
              value={formData.fechaLimite || ''}
              onChange={(e) => handleInputChange('fechaLimite', e.target.value)}
            />
          </div>
          <div>
            <label>Reunión de aclaraciones (opcional)</label>
            <input
              type="text"
              placeholder="dd/mm/aaaa, HH:MM"
              value={formData.reunionAclaraciones || ''}
              onChange={(e) => handleInputChange('reunionAclaraciones', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Parámetros Técnicos</h2>
        <div className="form-grid">
          <div>
            <label>Nivel de tensión</label>
            <select value={formData.kv || ''} onChange={(e) => handleInputChange('kv', e.target.value)}>
              {NIVELES_TENSION.map(nt => (
                <option key={nt.value} value={nt.value}>{nt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Longitud de la línea (km)</label>
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={formData.km || 0}
              onChange={(e) => handleInputChange('km', parseFloat(e.target.value))}
            />
          </div>
          <div>
            <label>Tipo de cableado</label>
            <select value={formData.tipoCableado || ''} onChange={handleTypeChange}>
              {Object.keys(TIPOS_CABLEADO).map(tipo => (
                <option key={tipo} value={tipo}>{tipo}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Calibre</label>
            <select value={formData.calibreCableado || ''} onChange={(e) => handleInputChange('calibreCableado', e.target.value)}>
              {formData.tipoCableado && TIPOS_CABLEADO[formData.tipoCableado as keyof typeof TIPOS_CABLEADO]?.map(calibre => (
                <option key={calibre} value={calibre}>{calibre}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Factor de holgura (%)</label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={formData.holgura || 0}
              onChange={(e) => handleInputChange('holgura', parseFloat(e.target.value))}
            />
          </div>
          <div>
            <label>Departamento</label>
            <select value={formData.depto || ''} onChange={(e) => handleInputChange('depto', e.target.value)}>
              {DEPARTAMENTOS.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Operador de la línea</label>
            <select value={formData.operadorLinea || ''} onChange={(e) => handleInputChange('operadorLinea', e.target.value)}>
              <option value="">Seleccione...</option>
              {OPERADORES.map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Tipo de cliente</label>
            <select value={formData.cliente || ''} onChange={(e) => handleInputChange('cliente', e.target.value)}>
              <option value="">Seleccione...</option>
              {TIPOS_CLIENTE.map(tc => (
                <option key={tc} value={tc}>{tc}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Alcance</label>
            <select value={formData.alcance || ''} onChange={(e) => handleInputChange('alcance', e.target.value)}>
              <option value="">Seleccione...</option>
              {ALCANCES.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Módulos y Componentes</h2>
        <p className="sub">Selecciona los módulos que deseas incluir en esta cotización</p>
        {MODULOS_DISPONIBLES.map((modulo) => (
          <div key={modulo.id} className="module">
            <div className="module-header">
              <input type="checkbox" defaultChecked={modulo.incluido} />
              <label>{modulo.titulo}</label>
            </div>
            <p style={{ fontSize: '13px', color: '#666', margin: '8px 0 12px 0' }}>
              {modulo.items.length} componentes disponibles
            </p>
          </div>
        ))}
      </div>

      <div className="card">
        <button
          className="btn"
          onClick={handleGenerateCotizacion}
          disabled={saving}
          style={{ marginRight: '10px' }}
        >
          {saving ? 'Guardando...' : '📥 Generar Cotización'}
        </button>
        <button className="btn btn-secondary">
          📥 Exportar PDF
        </button>
      </div>
    </div>
  )
}
