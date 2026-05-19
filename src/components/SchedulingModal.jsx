import { useState } from 'react'
import { F } from '../constants'
import { tod, calc, $, fD, gcal } from '../utils'
import { Modal, Field, Textarea, Btn } from './ui'

export default function SchedulingModal({ quote, onConfirm, onClose }) {
  const [form, setForm] = useState({
    ctfOrderId: '', installDate: tod(), installTime: '09:00',
    technicianName: '', installAddress: quote?.clientAddress || '',
    shipDate: tod(), carrier: '', notes: '', adelanto: '',
  })
  const [confirming, setConfirming] = useState(false)
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const total = calc(quote?.items || [], quote?.discount || 0, quote?.includeIVA).total
  const saldo = Math.max(total - (+form.adelanto || 0), 0)
  const ready = form.installDate && form.technicianName

  // ── Agendar en Google Calendar (envío + instalación)
  const openCalendar = () => {
    try { gcal(`📦 Envío — ${quote.client}`, form.shipDate, '08:00', `CTF: ${form.ctfOrderId}. Transportista: ${form.carrier}`, form.installAddress) } catch (_) {}
    setTimeout(() => {
      try { gcal(`🔧 Instalación — ${quote.client}`, form.installDate, form.installTime, `Técnico: ${form.technicianName}. CTF: ${form.ctfOrderId}`, form.installAddress) } catch (_) {}
    }, 600)
  }

  // ── Email al cliente
  const sendEmail = () => {
    const subject = encodeURIComponent(`THEIA — Confirmación de instalación y envío · ${quote.client}`)
    const body = encodeURIComponent(
`Estimado/a ${quote.client},

Le confirmamos los detalles de su pedido:

📦 ENVÍO
• Fecha estimada: ${fD(form.shipDate)}
• Transportista: ${form.carrier || 'A coordinar'}
• Dirección: ${form.installAddress || '-'}

🔧 INSTALACIÓN
• Fecha: ${fD(form.installDate)} a las ${form.installTime} hs
• Técnico: ${form.technicianName}
• Dirección: ${form.installAddress || '-'}

💰 RESUMEN DE PAGO
• Total: ${$(total)}
${+form.adelanto > 0 ? `• Adelanto abonado: ${$(+form.adelanto)}\n• Saldo pendiente: ${$(saldo)}` : ''}
${form.ctfOrderId ? `\n• N° Orden: ${form.ctfOrderId}` : ''}
${form.notes ? `\n• Notas: ${form.notes}` : ''}

Ante cualquier consulta no dude en comunicarse.

THEIA Diseño & Construcción`
    )
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank')
  }

  // ── Confirmar y guardar en la app
  const confirm = async () => {
    if (!ready || confirming) return
    setConfirming(true)
    try {
      await onConfirm({ ...form, quoteId: quote.id, total, saldo })
    } finally {
      setConfirming(false)
    }
  }

  return (
    <Modal title="Confirmar venta" onClose={onClose} width={540}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Cliente */}
        <div style={{ background: '#000', border: '1px solid #1A1A1A', borderLeft: '3px solid #F5A623', borderRadius: '10px', padding: '14px' }}>
          <div style={{ color: '#555', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', fontFamily: F }}>Cliente</div>
          <div style={{ color: '#FFF', fontWeight: 700, fontSize: '17px', fontFamily: F, marginTop: '3px' }}>{quote?.client}</div>
          {quote?.clientAddress && <div style={{ color: '#555', fontSize: '13px', fontFamily: F, marginTop: '2px' }}>{quote.clientAddress}</div>}
          <div style={{ color: '#F5A623', fontWeight: 700, fontSize: '16px', fontFamily: F, marginTop: '6px' }}>Total: {$(total)}</div>
        </div>

        <Field label="N° Orden CTF" value={form.ctfOrderId} onChange={v => set('ctfOrderId', v)} placeholder="ORD-001" />

        {/* Pago */}
        <div style={{ borderTop: '1px solid #1A1A1A', paddingTop: '16px' }}>
          <div style={{ color: '#A78BFA', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', fontFamily: F, marginBottom: '12px' }}>💰 Pago</div>
          <Field label="Adelanto $" value={form.adelanto} onChange={v => set('adelanto', v)} type="number" placeholder="0" />
          <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', background: '#000', border: '1px solid #1A1A1A', borderRadius: '10px', padding: '12px' }}>
            <span style={{ color: '#555', fontFamily: F, fontSize: '13px' }}>Saldo pendiente</span>
            <span style={{ color: saldo > 0 ? '#F87171' : '#22C55E', fontFamily: F, fontSize: '15px', fontWeight: 700 }}>{$(saldo)}</span>
          </div>
        </div>

        {/* Envío */}
        <div style={{ borderTop: '1px solid #1A1A1A', paddingTop: '16px' }}>
          <div style={{ color: '#22C55E', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', fontFamily: F, marginBottom: '12px' }}>📦 Envío</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Field label="Fecha" value={form.shipDate} onChange={v => set('shipDate', v)} type="date" />
            <Field label="Transportista" value={form.carrier} onChange={v => set('carrier', v)} placeholder="Andreani, OCA..." />
          </div>
        </div>

        {/* Instalación */}
        <div style={{ borderTop: '1px solid #1A1A1A', paddingTop: '16px' }}>
          <div style={{ color: '#60A5FA', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', fontFamily: F, marginBottom: '12px' }}>🔧 Instalación</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Field label="Fecha *" value={form.installDate} onChange={v => set('installDate', v)} type="date" />
            <Field label="Hora" value={form.installTime} onChange={v => set('installTime', v)} type="time" />
          </div>
          <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Field label="Técnico *" value={form.technicianName} onChange={v => set('technicianName', v)} placeholder="Nombre" />
            <Field label="Dirección" value={form.installAddress} onChange={v => set('installAddress', v)} />
          </div>
        </div>

        <Textarea label="Notas" value={form.notes} onChange={v => set('notes', v)} rows={2} />

        {/* Acciones separadas */}
        <div style={{ borderTop: '1px solid #1A1A1A', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

          {/* Botones de comunicación */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <Btn onClick={openCalendar} variant="secondary" disabled={!ready} style={{ flex: 1 }}>
              📅 Agendar en Calendar
            </Btn>
            <Btn onClick={sendEmail} variant="secondary" style={{ flex: 1 }}>
              ✉️ Email al cliente
            </Btn>
          </div>

          {/* Botón principal */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <Btn onClick={onClose} variant="ghost" style={{ flex: 1 }}>Cancelar</Btn>
            <Btn onClick={confirm} disabled={!ready || confirming} style={{ flex: 2 }}>
              {confirming ? 'Guardando...' : '✓ Confirmar — pasar a Ventas e Instalación'}
            </Btn>
          </div>
        </div>

      </div>
    </Modal>
  )
}
