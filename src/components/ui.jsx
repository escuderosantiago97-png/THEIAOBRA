import { SC, SL, F } from '../constants'

// ── STYLES ────────────────────────────────────────────────────────────────────
export const iS = {
  background: '#0A0A0A', border: '1px solid #1E1E1E', borderRadius: '10px',
  padding: '10px 14px', color: '#FFF', fontSize: '14px', fontFamily: F,
  outline: 'none', width: '100%', boxSizing: 'border-box',
}

export const lS = {
  fontSize: '10px', fontWeight: 700, color: '#555', letterSpacing: '0.7px',
  textTransform: 'uppercase', fontFamily: F, display: 'block', marginBottom: '6px',
}

// ── BADGE ─────────────────────────────────────────────────────────────────────
export const Badge = ({ status }) => (
  <span style={{
    background: SC[status] + '20', color: SC[status], border: `1px solid ${SC[status]}40`,
    padding: '3px 11px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
    fontFamily: F, whiteSpace: 'nowrap',
  }}>
    {SL[status] || status}
  </span>
)

// ── BUTTON ────────────────────────────────────────────────────────────────────
export const Btn = ({ children, onClick, variant = 'primary', size = 'md', disabled = false, style: st = {} }) => {
  const vs = {
    primary:   { background: '#F5A623', color: '#000', border: 'none' },
    secondary: { background: 'transparent', color: '#888', border: '1px solid #222' },
    danger:    { background: 'transparent', color: '#F87171', border: '1px solid #F8717144' },
    ghost:     { background: 'transparent', color: '#FFF', border: 'none' },
    success:   { background: '#22C55E18', color: '#22C55E', border: '1px solid #22C55E44' },
    purple:    { background: '#A78BFA18', color: '#A78BFA', border: '1px solid #A78BFA44' },
  }
  const ss = {
    sm: { padding: '5px 12px', fontSize: '12px' },
    md: { padding: '10px 18px', fontSize: '14px' },
    lg: { padding: '13px 26px', fontSize: '15px' },
  }
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ ...vs[variant], ...ss[size], borderRadius: '10px', fontFamily: F, fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1,
        transition: 'all .15s', ...st }}>
      {children}
    </button>
  )
}

// ── FIELD ─────────────────────────────────────────────────────────────────────
export const Field = ({ label, value, onChange, type = 'text', placeholder, onKeyDown }) => (
  <div>
    <label style={lS}>{label}</label>
    <input type={type} value={value ?? ''} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} onKeyDown={onKeyDown} style={iS} />
  </div>
)

// ── TEXTAREA ──────────────────────────────────────────────────────────────────
export const Textarea = ({ label, value, onChange, rows = 4, placeholder }) => (
  <div>
    <label style={lS}>{label}</label>
    <textarea value={value ?? ''} onChange={e => onChange(e.target.value)}
      rows={rows} placeholder={placeholder} style={{ ...iS, resize: 'vertical' }} />
  </div>
)

// ── CARD ──────────────────────────────────────────────────────────────────────
export const Card = ({ children, style: st = {}, onClick }) => (
  <div onClick={onClick}
    style={{ background: '#0D0D0D', border: '1px solid #1A1A1A', borderRadius: '14px',
      padding: '20px', cursor: onClick ? 'pointer' : 'default', ...st }}>
    {children}
  </div>
)

// ── MODAL ─────────────────────────────────────────────────────────────────────
export const Modal = ({ children, onClose, title, width = 580 }) => (
  <div onClick={e => e.target === e.currentTarget && onClose()}
    style={{ position: 'fixed', inset: 0, background: '#000000DD', zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
    <div style={{ background: '#0D0D0D', border: '1px solid #222', borderRadius: '16px',
      width: '100%', maxWidth: width, maxHeight: '90vh', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '18px 24px', borderBottom: '1px solid #1A1A1A' }}>
        <h3 style={{ margin: 0, color: '#FFF', fontFamily: F, fontSize: '17px', fontWeight: 700 }}>
          {title}
        </h3>
        <button onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#555', fontSize: '24px', cursor: 'pointer', lineHeight: 1 }}>
          ×
        </button>
      </div>
      <div style={{ padding: '24px' }}>{children}</div>
    </div>
  </div>
)

// ── SECTION TITLE ─────────────────────────────────────────────────────────────
export const ST = ({ children, color = '#F5A623' }) => (
  <h4 style={{ margin: '0 0 16px', color, fontSize: '10px', fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: F }}>
    {children}
  </h4>
)

// ── PDF BUTTONS ───────────────────────────────────────────────────────────────
export const PDFButtons = ({ q, saleId, sale, savePDF, buildQPDF, buildRCPDF, pdfName, calc }) => {
  const T = calc(q.items, q.discount || 0, q.includeIVA)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ color: '#555', fontSize: '10px', fontFamily: F, fontWeight: 700,
        textTransform: 'uppercase', marginBottom: '2px' }}>Documentos</div>
      <Btn onClick={() => savePDF(() => buildQPDF(q), pdfName('Cotizacion', q.id, q.client))} variant="secondary">
        📄 Cotización PDF
      </Btn>
      <Btn onClick={() => savePDF(() => buildRCPDF(q, saleId, sale?.total || T.total, sale?.adelanto || 0, sale?.saldo || 0), pdfName('Recibo', saleId || q.id, q.client))} variant="secondary">
        🧾 Recibo PDF
      </Btn>
    </div>
  )
}

// ── TOAST ─────────────────────────────────────────────────────────────────────
import { useState, useCallback, useEffect } from 'react'

export const useToast = () => {
  const [toasts, setToasts] = useState([])
  const show = useCallback((msg, type = 'success') => {
    const id = Date.now()
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000)
  }, [])
  const ToastContainer = () => (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 999, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: t.type === 'error' ? '#1a0000' : '#0a1a0a',
          border: `1px solid ${t.type === 'error' ? '#F8717144' : '#22C55E44'}`,
          color: t.type === 'error' ? '#F87171' : '#22C55E',
          padding: '10px 18px', borderRadius: 10, fontSize: 13, fontFamily: F, fontWeight: 600,
          boxShadow: '0 4px 20px #0008', animation: 'fadeIn .2s',
        }}>
          {t.type === 'error' ? '✕' : '✓'} {t.msg}
        </div>
      ))}
    </div>
  )
  return { show, ToastContainer }
}
