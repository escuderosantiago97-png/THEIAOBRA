import { useState } from 'react'
import { sb } from '../supabase'
import { F, STAGES } from '../constants'
import { nextNum, tod, calc, $, fD, pdfName } from '../utils'
import { dQ, dS, dI, dSh } from '../mappers'
import { savePDF, buildQPDF, buildRCPDF } from '../pdf'
import { loadAll } from '../dataLayer'
import { Card, Badge, Btn, Field, Textarea, Modal, ST, iS } from './ui'
import SchedulingModal from './SchedulingModal'

const STATUS_NEXT = { draft: 'sent', sent: 'confirmed' }
const STATUS_LABEL = { draft: 'Marcar enviado', sent: 'Confirmar' }

function PDFButtons({ q, saleId, sale }) {
  const T = calc(q.items, q.discount || 0, q.includeIVA)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ color: '#555', fontSize: '10px', fontFamily: F, fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>Documentos</div>
      <Btn onClick={() => savePDF(() => buildQPDF(q), pdfName('Cotizacion', q.id, q.client))} variant="secondary">📄 Cotización PDF</Btn>
      <Btn onClick={() => savePDF(() => buildRCPDF(q, saleId, sale?.total || T.total, sale?.adelanto || 0, sale?.saldo || 0), pdfName('Recibo', saleId || q.id, q.client))} variant="secondary">🧾 Recibo PDF</Btn>
    </div>
  )
}

