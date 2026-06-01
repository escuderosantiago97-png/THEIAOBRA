import { useState, useMemo } from 'react'
import { F } from '../constants'
import { fD, tod, $, pdfName } from '../utils'
import { savePDF, buildOTPDF, buildICPDF, buildCAOPDF } from '../pdf'
import { Modal, Btn } from './ui'

const DEFAULT_CHECKLIST = [
  { label: 'Material en obra', checked: false },
  { label: 'Colocación y terminaciones', checked: false },
  { label: 'Limpieza en obra', checked: false },
  { label: 'Cambios o adicionales', checked: false },
]

const inp = { background: '#0A0A0A', border: '1px solid #222', borderRadius: '8px', padding: '7px 10px', color: '#FFF', fontSize: '12px', fontFamily: F, outline: 'none', width: '100%', boxSizing: 'border-box' }
const lbl = { color: '#555', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', fontFamily: F, marginBottom: '3px', display: 'block' }

function FLD({ label, value, onChange, type = 'text', placeholder = '' }) {
  return (
    <div>
      <label style={lbl}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} style={inp} />
    </div>
  )
}
function TXA({ label, value, onChange, rows = 4, placeholder = '' }) {
  return (
    <div>
      <label style={lbl}>{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows}
        placeholder={placeholder} style={{ ...inp, resize: 'vertical' }} />
    </div>
  )
}

