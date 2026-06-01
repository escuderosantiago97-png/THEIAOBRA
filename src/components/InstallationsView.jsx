import { useState, useRef } from 'react'
import { sb } from '../supabase'
import { F, SL } from '../constants'
import { fD, pdfName } from '../utils'
import { dI } from '../mappers'
import { savePDF, buildCPDF, buildRMIntPDF, buildGarantiaPDF } from '../pdf'
import { Card, Badge, Btn, Field, Textarea, ST, Modal } from './ui'
import OrdenesModal from './OrdenesModal'
import { usePDFPreview } from '../usePDFPreview.jsx'

export default function InstallationsView({ data, setData, userId, toast }) {
  const [sel, setSel]             = useState(null)
  const [hoveredId, setHoveredId] = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [ordenesInst, setOrdenesInst] = useState(null)
  const { previewEl, openPreview } = usePDFPreview()

  const del = async (id) => {
    try {
      const { error } = await sb.from('installations').delete().eq('id', id)
      if (error) throw new Error(error.message)
      setData({ ...data, installations: data.installations.filter(i => i.id !== id) })
      setConfirmDel(null)
      toast('Instalación eliminada', 'error')
    } catch (e) { toast('Error: ' + e.message, 'error') }
  }
  const photoRef              = useRef(null)
  const confRef               = useRef(null)
  const [newCompra, setNewCompra] = useState({ name: '', qty: '1', unit: 'un', notes: '' })

  const upd = async (id, changes) => {
    const installations = data.installations.map(i => i.id === id ? { ...i, ...changes } : i)
    const inst = installations.find(i => i.id === id)
    await sb.from('installations').update(dI(inst, userId)).eq('id', id)
    setData({ ...data, installations })
    if (sel?.id === id) setSel(p => ({ ...p, ...changes }))
    if (changes.status) toast(`Estado → ${SL[changes.status]}`)
    if (changes.compras && !changes.status) toast('Lista actualizada')
  }

  if (sel) {
    const inst = data.installations.find(i => i.id === sel.id) || sel
    const sale = data.sales.find(s => s.id === inst.saleId)
    const done = inst.stages.filter(s => s.done).length
    const pct  = Math.round((done / inst.stages.length) * 100)
    const compras = inst.compras || []

    const addCompra = async () => {
      if (!newCompra.name) return
      const item = { id: `c-${Date.now()}`, name: newCompra.name, qty: +newCompra.qty || 1, unit: newCompra.unit || 'un', notes: newCompra.notes, purchased: false }
      const installations = data.installations.map(i => i.id === inst.id ? { ...i, compras: [...compras, item] } : i)
      const instUpd = installations.find(i => i.id === inst.id)
      await sb.from('installations').update(dI(instUpd, userId)).eq('id', inst.id)
      setData({ ...data, installations })
      setSel(p => ({ ...p, compras: [...compras, item] }))
      setNewCompra({ name: '', qty: '1', unit: 'un', notes: '' })
      toast('Material agregado')
    }
    const toggleCompra = async (idx) => upd(inst.id, { compras: compras.map((c, i) => i === idx ? { ...c, purchased: !c.purchased } : c) })
    const removeCompra = async (idx) => upd(inst.id, { compras: compras.filter((_, i) => i !== idx) })

    return (
      <div>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px', flexWrap: 'wrap' }}>
          <Btn onClick={() => setSel(null)} variant="ghost" size="sm">← Volver</Btn>
          <div style={{ background: '#60A5FA12', border: '1px solid #60A5FA30', borderRadius: '10px', padding: '6px 12px' }}>
            <span style={{ color: '#60A5FA', fontFamily: F, fontSize: '13px', fontWeight: 800 }}>{inst.id}</span>
          </div>
          <h2 style={{ margin: 0, color: '#FFF', fontFamily: F, fontSize: '22px', fontWeight: 800 }}>{inst.client}</h2>
          <Badge status={inst.status} />
          {inst.conformidadUploaded && <span style={{ color: '#22C55E', fontSize: '13px', fontFamily: F, fontWeight: 600 }}>✓ Conformidad</span>}
          <div style={{ marginLeft: 'auto' }}>
            <Btn onClick={() => setOrdenesInst(inst)} variant="secondary" size="sm">📋 Órdenes</Btn>
          </div>
        </div>

        {/* Info + stages */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <Card>
            <ST color="#60A5FA">Información</ST>
            {[['CTF', inst.ctfOrderId || '-'], ['Técnico', inst.technicianName], ['Fecha', fD(inst.scheduledDate)], ['Hora', inst.scheduledTime || '-'], ['Dirección', inst.address]].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', gap: '12px', marginBottom: '10px' }}>
                <span style={{ color: '#444', fontSize: '10px', fontFamily: F, fontWeight: 700, minWidth: '72px', textTransform: 'uppercase' }}>{k}</span>
                <span style={{ color: '#FFF', fontSize: '14px', fontFamily: F }}>{v}</span>
              </div>
            ))}
            <div style={{ marginTop: '16px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {['scheduled', 'in_progress', 'completed'].map(st => (
                <Btn key={st} onClick={() => upd(inst.id, { status: st })} variant={inst.status === st ? 'primary' : 'secondary'} size="sm">{SL[st]}</Btn>
              ))}
            </div>
          </Card>

          <Card>
            <ST color="#60A5FA">Etapas — {pct}%</ST>
            <div style={{ background: '#1A1A1A', borderRadius: '6px', height: '4px', marginBottom: '18px' }}>
              <div style={{ background: '#60A5FA', height: '100%', width: `${pct}%`, borderRadius: '6px', transition: 'width .4s' }} />
            </div>
            {inst.stages.map((stage, idx) => (
              <div key={stage.name} onClick={() => {
                const stages = inst.stages.map((s, i) => i === idx ? { ...s, done: !s.done } : s)
                upd(inst.id, { stages })
              }}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', borderRadius: '10px', cursor: 'pointer', marginBottom: '4px',
                  background: stage.done ? '#22C55E10' : 'transparent', border: `1px solid ${stage.done ? '#22C55E30' : 'transparent'}`, transition: 'all .15s' }}>
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: `2px solid ${stage.done ? '#22C55E' : '#333'}`, background: stage.done ? '#22C55E' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {stage.done && <span style={{ color: '#000', fontSize: '11px', fontWeight: 800 }}>✓</span>}
                </div>
                <span style={{ color: stage.done ? '#22C55E' : '#666', fontSize: '13px', fontFamily: F }}>{stage.name}</span>
              </div>
            ))}
          </Card>
        </div>

        {/* Notes + materials */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <Card>
            <ST color="#60A5FA">Notas de obra</ST>
            <textarea value={inst.notes || ''} onChange={e => upd(inst.id, { notes: e.target.value })} rows={5} placeholder="Observaciones..."
              style={{ background: '#0A0A0A', border: '1px solid #1E1E1E', borderRadius: '10px', padding: '10px 14px', color: '#FFF', fontSize: '14px', fontFamily: F, outline: 'none', width: '100%', boxSizing: 'border-box', resize: 'vertical' }} />
          </Card>
          <Card>
            <ST color="#60A5FA">Materiales de cotización</ST>
            {inst.materials?.length > 0
              ? inst.materials.map((m, i) => <div key={i} style={{ padding: '8px 12px', background: '#111', borderRadius: '8px', marginBottom: '6px', color: '#FFF', fontSize: '13px', fontFamily: F }}>· {m}</div>)
              : <p style={{ color: '#444', fontSize: '14px', fontFamily: F, margin: 0 }}>Sin materiales</p>
            }
          </Card>
        </div>

        {/* Compras */}
        <Card style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <ST color="#F5A623">📋 Lista de materiales a comprar</ST>
            <Btn onClick={() => savePDF(() => buildRMIntPDF(inst, compras), pdfName('RemitoInterno', inst.id, inst.client))} size="sm" variant="secondary">📄 PDF Remito interno</Btn>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 1fr auto', gap: '8px', alignItems: 'flex-end', marginBottom: '14px', paddingBottom: '14px', borderBottom: '1px solid #1A1A1A' }}>
            <Field label="Material *" value={newCompra.name} onChange={v => setNewCompra(p => ({ ...p, name: v }))} placeholder="Ej: Cable 2.5mm" />
            <Field label="Cant." value={newCompra.qty} onChange={v => setNewCompra(p => ({ ...p, qty: v }))} type="number" />
            <Field label="Unidad" value={newCompra.unit} onChange={v => setNewCompra(p => ({ ...p, unit: v }))} placeholder="un" />
            <Field label="Notas" value={newCompra.notes} onChange={v => setNewCompra(p => ({ ...p, notes: v }))} placeholder="Opcional" />
            <Btn onClick={addCompra} disabled={!newCompra.name} size="sm">+ Agregar</Btn>
          </div>
          {compras.length === 0 && <p style={{ color: '#444', fontSize: '14px', fontFamily: F, margin: 0 }}>Sin materiales cargados todavía.</p>}
          {compras.map((item, idx) => (
            <div key={item.id || idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: '10px', marginBottom: '4px', background: item.purchased ? '#22C55E08' : '#111', border: `1px solid ${item.purchased ? '#22C55E30' : '#1A1A1A'}`, transition: 'all .15s' }}>
              <button onClick={() => toggleCompra(idx)} style={{ width: '20px', height: '20px', borderRadius: '5px', border: `2px solid ${item.purchased ? '#22C55E' : '#444'}`, background: item.purchased ? '#22C55E' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'all .15s' }}>
                {item.purchased && <span style={{ color: '#000', fontSize: '11px', fontWeight: 800 }}>✓</span>}
              </button>
              <span style={{ color: item.purchased ? '#22C55E' : '#FFF', fontSize: '13px', fontFamily: F, flex: 2, textDecoration: item.purchased ? 'line-through' : 'none' }}>{item.name}</span>
              <span style={{ color: '#555', fontSize: '12px', fontFamily: F, minWidth: '60px' }}>{item.qty} {item.unit}</span>
              {item.notes && <span style={{ color: '#444', fontSize: '12px', fontFamily: F, flex: 1 }}>{item.notes}</span>}
              <button onClick={() => removeCompra(idx)} style={{ background: 'none', border: 'none', color: '#F87171', cursor: 'pointer', fontSize: '18px', padding: '2px', lineHeight: 1 }}>×</button>
            </div>
          ))}
        </Card>

        {/* Photos + Conformidad */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <ST color="#60A5FA">Fotos ({inst.photos?.length || 0})</ST>
              <Btn onClick={() => photoRef.current?.click()} size="sm" variant="secondary">📷 Subir</Btn>
            </div>
            <input ref={photoRef} type="file" accept="image/*" onChange={e => {
              const f = e.target.files[0]; if (!f) return
              const r = new FileReader(); r.onload = ev => upd(inst.id, { photos: [...(inst.photos || []), ev.target.result] }); r.readAsDataURL(f)
            }} style={{ display: 'none' }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
              {inst.photos?.map((p, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  <img src={p} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: '10px' }} />
                  <button onClick={() => upd(inst.id, { photos: inst.photos.filter((_, pi) => pi !== i) })} style={{ position: 'absolute', top: '4px', right: '4px', background: '#F8717188', border: 'none', color: '#fff', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', fontSize: '13px', lineHeight: 1 }}>×</button>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <ST color="#60A5FA">Conformidad de obra</ST>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Btn onClick={() => savePDF(() => buildCPDF(inst, sale), pdfName('Conformidad', inst.id, inst.client))} variant="secondary">📄 Generar conformidad PDF</Btn>
              <Btn onClick={() => confRef.current?.click()} variant="secondary">📎 Subir conformidad firmada</Btn>
              <input ref={confRef} type="file" accept="image/*,application/pdf" onChange={e => {
                const f = e.target.files[0]; if (!f) return
                const r = new FileReader(); r.onload = ev => upd(inst.id, { conformidadUploaded: true, conformidadPhoto: ev.target.result }); r.readAsDataURL(f)
              }} style={{ display: 'none' }} />
              {inst.conformidadUploaded && (
                <div style={{ background: '#22C55E10', border: '1px solid #22C55E30', borderRadius: '10px', padding: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: '#22C55E', fontSize: '18px' }}>✓</span>
                  <span style={{ color: '#22C55E', fontSize: '13px', fontFamily: F, fontWeight: 600 }}>Conformidad subida</span>
                </div>
              )}
              <Btn onClick={() => openPreview(() => buildGarantiaPDF(inst, data.sales.find(s => s.id === inst.saleId)), `Garantia_${inst.id}_${inst.client}.pdf`)} variant="purple">
                🛡️ Garantía 10 años
              </Btn>
              {inst.conformidadPhoto?.startsWith('data:image') && <img src={inst.conformidadPhoto} alt="" style={{ width: '100%', borderRadius: '10px', border: '1px solid #1A1A1A' }} />}
            </div>
          </Card>
        </div>

        {ordenesInst && (
          <OrdenesModal
            inst={ordenesInst}
            sale={data.sales.find(s => s.id === ordenesInst.saleId)}
            onClose={() => setOrdenesInst(null)}
          />
        )}
        {previewEl}
      </div>
    )
  }

  // LIST VIEW
  return (
    <div>
      <h2 style={{ color: '#FFF', fontFamily: F, margin: '0 0 24px', fontSize: '26px', fontWeight: 800 }}>Instalaciones</h2>
      {!data.installations.length ? (
        <Card style={{ textAlign: 'center', padding: '70px' }}>
          <div style={{ fontSize: '54px', marginBottom: '16px' }}>🔧</div>
          <p style={{ color: '#444', fontFamily: F, margin: 0, fontSize: '16px' }}>Aparecen al confirmar una cotización</p>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {data.installations.map(inst => (
            <Card key={inst.id}
              onMouseEnter={() => setHoveredId(inst.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{ display: 'flex', alignItems: 'center', gap: '14px', background: hoveredId === inst.id ? '#111' : '#0D0D0D', border: `1px solid ${hoveredId === inst.id ? '#2a2a2a' : '#1A1A1A'}`, transition: 'all .15s', cursor: 'default' }}>
              <div style={{ background: '#60A5FA12', border: '1px solid #60A5FA30', borderRadius: '10px', padding: '8px 12px', minWidth: '70px', textAlign: 'center', cursor: 'pointer' }} onClick={() => setSel(inst)}>
                <div style={{ color: '#60A5FA', fontFamily: F, fontSize: '12px', fontWeight: 800 }}>{inst.id}</div>
              </div>
              <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setSel(inst)}>
                <div style={{ color: '#FFF', fontWeight: 600, fontFamily: F, fontSize: '15px' }}>{inst.client}</div>
                <div style={{ color: '#444', fontSize: '12px', fontFamily: F, marginTop: '2px' }}>{inst.address} · {fD(inst.scheduledDate)}</div>
              </div>
              <div style={{ color: '#666', fontSize: '13px', fontFamily: F }}>{inst.technicianName}</div>
              {(inst.compras || []).length > 0 && (
                <div style={{ color: '#F5A623', fontSize: '11px', fontFamily: F, fontWeight: 600, background: '#F5A62310', padding: '3px 8px', borderRadius: '6px' }}>
                  {(inst.compras || []).filter(c => c.purchased).length}/{(inst.compras || []).length} compras
                </div>
              )}
              <div style={{ color: '#60A5FA', fontFamily: F, fontSize: '12px', fontWeight: 600 }}>
                {inst.stages.filter(s => s.done).length}/{inst.stages.length} etapas
              </div>
              <Badge status={inst.status} />
              {inst.conformidadUploaded && <span style={{ color: '#22C55E', fontSize: '16px' }}>✓</span>}
              <Btn onClick={e => { e.stopPropagation(); setConfirmDel(inst.id) }} variant="danger" size="sm">×</Btn>
            </Card>
          ))}
        </div>
      )}

      {confirmDel && (
        <Modal title="Eliminar instalación" onClose={() => setConfirmDel(null)} width={400}>
          <p style={{ color: '#888', fontFamily: F, fontSize: '14px', marginBottom: '20px' }}>
            ¿Eliminar <b style={{ color: '#FFF' }}>{data.installations.find(i => i.id === confirmDel)?.client}</b>? Esta acción no se puede deshacer.
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
