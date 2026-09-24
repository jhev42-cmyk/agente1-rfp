'use client'

import { useState } from 'react'
import {
  NIVELES_TENSION,
  OPERADORES_LINEA,
  TIPOS_CABLEADO_EPM,
  TIPOS_CABLEADO_ENEL,
  DEPARTAMENTOS,
  TIPOS_CLIENTE,
  ALCANCES,
  MODULOS_DISPONIBLES,
  FormData,
} from '../lib/quotationData'

export default function QuotationForm() {
  const [formData, setFormData] = useState<Partial<FormData>>({
    codigoCotizacion: '',
    nombreProyecto: '',
    empresaSolicitante: '',
    respNombreCargo: '',
    respEmail: '',
    respTelefono: '',
    ccInterno: '',
    lugarEntrega: '',
    fechaLimite: '',
    reunionAclaraciones: '',
    kv: '13.2',
    km: 12,
    operadorLinea: '',
    tipoCableado: '',
    calibreCableado: '',
    holgura: 3,
    depto: 'Boyacá',
    cliente: '',
    alcance: '',
    modulos: MODULOS_DISPONIBLES,
  })

  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleOperadorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const operador = e.target.value
    setFormData(prev => ({
      ...prev,
      operadorLinea: operador,
      tipoCableado: '',
      calibreCableado: '',
    }))
  }

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tipoSelected = e.target.value
    const tiposDisponibles = formData.operadorLinea === 'EPM' ? TIPOS_CABLEADO_EPM : TIPOS_CABLEADO_ENEL
    const primercalibre = (tiposDisponibles as any)[tipoSelected]?.[0]

    setFormData(prev => ({
      ...prev,
      tipoCableado: tipoSelected,
      calibreCableado: primercalibre?.calibre || '',
    }))
  }

  const getTiposDisponibles = (): any => {
    if (!formData.operadorLinea) return {}
    return formData.operadorLinea === 'EPM' ? TIPOS_CABLEADO_EPM : TIPOS_CABLEADO_ENEL
  }

  const getCalibreSeleccionado = () => {
    if (!formData.tipoCableado) return null
    const tipos = getTiposDisponibles()
    const calibres = tipos[formData.tipoCableado] || []
    return calibres.find((c: any) => c.calibre === formData.calibreCableado)
  }

  const handleGenerateCotizacion = async () => {
    if (!formData.operadorLinea) {
      setMessage('Error: Debe seleccionar un operador de línea')
      return
    }
    if (!formData.codigoCotizacion || !formData.nombreProyecto) {
      setMessage('Error: Código y nombre de proyecto son requeridos')
      return
    }

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

      setFormData({
        codigoCotizacion: '',
        nombreProyecto: '',
        empresaSolicitante: '',
        respNombreCargo: '',
        respEmail: '',
        respTelefono: '',
        ccInterno: '',
        lugarEntrega: '',
        fechaLimite: '',
        reunionAclaraciones: '',
        kv: '13.2',
        km: 12,
        operadorLinea: '',
        tipoCableado: '',
        calibreCableado: '',
        holgura: 3,
        depto: 'Boyacá',
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

  const calibreInfo = getCalibreSeleccionado()

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
              placeholder="Ej: Consulting RZ"
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
              <option value="">Seleccione...</option>
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
            <label>Operador de la línea</label>
            <select value={formData.operadorLinea || ''} onChange={handleOperadorChange}>
              <option value="">Seleccione operador...</option>
              {OPERADORES_LINEA.map(op => (
                <option
                  key={op.value}
                  value={op.value}
                  disabled={!op.active}
                >
                  {op.label} {!op.active ? '(próximamente)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Tipo de cableado</label>
            <select
              value={formData.tipoCableado || ''}
              onChange={handleTypeChange}
              disabled={!formData.operadorLinea}
            >
              <option value="">Seleccione tipo...</option>
              {Object.keys(getTiposDisponibles()).map(tipo => (
                <option key={tipo} value={tipo}>{tipo}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Calibre</label>
            <select
              value={formData.calibreCableado || ''}
              onChange={(e) => handleInputChange('calibreCableado', e.target.value)}
              disabled={!formData.tipoCableado}
            >
              <option value="">Seleccione calibre...</option>
              {formData.tipoCableado && getTiposDisponibles()[formData.tipoCableado]?.map((c: any) => (
                <option key={c.calibre} value={c.calibre}>{c.calibre}</option>
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
              <option value="">Seleccione...</option>
              {DEPARTAMENTOS.map(d => (
                <option key={d} value={d}>{d}</option>
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

        {calibreInfo && (
          <div style={{
            background: '#f0f7ff',
            border: '1px solid #b3d9ff',
            borderRadius: '6px',
            padding: '12px',
            marginTop: '16px',
            fontSize: '13px'
          }}>
            <div><strong>Norma:</strong> {calibreInfo.norma}</div>
            <div><strong>Imax (Ampacidad):</strong> {calibreInfo.imax}</div>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Módulos y Componentes</h2>
        <p className="sub">Los componentes se muestran con sus normas aplicables</p>
        {MODULOS_DISPONIBLES.map((modulo) => (
          <div key={modulo.id} className="module" style={{ marginBottom: '16px' }}>
            <div className="module-header">
              <input type="checkbox" defaultChecked={modulo.incluido} />
              <label>{modulo.titulo}</label>
            </div>
            <div style={{ marginLeft: '24px', fontSize: '13px' }}>
              {modulo.items.map((item: any, idx: number) => (
                <div key={idx} style={{
                  borderBottom: idx < modulo.items.length - 1 ? '1px solid #e0e0e0' : 'none',
                  paddingBottom: '12px',
                  marginBottom: '12px'
                }}>
                  <div style={{ fontWeight: '600', color: '#1F3864', marginBottom: '4px' }}>
                    {item.nombre}
                  </div>
                  {item.norma && (
                    <div style={{ color: '#555', marginBottom: '4px' }}>
                      <strong>Norma:</strong>
                      {item.normaUrl ? (
                        <a
                          href={item.normaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#2E5395', marginLeft: '4px', textDecoration: 'none', fontWeight: '600' }}
                        >
                          {item.norma} ↗
                        </a>
                      ) : (
                        <span style={{ marginLeft: '4px', color: '#666' }}>{item.norma}</span>
                      )}
                    </div>
                  )}
                  {item.familia && item.calibre && (
                    <div style={{ color: '#666', fontSize: '12px' }}>
                      Familia: <strong>{item.familia}</strong> | Calibre: <strong>{item.calibre}</strong>
                    </div>
                  )}
                </div>
              ))}
            </div>
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
          {saving ? 'Guardando...' : '💾 Guardar Cotización'}
        </button>
        <button className="btn btn-secondary">
          📄 Exportar PDF
        </button>
        <button className="btn btn-secondary" style={{ marginLeft: '10px' }}>
          📊 Exportar Excel
        </button>
      </div>
    </div>
  )
}