export default function OrdenesModal({ inst, sale, onClose }) {
  const [tab, setTab] = useState('ot')

  // ── OT state ──────────────────────────────────────────────────────────────────
  const [ot, setOT] = useState({
    cotizNum: inst.saleId || inst.ctfOrderId || '',
    fecha: tod(),
    fechaInicio: inst.scheduledDate || tod(),
    instalador: inst.technicianName || '',
    ubicacion: inst.address || '',
    barrio: '',
    lote: '',
    altura: '',
    interior: false,
    exterior: true,
    respObra: '',
    telefono: '',
    firmaEmpresa: '',
    materiales: inst.materials?.length
      ? inst.materials.map((m, i) => ({ id: String(i + 1), detalle: m, color: '', uni: 'uni', cant: '', material: '', uni2: '', cant2: '', importe: '' }))
      : [{ id: '1', detalle: '', color: '', uni: 'uni', cant: '', material: '', uni2: '', cant2: '', importe: '' }],
    condComerciales: sale?.saldo > 0 ? `Saldo pendiente de pago: ${$(sale.saldo)}` : '',
    tareas: inst.notes || '',
  })
  const setF = (k, v) => setOT(p => ({ ...p, [k]: v }))

  const total = useMemo(() => ot.materiales.reduce((s, m) => {
    const v = parseFloat((m.importe || '0').replace(/[\$\.]/g, '').replace(',', '.'))
    return s + (isNaN(v) ? 0 : v)
  }, 0), [ot.materiales])

  const addMat = () => setOT(p => ({ ...p, materiales: [...p.materiales, { id: String(Date.now()), detalle: '', color: '', uni: 'uni', cant: '', material: '', uni2: '', cant2: '', importe: '' }] }))
  const removeMat = id => setOT(p => ({ ...p, materiales: p.materiales.filter(m => m.id !== id) }))
  const updMat = (id, k, v) => setOT(p => ({ ...p, materiales: p.materiales.map(m => m.id === id ? { ...m, [k]: v } : m) }))

  // ── IC state ──────────────────────────────────────────────────────────────────
  const [ic, setIC] = useState({ fecha: tod(), descripcion: '', motivo: '', solicitadoPor: inst.client || '' })
  const setIF = (k, v) => setIC(p => ({ ...p, [k]: v }))

  // ── CAO state ─────────────────────────────────────────────────────────────────
  const [cao, setCAO] = useState({
    fechaFin: tod(),
    clienteNombre: inst.client || '',
    clienteDni: '',
    checklistItems: DEFAULT_CHECKLIST,
    obsFinales: '',
    saldoAbonado: sale ? $(sale.total || 0) : '',
  })
  const setCF = (k, v) => setCAO(p => ({ ...p, [k]: v }))
  const toggleCheck = idx => setCF('checklistItems', cao.checklistItems.map((c, i) => i === idx ? { ...c, checked: !c.checked } : c))

  const TABS = [
    { key: 'ot',  label: '📋 Orden de Trabajo' },
    { key: 'ic',  label: '📝 Informe de Cambios' },
    { key: 'cao', label: '✅ Conforme a Obra' },
  ]

  return (
    <Modal title={`Documentación — ${inst.client}`} onClose={onClose} width={860}>
      {/* TABS */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', borderBottom: '1px solid #1A1A1A', paddingBottom: '16px' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '8px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer',
            fontFamily: F, fontSize: '12px', fontWeight: 600,
            background: tab === t.key ? '#6D28D9' : '#1A1A1A',
            color: tab === t.key ? '#FFF' : '#666', transition: 'all .15s',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── ORDEN DE TRABAJO ────────────────────────────────────────────────────── */}
      {tab === 'ot' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '68vh', overflowY: 'auto', paddingRight: '6px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px' }}>
            <FLD label="Cotización N°" value={ot.cotizNum} onChange={v => setF('cotizNum', v)} placeholder="0003-00003199" />
            <FLD label="Fecha" value={ot.fecha} onChange={v => setF('fecha', v)} type="date" />
            <FLD label="Fecha de Inicio" value={ot.fechaInicio} onChange={v => setF('fechaInicio', v)} type="date" />
            <FLD label="Instalador" value={ot.instalador} onChange={v => setF('instalador', v)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
            <FLD label="Ubicación" value={ot.ubicacion} onChange={v => setF('ubicacion', v)} />
            <FLD label="Barrio / Country" value={ot.barrio} onChange={v => setF('barrio', v)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px' }}>
            <FLD label="Lote N°" value={ot.lote} onChange={v => setF('lote', v)} />
            <FLD label="Altura" value={ot.altura} onChange={v => setF('altura', v)} />
            <div>
              <label style={lbl}>Tipo</label>
              <div style={{ display: 'flex', gap: '14px', marginTop: '8px' }}>
                {[['interior', 'Interior'], ['exterior', 'Exterior']].map(([k, l]) => (
                  <label key={k} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#888', fontFamily: F, fontSize: '13px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={ot[k]} onChange={e => setF(k, e.target.checked)} /> {l}
                  </label>
                ))}
              </div>
            </div>
            <FLD label="Resp. de Obra" value={ot.respObra} onChange={v => setF('respObra', v)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <FLD label="Teléfono" value={ot.telefono} onChange={v => setF('telefono', v)} />
            <FLD label="Firma Resp. Empresa" value={ot.firmaEmpresa} onChange={v => setF('firmaEmpresa', v)} />
          </div>

          {/* MATERIALES */}
          <div style={{ borderTop: '1px solid #1A1A1A', paddingTop: '14px' }}>
            <div style={{ color: '#A78BFA', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', fontFamily: F, marginBottom: '10px' }}>📦 Materiales</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr style={{ background: '#111' }}>
                    {['Detalle', 'Color', 'Uni.', 'Cant.', 'Material', 'Uni.', 'Cant.', 'Importe ($)', ''].map(h => (
                      <th key={h} style={{ padding: '6px 6px', color: '#555', fontWeight: 700, textAlign: 'left', fontSize: '9px', textTransform: 'uppercase', fontFamily: F, borderBottom: '1px solid #222' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ot.materiales.map((m, i) => (
                    <tr key={m.id} style={{ background: i % 2 === 0 ? '#0D0D0D' : '#111' }}>
                      {[['detalle','150px','Deck wpc incienso'],['color','70px','incienso'],['uni','50px','uni'],['cant','55px','107'],['material','90px','Deck'],['uni2','50px','m2'],['cant2','55px','33,63'],['importe','90px','$988.000,00']].map(([field, w, ph]) => (
                        <td key={field} style={{ padding: '3px 4px' }}>
                          <input value={m[field]} onChange={e => updMat(m.id, field, e.target.value)}
                            style={{ ...inp, width: w, padding: '5px 7px', fontSize: '11px' }}
                            placeholder={ph} />
                        </td>
                      ))}
                      <td style={{ padding: '3px 4px' }}>
                        <button onClick={() => removeMat(m.id)} style={{ background: 'none', border: 'none', color: '#F87171', cursor: 'pointer', fontSize: '18px', lineHeight: 1, padding: '2px 6px' }}>×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
              <Btn onClick={addMat} variant="secondary" size="sm">+ Agregar fila</Btn>
              <div style={{ color: '#F5A623', fontFamily: F, fontWeight: 700, fontSize: '14px' }}>
                TOTAL: {total.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}
              </div>
            </div>
          </div>

          <TXA label="Condiciones Comerciales" value={ot.condComerciales} onChange={v => setF('condComerciales', v)} rows={3}
            placeholder="Se abonó un anticipo parcial de $... y el saldo se abona al finalizar el trabajo." />
          <TXA label="Detalle de Tareas a Realizar" value={ot.tareas} onChange={v => setF('tareas', v)} rows={8}
            placeholder="Descripción detallada de los trabajos..." />

          <Btn onClick={() => savePDF(() => buildOTPDF({ ...ot, total }), `OT_${ot.cotizNum || inst.id}_${inst.client}.pdf`)}>
            📄 Generar Orden de Trabajo PDF
          </Btn>
        </div>
      )}

      {/* ── INFORME DE CAMBIOS ───────────────────────────────────────────────────── */}
      {tab === 'ic' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ background: '#6D28D910', border: '1px solid #6D28D930', borderRadius: '10px', padding: '12px 14px', fontSize: '12px', color: '#A78BFA', fontFamily: F }}>
            Usá este documento para informar cambios respecto a la Orden de Trabajo original — modificaciones de materiales, tareas o condiciones no previstas.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <FLD label="Fecha del informe" value={ic.fecha} onChange={v => setIF('fecha', v)} type="date" />
            <FLD label="Solicitado / notificado por" value={ic.solicitadoPor} onChange={v => setIF('solicitadoPor', v)} />
          </div>
          <TXA label="Descripción del cambio / modificación" value={ic.descripcion} onChange={v => setIF('descripcion', v)} rows={6}
            placeholder="Describir qué cambió respecto a la orden original: materiales, dimensiones, tareas adicionales..." />
          <TXA label="Motivo / Justificación" value={ic.motivo} onChange={v => setIF('motivo', v)} rows={4}
            placeholder="Por qué se realizaron estos cambios, quién los solicitó, condiciones de obra que lo motivaron..." />
          <Btn onClick={() => savePDF(() => buildICPDF({ ...ic, inst }), `InformeCC_${inst.id}_${inst.client}.pdf`)}>
            📄 Generar Informe de Cambios PDF
          </Btn>
        </div>
      )}

      {/* ── CONFORME A OBRA ──────────────────────────────────────────────────────── */}
      {tab === 'cao' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '68vh', overflowY: 'auto', paddingRight: '6px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <FLD label="Fecha de finalización" value={cao.fechaFin} onChange={v => setCF('fechaFin', v)} type="date" />
            <FLD label="Nombre del cliente" value={cao.clienteNombre} onChange={v => setCF('clienteNombre', v)} />
            <FLD label="DNI del cliente" value={cao.clienteDni} onChange={v => setCF('clienteDni', v)} placeholder="12.345.678" />
          </div>

          {/* Checklist */}
          <div style={{ borderTop: '1px solid #1A1A1A', paddingTop: '14px' }}>
            <div style={{ color: '#22C55E', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', fontFamily: F, marginBottom: '10px' }}>✅ Verificación de trabajo realizado</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              {cao.checklistItems.map((item, idx) => (
                <div key={idx} onClick={() => toggleCheck(idx)} style={{
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px',
                  background: item.checked ? '#22C55E08' : '#111',
                  border: `1px solid ${item.checked ? '#22C55E30' : '#1A1A1A'}`,
                  borderRadius: '8px', cursor: 'pointer', transition: 'all .15s',
                }}>
                  <div style={{ width: '16px', height: '16px', borderRadius: '4px', border: `2px solid ${item.checked ? '#22C55E' : '#444'}`, background: item.checked ? '#22C55E' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .15s' }}>
                    {item.checked && <span style={{ color: '#000', fontSize: '10px', fontWeight: 800 }}>✓</span>}
                  </div>
                  <span style={{ color: item.checked ? '#22C55E' : '#666', fontFamily: F, fontSize: '12px' }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <TXA label="Observaciones finales" value={cao.obsFinales} onChange={v => setCF('obsFinales', v)} rows={3}
            placeholder="Pendientes, notas o aclaraciones finales..." />
          <FLD label="Saldo abonado en conformidad" value={cao.saldoAbonado} onChange={v => setCF('saldoAbonado', v)} placeholder="$0,00" />

          <Btn onClick={() => savePDF(() => buildCAOPDF({ ...cao, inst, sale }), `ConformeObra_${inst.id}_${inst.client}.pdf`)}>
            📄 Generar Conforme a Obra PDF
          </Btn>
        </div>
      )}
    </Modal>
  )
}
