import { useState } from 'react'
import { sb } from '../supabase'
import { F, SL } from '../constants'
import { fD } from '../utils'
import { dSh } from '../mappers'
import { Card, Badge, Btn, Field, Textarea, ST, Modal } from './ui'

export default function ShipmentsView({ data, setData, userId, toast }) {
  const [sel, setSel]             = useState(null)
  const [hoveredId, setHoveredId] = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)

  const del = async (id) => {
    try {
      const { error } = await sb.from('shipments').delete().eq('id', id)
      if (error) throw new Error(error.message)
      setData({ ...data, shipments: data.shipments.filter(s => s.id !== id) })
      setConfirmDel(null)
      toast('Envío eliminado', 'error')
    } catch (e) { toast('Error: ' + e.message, 'error') }
  }

  const upd = async (id, changes) => {
    const shipments = data.shipments.map(s => s.id === id ? { ...s, ...changes } : s)
    const ship = shipments.find(s => s.id === id)
    await sb.from('shipments').update(dSh(ship, userId)).eq('id', id)
    setData({ ...data, shipments })
    if (sel?.id === id) setSel(p => ({ ...p, ...changes }))
    if (changes.status) toast(`Estado → ${SL[changes.status] || changes.status}`)
  }

  if (sel) {
    const ship = data.shipments.find(s => s.id === sel.id) || sel
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px' }}>
          <Btn onClick={() => setSel(null)} variant="ghost" size="sm">← Volver</Btn>
          <div style={{ background: '#22C55E12', border: '1px solid #22C55E30', borderRadius: '10px', padding: '6px 12px' }}>
            <span style={{ color: '#22C55E', fontFamily: F, fontSize: '13px', fontWeight: 800 }}>{ship.id}</span>
          </div>
          <h2 style={{ margin: 0, color: '#FFF', fontFamily: F, fontSize: '22px', fontWeight: 800 }}>{ship.client}</h2>
          <Badge status={ship.status} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Card>
            <ST color="#22C55E">Información</ST>
            {[['CTF', ship.ctfOrderId || '-'], ['Fecha', fD(ship.scheduledDate)], ['Transportista', ship.carrier || '-'], ['Dirección', ship.address]].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', gap: '12px', marginBottom: '10px' }}>
                <span style={{ color: '#444', fontSize: '10px', fontFamily: F, fontWeight: 700, minWidth: '100px', textTransform: 'uppercase' }}>{k}</span>
                <span style={{ color: '#FFF', fontSize: '14px', fontFamily: F }}>{v}</span>
              </div>
            ))}
          </Card>

          <Card>
            <ST color="#22C55E">Estado</ST>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
              {[['scheduled', '📅 Agendado'], ['dispatched', '🚚 Despachado'], ['delivered', '✓ Entregado']].map(([st, label]) => (
                <Btn key={st} onClick={() => upd(ship.id, { status: st })} variant={ship.status === st ? 'success' : 'secondary'} size="sm">{label}</Btn>
              ))}
            </div>
            <Field label="N° tracking" value={ship.trackingNumber || ''} onChange={v => upd(ship.id, { trackingNumber: v })} placeholder="Código de seguimiento" />
            <div style={{ marginTop: '14px' }}>
              <Textarea label="Notas" value={ship.notes || ''} onChange={v => upd(ship.id, { notes: v })} rows={3} />
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h2 style={{ color: '#FFF', fontFamily: F, margin: '0 0 24px', fontSize: '26px', fontWeight: 800 }}>Envíos</h2>

      {!data.shipments.length ? (
        <Card style={{ textAlign: 'center', padding: '70px' }}>
          <div style={{ fontSize: '54px', marginBottom: '16px' }}>📦</div>
          <p style={{ color: '#444', fontFamily: F, margin: 0, fontSize: '16px' }}>Aparecen al confirmar una cotización</p>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {data.shipments.map(ship => (
            <Card key={ship.id}
              onMouseEnter={() => setHoveredId(ship.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{ display: 'flex', alignItems: 'center', gap: '14px', background: hoveredId === ship.id ? '#111' : '#0D0D0D', border: `1px solid ${hoveredId === ship.id ? '#2a2a2a' : '#1A1A1A'}`, transition: 'all .15s', cursor: 'default' }}>
              <div style={{ background: '#22C55E12', border: '1px solid #22C55E30', borderRadius: '10px', padding: '8px 12px', minWidth: '70px', textAlign: 'center', cursor: 'pointer' }} onClick={() => setSel(ship)}>
                <div style={{ color: '#22C55E', fontFamily: F, fontSize: '12px', fontWeight: 800 }}>{ship.id}</div>
              </div>
              <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setSel(ship)}>
                <div style={{ color: '#FFF', fontWeight: 600, fontFamily: F, fontSize: '15px' }}>{ship.client}</div>
                <div style={{ color: '#444', fontSize: '12px', fontFamily: F, marginTop: '2px' }}>{ship.address} · {fD(ship.scheduledDate)}</div>
              </div>
              <div style={{ color: '#666', fontSize: '13px', fontFamily: F }}>{ship.carrier || 'Sin transportista'}</div>
              {ship.trackingNumber && <div style={{ color: '#60A5FA', fontFamily: F, fontSize: '12px' }}>{ship.trackingNumber}</div>}
              <Badge status={ship.status} />
              <Btn onClick={e => { e.stopPropagation(); setConfirmDel(ship.id) }} variant="danger" size="sm">×</Btn>
            </Card>
          ))}
        </div>
      )}

      {confirmDel && (
        <Modal title="Eliminar envío" onClose={() => setConfirmDel(null)} width={400}>
          <p style={{ color: '#888', fontFamily: F, fontSize: '14px', marginBottom: '20px' }}>
            ¿Eliminar envío de <b style={{ color: '#FFF' }}>{data.shipments.find(s => s.id === confirmDel)?.client}</b>? Esta acción no se puede deshacer.
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <Btn onClick={() => setConfirmDel(null)} variant="secondary">Cancelar</Btn>
            <Btn onClick={() => del(confirmDel)} variant="danger">Eliminar</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
