import { useState } from 'react'
import { sb } from '../supabase'
import { F } from '../constants'
import { $ } from '../utils'
import { dC } from '../mappers'
import { Card, ST, Field, Btn, iS } from './ui'

export default function CatalogView({ data, setData, userId, toast }) {
  const [form, setForm]   = useState({ type: 'labor', name: '', unitPrice: '' })
  const [editId, setEditId] = useState(null)
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const add = async () => {
    if (!form.name || !form.unitPrice) return
    const item = { id: `cat-${Date.now()}`, type: form.type, name: form.name, unitPrice: +form.unitPrice }
    await sb.from('catalog_items').insert(dC(item, userId))
    const catalog = { ...data.catalog, [form.type]: [...(data.catalog[form.type] || []), item] }
    setData({ ...data, catalog })
    setForm(p => ({ ...p, name: '', unitPrice: '' }))
    toast('Ítem agregado')
  }

  const del = async (type, id) => {
    await sb.from('catalog_items').delete().eq('id', id)
    setData({ ...data, catalog: { ...data.catalog, [type]: data.catalog[type].filter(i => i.id !== id) } })
    toast('Ítem eliminado', 'error')
  }

  const upd = async (type, id, field, value) => {
    const catalog = {
      ...data.catalog,
      [type]: data.catalog[type].map(i => i.id === id ? { ...i, [field]: field === 'unitPrice' ? +value : value } : i),
    }
    await sb.from('catalog_items').update(dC(catalog[type].find(i => i.id === id), userId)).eq('id', id)
    setData({ ...data, catalog })
  }

  return (
    <div>
      <h2 style={{ color: '#FFF', fontFamily: F, margin: '0 0 24px', fontSize: '26px', fontWeight: 800 }}>Catálogo</h2>

      {/* Add form */}
      <Card style={{ marginBottom: '20px' }}>
        <ST>Agregar ítem</ST>
        <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr 160px auto', gap: '12px', alignItems: 'flex-end' }}>
          <div>
            <label style={{ fontSize: '10px', fontWeight: 700, color: '#555', letterSpacing: '0.7px', textTransform: 'uppercase', fontFamily: F, display: 'block', marginBottom: '6px' }}>Tipo</label>
            <select value={form.type} onChange={e => set('type', e.target.value)} style={iS}>
              <option value="labor">Mano de obra</option>
              <option value="shipping">Envío</option>
            </select>
          </div>
          <Field label="Nombre" value={form.name} onChange={v => set('name', v)} placeholder="Ej: Instalación eléctrica" />
          <Field label="Precio $" value={form.unitPrice} onChange={v => set('unitPrice', v)} type="number" placeholder="0" />
          <Btn onClick={add} disabled={!form.name || !form.unitPrice}>+ Agregar</Btn>
        </div>
      </Card>

      {/* Lists */}
      {['labor', 'shipping'].map(type => (
        <Card key={type} style={{ marginBottom: '14px' }}>
          <ST color={type === 'labor' ? '#60A5FA' : '#22C55E'}>
            {type === 'labor' ? '🔧 Mano de obra' : '📦 Envíos'}
          </ST>
          {(!data.catalog[type] || !data.catalog[type].length)
            ? <p style={{ color: '#444', fontSize: '14px', fontFamily: F, margin: 0 }}>Sin ítems.</p>
            : data.catalog[type].map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid #1A1A1A' }}>
                {editId === item.id ? (
                  <>
                    <input value={item.name} onChange={e => upd(type, item.id, 'name', e.target.value)} style={{ ...iS, flex: 2 }} />
                    <input type="number" value={item.unitPrice} onChange={e => upd(type, item.id, 'unitPrice', e.target.value)} style={{ ...iS, width: '150px' }} />
                    <Btn onClick={() => setEditId(null)} size="sm" variant="success">✓</Btn>
                  </>
                ) : (
                  <>
                    <span style={{ flex: 2, color: '#FFF', fontSize: '14px', fontFamily: F }}>{item.name}</span>
                    <span style={{ color: '#F5A623', fontFamily: F, fontSize: '15px', fontWeight: 700, minWidth: '130px', textAlign: 'right' }}>{$(item.unitPrice)}</span>
                    <Btn onClick={() => setEditId(item.id)} size="sm" variant="secondary">Editar</Btn>
                    <Btn onClick={() => del(type, item.id)} size="sm" variant="danger">×</Btn>
                  </>
                )}
              </div>
            ))
          }
        </Card>
      ))}
    </div>
  )
}