export default function QuotesView({ data, setData, userId, toast }) {
  const [view, setView]           = useState('list')
  const [editing, setEditing]     = useState(null)
  const [scheduling, setScheduling] = useState(null)
  const [docModal, setDocModal]   = useState(null)
  const [saving, setSaving]       = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [hoveredId, setHoveredId] = useState(null)

  const nI = () => ({ id: `i-${Date.now()}`, name: '', type: 'product', qty: 1, unitPrice: 0, subtotal: 0 })

  const handleNew = () => {
    setEditing({
      id: nextNum(data.quotes, 'MO-N°'), date: tod(), client: '', clientAddress: '', clientPhone: '',
      items: [nI()], discount: 0, includeIVA: true,
      observations: data.settings.defaultObservations, specifications: data.settings.defaultSpecifications,
      status: 'draft', ctfOrderId: '',
    })
    setView('form')
  }

  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    try {
      const ex = data.quotes.find(q => q.id === editing.id)
      let current = { ...editing }

      if (ex) {
        // Actualizar cotización existente
        const { error } = await sb.from('quotes').update(dQ(current, userId)).eq('id', current.id)
        if (error) throw new Error(error.message)
      } else {
        // Insertar nueva — si hay conflicto de clave, incrementa el número hasta encontrar uno libre
        const isDup = e => e?.code === '23505' || e?.message?.includes('duplicate key')
        let attempt = 0
        while (true) {
          const { error } = await sb.from('quotes').insert(dQ(current, userId))
          if (!error) break
          if (!isDup(error) || attempt > 50) throw new Error(error.message)
          attempt++
          const m = current.id.match(/(\d+)$/)
          const n = m ? parseInt(m[1]) + attempt : attempt + 1
          current = { ...current, id: `MO-N°${n}` }
        }
      }

      const quotes = ex
        ? data.quotes.map(q => q.id === editing.id ? current : q)
        : [current, ...data.quotes]
      setData({ ...data, quotes })
      setView('list')
      toast(ex ? 'Cotización actualizada' : 'Cotización creada')
    } catch (e) {
      console.error('handleSave error:', e)
      toast('Error al guardar: ' + e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      const { error } = await sb.from('quotes').delete().eq('id', id)
      if (error) throw new Error(error.message)
      setData({ ...data, quotes: data.quotes.filter(q => q.id !== id) })
      setConfirmDelete(null)
      toast('Cotización eliminada', 'error')
    } catch (e) {
      toast('Error al eliminar: ' + e.message, 'error')
    }
  }

  const handleStatusAdvance = async (q) => {
    const next = STATUS_NEXT[q.status]
    if (!next) return
    const updated = { ...q, status: next }
    await sb.from('quotes').update(dQ(updated, userId)).eq('id', q.id)
    setData({ ...data, quotes: data.quotes.map(x => x.id === q.id ? updated : x) })
    toast(`Estado → ${next === 'sent' ? 'Enviado' : 'Confirmado'}`)
  }

  const handleConfirm = async (sd) => {
    const q = scheduling
    try {
      // Evitar duplicados: si ya existe una venta para esta cotización, no crear otra
      if (data.sales.find(s => s.quoteId === q.id)) {
        toast('Esta cotización ya tiene una venta asociada', 'error')
        setScheduling(null)
        return
      }

      const T = calc(q.items, q.discount || 0, q.includeIVA)
      const uQ = { ...q, status: 'confirmed', ctfOrderId: sd.ctfOrderId }

      const insertWithRetry = async (table, mapper, baseObj, prefix) => {
        const isDup = e => e?.code === '23505' || e?.message?.includes('duplicate key')
        let obj = { ...baseObj }
        for (let attempt = 0; attempt < 50; attempt++) {
          const { error } = await sb.from(table).insert(mapper(obj, userId))
          if (!error) return obj
          if (!isDup(error)) throw new Error(`[${table}] ${error.message}`)
          const m = obj.id.match(/(\d+)$/)
          const n = m ? parseInt(m[1]) + attempt + 1 : attempt + 2
          obj = { ...obj, id: `${prefix}${n}` }
        }
        throw new Error(`No se pudo generar ID único para ${table}`)
      }

      const sId  = nextNum(data.sales, 'VN°')
      const iId  = nextNum(data.installations, 'IN°')
      const shId = nextNum(data.shipments, 'EN°')

      const nSaleBase = { id: sId,  quoteId: q.id, ctfOrderId: sd.ctfOrderId, client: q.client, date: tod(), installationId: iId, shipmentId: shId, total: T.total, adelanto: +sd.adelanto || 0, saldo: Math.max(T.total - (+sd.adelanto || 0), 0), status: 'active', quoteRef: q }
      const nInstBase = { id: iId,  saleId: sId, ctfOrderId: sd.ctfOrderId, client: q.client, address: sd.installAddress, technicianName: sd.technicianName, scheduledDate: sd.installDate, scheduledTime: sd.installTime, status: 'scheduled', stages: STAGES.map(n => ({ name: n, done: false })), materials: q.items.filter(i => i.type === 'product').map(i => i.name), compras: [], notes: sd.notes, photos: [], conformidadUploaded: false, conformidadPhoto: null }
      const nShipBase = { id: shId, saleId: sId, ctfOrderId: sd.ctfOrderId, client: q.client, address: sd.installAddress, scheduledDate: sd.shipDate, carrier: sd.carrier, trackingNumber: '', status: 'scheduled', notes: sd.notes }

      const { error: qErr } = await sb.from('quotes').update(dQ(uQ, userId)).eq('id', q.id)
      if (qErr) throw new Error(qErr.message)

      const [sale] = await Promise.all([
        insertWithRetry('sales', dS, nSaleBase, 'VN°'),
        insertWithRetry('installations', dI, nInstBase, 'IN°'),
        insertWithRetry('shipments', dSh, nShipBase, 'EN°'),
      ])

      const fresh = await loadAll(userId)
      setData(fresh)
      setScheduling(null)
      toast(`✓ Venta ${sale.id} creada`)
    } catch (e) {
      console.error('handleConfirm error:', e)
      toast('Error al confirmar: ' + e.message, 'error')
    }
  }

  const updItem = (idx, k, v) => {
    const items = [...editing.items]
    items[idx] = { ...items[idx], [k]: (k === 'qty' || k === 'unitPrice') ? +v : v }
    if (k === 'qty' || k === 'unitPrice') items[idx].subtotal = +(items[idx].qty * items[idx].unitPrice).toFixed(2)
    setEditing({ ...editing, items })
  }

  const pickCat = (idx, ci) => {
    const items = [...editing.items]
    items[idx] = { ...items[idx], name: ci.name, unitPrice: ci.unitPrice, subtotal: +(items[idx].qty * ci.unitPrice).toFixed(2) }
    setEditing({ ...editing, items })
  }

  // ── FORM VIEW ──
  if (view === 'form' && editing) {
    const T = calc(editing.items, editing.discount || 0, editing.includeIVA)
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px' }}>
          <Btn onClick={() => setView('list')} variant="ghost" size="sm">← Volver</Btn>
          <div>
            <div style={{ color: '#555', fontSize: '11px', fontFamily: F, fontWeight: 700, textTransform: 'uppercase' }}>Cotización {editing.id}</div>
            <h2 style={{ margin: 0, color: '#FFF', fontFamily: F, fontSize: '22px', fontWeight: 800 }}>{editing.client || 'Nuevo cliente'}</h2>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <Card>
            <ST>Cliente</ST>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Field label="Nombre *" value={editing.client} onChange={v => setEditing({ ...editing, client: v })} />
              <Field label="Dirección" value={editing.clientAddress} onChange={v => setEditing({ ...editing, clientAddress: v })} />
              <Field label="Teléfono" value={editing.clientPhone} onChange={v => setEditing({ ...editing, clientPhone: v })} />
            </div>
          </Card>
          <Card>
            <ST>Configuración</ST>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Field label="Fecha" value={editing.date} onChange={v => setEditing({ ...editing, date: v })} type="date" />
              <Field label="Descuento %" value={editing.discount} onChange={v => setEditing({ ...editing, discount: +v })} type="number" />
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginTop: '4px' }}>
                <input type="checkbox" checked={editing.includeIVA} onChange={e => setEditing({ ...editing, includeIVA: e.target.checked })} style={{ accentColor: '#F5A623', width: '17px', height: '17px' }} />
                <span style={{ color: '#FFF', fontSize: '14px', fontFamily: F }}>Incluir IVA 21%</span>
              </label>
            </div>
          </Card>
        </div>

        {/* Items */}
        <Card style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <ST>Ítems</ST>
            <Btn onClick={() => setEditing({ ...editing, items: [...editing.items, nI()] })} size="sm">+ Agregar</Btn>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '100px 2fr 1.4fr 70px 140px 140px 30px', gap: '8px', marginBottom: '8px' }}>
            {['Tipo', 'Descripción', 'Del catálogo', 'Cant.', 'Precio unit.', 'Subtotal', ''].map(h => (
              <div key={h} style={{ fontSize: '9px', color: '#444', textTransform: 'uppercase', fontFamily: F, fontWeight: 700 }}>{h}</div>
            ))}
          </div>
          {editing.items.map((item, idx) => {
            const catItems = (item.type === 'labor' || item.type === 'shipping') ? (data.catalog[item.type] || []) : []
            return (
              <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '100px 2fr 1.4fr 70px 140px 140px 30px', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                <select value={item.type} onChange={e => updItem(idx, 'type', e.target.value)} style={iS}>
                  <option value="product">Producto</option>
                  <option value="labor">M. obra</option>
                  <option value="shipping">Envío</option>
                </select>
                <input value={item.name} onChange={e => updItem(idx, 'name', e.target.value)} placeholder="Descripción..." style={iS} />
                {catItems.length > 0
                  ? <select onChange={e => { const ci = catItems.find(c => c.id === e.target.value); if (ci) pickCat(idx, ci) }} style={{ ...iS, color: '#888' }} value=""><option value="">Seleccionar...</option>{catItems.map(ci => <option key={ci.id} value={ci.id}>{ci.name}</option>)}</select>
                  : <div style={{ color: '#333', fontSize: '11px', fontFamily: F, padding: '0 4px' }}>{item.type === 'product' ? '—' : 'Sin ítems'}</div>
                }
                <input type="number" value={item.qty} onChange={e => updItem(idx, 'qty', e.target.value)} min={1} style={iS} />
                <input type="number" value={item.unitPrice} onChange={e => updItem(idx, 'unitPrice', e.target.value)} placeholder="0" style={iS} />
                <div style={{ color: '#F5A623', fontFamily: F, fontSize: '14px', fontWeight: 700, textAlign: 'right', padding: '10px 0' }}>{$(item.subtotal)}</div>
                <button onClick={() => setEditing({ ...editing, items: editing.items.filter((_, i) => i !== idx) })} style={{ background: 'none', border: 'none', color: '#F87171', cursor: 'pointer', fontSize: '22px', padding: '2px', lineHeight: 1 }}>×</button>
              </div>
            )
          })}
          {/* Totals */}
          <div style={{ borderTop: '1px solid #1A1A1A', marginTop: '14px', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { l: 'Subtotal', v: T.sub, c: '#FFF' },
                ...(editing.discount > 0 ? [{ l: `Descuento (${editing.discount}%)`, v: -T.da, c: '#F87171' }] : []),
                ...(editing.includeIVA ? [{ l: 'IVA 21%', v: T.ia, c: '#666' }] : []),
              ].map(r => (
                <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#555', fontFamily: F, fontSize: '13px' }}>{r.l}</span>
                  <span style={{ color: r.c, fontFamily: F, fontSize: '14px', fontWeight: 600 }}>{$(r.v)}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #F5A623', paddingTop: '10px', marginTop: '4px' }}>
                <span style={{ color: '#F5A623', fontWeight: 700, fontSize: '17px', fontFamily: F }}>TOTAL</span>
                <span style={{ color: '#F5A623', fontWeight: 800, fontSize: '20px', fontFamily: F }}>{$(T.total)}</span>
              </div>
            </div>
          </div>
        </Card>

        <Card style={{ marginBottom: '16px' }}>
          <ST>Observaciones y especificaciones</ST>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <Textarea label="Observaciones" value={editing.observations} onChange={v => setEditing({ ...editing, observations: v })} rows={6} />
            <Textarea label="Especificaciones" value={editing.specifications} onChange={v => setEditing({ ...editing, specifications: v })} rows={6} />
          </div>
        </Card>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <Btn onClick={() => setView('list')} variant="secondary">Cancelar</Btn>
          <Btn onClick={() => savePDF(() => buildQPDF(editing), pdfName('Cotizacion', editing.id, editing.client))} variant="secondary">📄 PDF</Btn>
          <Btn onClick={handleSave} disabled={!editing.client || saving}>{saving ? 'Guardando...' : 'Guardar'}</Btn>
        </div>
      </div>
    )
  }

  // ── LIST VIEW ──
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: 0, color: '#FFF', fontFamily: F, fontSize: '26px', fontWeight: 800 }}>Cotizaciones</h2>
        <Btn onClick={handleNew}>+ Nueva cotización</Btn>
      </div>

      {!data.quotes.length ? (
        <Card style={{ textAlign: 'center', padding: '70px' }}>
          <div style={{ fontSize: '54px', marginBottom: '16px' }}>📋</div>
          <p style={{ color: '#444', fontFamily: F, margin: 0, fontSize: '16px' }}>No hay cotizaciones. ¡Creá la primera!</p>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {data.quotes.map(q => {
            const T = calc(q.items, q.discount || 0, q.includeIVA)
            const ls = data.sales.find(s => s.quoteId === q.id)
            const hov = hoveredId === q.id
            return (
              <div key={q.id}
                onMouseEnter={() => setHoveredId(q.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{ background: hov ? '#0F0F0F' : '#0D0D0D', border: `1px solid ${hov ? '#2a2a2a' : '#1A1A1A'}`, borderRadius: '14px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '14px', transition: 'all .15s' }}>

                {/* ID badge */}
                <div style={{ background: '#F5A62312', border: '1px solid #F5A62330', borderRadius: '10px', padding: '8px 12px', minWidth: '80px', textAlign: 'center', flexShrink: 0 }}>
                  <div style={{ color: '#F5A623', fontFamily: F, fontSize: '13px', fontWeight: 800 }}>{q.id}</div>
                </div>

                {/* Client + date */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#FFF', fontWeight: 600, fontFamily: F, fontSize: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.client || 'Sin cliente'}</div>
                  <div style={{ color: '#444', fontSize: '12px', fontFamily: F, marginTop: '2px' }}>{fD(q.date)} · {q.items.length} ítem{q.items.length !== 1 ? 's' : ''}{q.clientAddress ? ` · ${q.clientAddress}` : ''}</div>
                </div>

                {/* Total */}
                <div style={{ color: '#F5A623', fontFamily: F, fontSize: '16px', fontWeight: 700, flexShrink: 0 }}>{$(T.total)}</div>

                {/* Status badge */}
                <Badge status={q.status} />

                {/* Actions — always visible on hover, fade otherwise */}
                <div style={{ display: 'flex', gap: '6px', opacity: hov ? 1 : 0.3, transition: 'opacity .15s', flexShrink: 0 }}>
                  <Btn onClick={() => { setEditing({ ...q }); setView('form') }} variant="secondary" size="sm">✎ Editar</Btn>
                  <Btn onClick={() => setDocModal({ q, saleId: ls?.id, sale: ls })} variant="secondary" size="sm">📄 PDF</Btn>
                  {STATUS_NEXT[q.status] && (
                    <Btn onClick={() => handleStatusAdvance(q)} variant={q.status === 'sent' ? 'success' : 'secondary'} size="sm">
                      {STATUS_LABEL[q.status]}
                    </Btn>
                  )}
                  {q.status !== 'confirmed' && (
                    <Btn onClick={() => setScheduling(q)} size="sm">✓ Confirmar venta</Btn>
                  )}
                  <Btn onClick={() => setConfirmDelete(q.id)} variant="danger" size="sm">×</Btn>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <Modal title="Eliminar cotización" onClose={() => setConfirmDelete(null)} width={400}>
          <p style={{ color: '#888', fontFamily: F, fontSize: '14px', marginBottom: '20px' }}>
            ¿Eliminar <b style={{ color: '#FFF' }}>{data.quotes.find(q => q.id === confirmDelete)?.client}</b>? Esta acción no se puede deshacer.
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <Btn onClick={() => setConfirmDelete(null)} variant="secondary">Cancelar</Btn>
            <Btn onClick={() => handleDelete(confirmDelete)} variant="danger">Eliminar</Btn>
          </div>
        </Modal>
      )}

      {scheduling && <SchedulingModal quote={scheduling} onConfirm={handleConfirm} onClose={() => setScheduling(null)} />}
      {docModal && (
        <Modal title={`Documentos — ${docModal.q.client}`} onClose={() => setDocModal(null)} width={360}>
          <PDFButtons q={docModal.q} saleId={docModal.saleId} sale={docModal.sale} />
        </Modal>
      )}
    </div>
  )
}
