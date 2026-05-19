import { useState } from 'react'
import { F, SC, SL } from '../constants'
import { $, fD, calc, todayFile } from '../utils'
import { savePDF, buildWeeklyPDF } from '../pdf'
import { Card, ST, Badge, Btn } from './ui'

// ── STAT CARD ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, color, sub, onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <div onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: hov && onClick ? '#111' : '#0D0D0D', border: `1px solid ${hov && onClick ? '#2a2a2a' : '#1A1A1A'}`, borderTop: `2px solid ${color}`, borderRadius: '14px', padding: '20px', cursor: onClick ? 'pointer' : 'default', transition: 'all .15s' }}>
      <div style={{ fontSize: '44px', fontFamily: F, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '12px', color: '#555', marginTop: '8px', fontFamily: F }}>{label}</div>
      {sub && <div style={{ fontSize: '11px', color: '#444', marginTop: '4px', fontFamily: F }}>{sub}</div>}
      {onClick && <div style={{ fontSize: '10px', color: hov ? color : '#333', marginTop: '8px', fontFamily: F, transition: 'color .15s' }}>Ver todos →</div>}
    </div>
  )
}

// ── MINI BADGE ────────────────────────────────────────────────────────────────
function Dot({ color }) {
  return <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: color, marginRight: 6, flexShrink: 0 }} />
}

export default function Dashboard({ data, onNav }) {
  // ── Stats ──
  const activeQuotes   = data.quotes.filter(q => q.status !== 'confirmed')
  const pendingInst    = data.installations.filter(i => i.status !== 'completed')
  const pendingShips   = data.shipments.filter(s => s.status !== 'delivered')
  const totalSalesMoney = data.sales.reduce((sum, s) => sum + (s.total || 0), 0)
  const totalSaldo      = data.sales.reduce((sum, s) => sum + (s.saldo || 0), 0)

  // ── Clients overview ──
  const clientMap = {}
  data.quotes.forEach(q => {
    if (!q.client) return
    if (!clientMap[q.client]) clientMap[q.client] = { name: q.client, quotes: 0, sales: 0, total: 0, saldo: 0, hasInst: false }
    clientMap[q.client].quotes++
    const T = calc(q.items, q.discount || 0, q.includeIVA)
    clientMap[q.client].total += T.total
  })
  data.sales.forEach(s => {
    if (!clientMap[s.client]) clientMap[s.client] = { name: s.client, quotes: 0, sales: 0, total: 0, saldo: 0, hasInst: false }
    clientMap[s.client].sales++
    clientMap[s.client].saldo += (s.saldo || 0)
  })
  data.installations.forEach(i => {
    if (clientMap[i.client]) clientMap[i.client].hasInst = true
  })
  const clients = Object.values(clientMap).sort((a, b) => b.sales - a.sales || b.quotes - a.quotes)

  // ── Cotizaciones pipeline ──
  const pipeline = [
    { key: 'draft',     label: 'Borrador',   color: SC.draft },
    { key: 'sent',      label: 'Enviado',    color: SC.sent },
    { key: 'confirmed', label: 'Confirmado', color: SC.confirmed },
  ].map(p => ({ ...p, count: data.quotes.filter(q => q.status === p.key).length }))

  // ── Upcoming (next 7 days) ──
  const today   = new Date(); today.setHours(0, 0, 0, 0)
  const next7   = new Date(today); next7.setDate(today.getDate() + 7)
  const upcoming = [
    ...data.installations.filter(i => i.status !== 'completed' && i.scheduledDate).map(i => ({ type: 'inst', id: i.id, client: i.client, date: i.scheduledDate, label: i.technicianName, color: '#60A5FA', icon: '🔧', status: i.status })),
    ...data.shipments.filter(s => s.status !== 'delivered' && s.scheduledDate).map(s => ({ type: 'ship', id: s.id, client: s.client, date: s.scheduledDate, label: s.carrier || 'Sin transportista', color: '#22C55E', icon: '📦', status: s.status })),
  ]
    .filter(e => { const d = new Date(e.date + 'T12:00:00'); return d >= today && d <= next7 })
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6)

  // ── Recent quotes ──
  const recentQuotes = data.quotes.slice(0, 5)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Greeting */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ color: '#FFF', fontFamily: F, margin: '0 0 4px', fontSize: '30px', fontWeight: 800 }}>Buen día, Theia</h2>
          <p style={{ color: '#444', fontFamily: F, margin: 0, fontSize: '14px' }}>
            {new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <Btn onClick={() => savePDF(() => buildWeeklyPDF(data), `Informe_${todayFile()}_THEIA.pdf`)} variant="secondary">
          📊 Informe semanal PDF
        </Btn>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px' }}>
        <StatCard label="Cotizaciones activas" value={activeQuotes.length} color="#F5A623" sub={activeQuotes.length ? `última: ${activeQuotes[0]?.client || '-'}` : null} onClick={onNav ? () => onNav('quotes') : null} />
        <StatCard label="Instalaciones en curso" value={pendingInst.length} color="#60A5FA" onClick={onNav ? () => onNav('installations') : null} />
        <StatCard label="Envíos pendientes" value={pendingShips.length} color="#22C55E" onClick={onNav ? () => onNav('shipments') : null} />
        <StatCard label="Ventas totales" value={data.sales.length} color="#A78BFA" sub={data.sales.length ? $(totalSalesMoney) : null} onClick={onNav ? () => onNav('sales') : null} />
      </div>

      {/* Saldo pendiente banner — only if there is one */}
      {totalSaldo > 0 && (
        <div style={{ background: '#F8717108', border: '1px solid #F8717130', borderRadius: '14px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: '#F87171', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: F }}>⚠ Saldo pendiente de cobro</div>
            <div style={{ color: '#FFF', fontSize: '13px', fontFamily: F, marginTop: '4px' }}>
              {data.sales.filter(s => s.saldo > 0).length} venta{data.sales.filter(s => s.saldo > 0).length !== 1 ? 's' : ''} con saldo abierto
            </div>
          </div>
          <div style={{ color: '#F87171', fontSize: '26px', fontWeight: 800, fontFamily: F }}>{$(totalSaldo)}</div>
        </div>
      )}

      {/* Pipeline + Upcoming */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Cotizaciones pipeline */}
        <Card>
          <ST>Pipeline de cotizaciones</ST>
          {pipeline.map(p => (
            <div key={p.key} style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span style={{ color: '#888', fontSize: '12px', fontFamily: F }}>{p.label}</span>
                <span style={{ color: p.color, fontFamily: F, fontSize: '13px', fontWeight: 700 }}>{p.count}</span>
              </div>
              <div style={{ background: '#1A1A1A', borderRadius: '4px', height: '5px' }}>
                <div style={{ background: p.color, height: '100%', width: data.quotes.length ? `${(p.count / data.quotes.length) * 100}%` : '0%', borderRadius: '4px', transition: 'width .4s' }} />
              </div>
            </div>
          ))}
          {!data.quotes.length && <p style={{ color: '#444', fontSize: '13px', fontFamily: F, margin: 0 }}>Sin cotizaciones todavía.</p>}
        </Card>

        {/* Próximos eventos */}
        <Card>
          <ST color="#60A5FA">Próximos 7 días</ST>
          {upcoming.length === 0
            ? <p style={{ color: '#444', fontSize: '13px', fontFamily: F, margin: 0 }}>Sin eventos esta semana.</p>
            : upcoming.map((e, i) => (
              <div key={e.id + i} style={{ padding: '9px 0', borderBottom: '1px solid #1A1A1A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '16px' }}>{e.icon}</span>
                  <div>
                    <div style={{ color: '#FFF', fontSize: '13px', fontFamily: F, fontWeight: 500 }}>{e.client}</div>
                    <div style={{ color: '#444', fontSize: '11px', fontFamily: F, marginTop: '1px' }}>{fD(e.date)} · {e.label}</div>
                  </div>
                </div>
                <Badge status={e.status} />
              </div>
            ))
          }
        </Card>
      </div>

      {/* Clients table + Recent quotes */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '16px' }}>
        {/* Clients */}
        <Card>
          <ST color="#A78BFA">Clientes</ST>
          {!clients.length
            ? <p style={{ color: '#444', fontSize: '13px', fontFamily: F, margin: 0 }}>Sin clientes todavía.</p>
            : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 50px 50px 110px 90px', gap: '8px', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid #1A1A1A' }}>
                  {['Cliente', 'Cot.', 'Vtas', 'Total', 'Saldo'].map(h => (
                    <div key={h} style={{ fontSize: '9px', color: '#444', textTransform: 'uppercase', fontFamily: F, fontWeight: 700 }}>{h}</div>
                  ))}
                </div>
                {clients.map((c, i) => (
                  <div key={c.name} style={{ display: 'grid', gridTemplateColumns: '1fr 50px 50px 110px 90px', gap: '8px', padding: '8px 0', borderBottom: '1px solid #111', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', overflow: 'hidden' }}>
                      {c.hasInst && <Dot color="#60A5FA" />}
                      <span style={{ color: '#FFF', fontSize: '13px', fontFamily: F, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                    </div>
                    <span style={{ color: '#666', fontSize: '12px', fontFamily: F }}>{c.quotes}</span>
                    <span style={{ color: c.sales > 0 ? '#A78BFA' : '#333', fontSize: '12px', fontFamily: F, fontWeight: c.sales > 0 ? 600 : 400 }}>{c.sales}</span>
                    <span style={{ color: '#F5A623', fontSize: '12px', fontFamily: F, fontWeight: 600 }}>{c.total > 0 ? $(c.total) : '—'}</span>
                    <span style={{ color: c.saldo > 0 ? '#F87171' : '#444', fontSize: '12px', fontFamily: F, fontWeight: c.saldo > 0 ? 600 : 400 }}>{c.saldo > 0 ? $(c.saldo) : '—'}</span>
                  </div>
                ))}
              </>
            )
          }
        </Card>

        {/* Recent quotes */}
        <Card>
          <ST>Últimas cotizaciones</ST>
          {!recentQuotes.length
            ? <p style={{ color: '#444', fontSize: '13px', fontFamily: F, margin: 0 }}>Sin cotizaciones.</p>
            : recentQuotes.map(q => {
              const T = calc(q.items, q.discount || 0, q.includeIVA)
              return (
                <div key={q.id} style={{ padding: '9px 0', borderBottom: '1px solid #1A1A1A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                      <span style={{ color: '#F5A623', fontSize: '11px', fontFamily: F, fontWeight: 700 }}>{q.id}</span>
                      <span style={{ color: '#FFF', fontSize: '13px', fontFamily: F }}>{q.client || '—'}</span>
                    </div>
                    <div style={{ color: '#444', fontSize: '11px', fontFamily: F, marginTop: '2px' }}>{fD(q.date)}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <span style={{ color: '#F5A623', fontSize: '12px', fontFamily: F, fontWeight: 700 }}>{$(T.total)}</span>
                    <Badge status={q.status} />
                  </div>
                </div>
              )
            })
          }
        </Card>
      </div>

      {/* Open installations */}
      {pendingInst.length > 0 && (
        <Card>
          <ST color="#60A5FA">Instalaciones en curso</ST>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {pendingInst.slice(0, 5).map(inst => {
              const done = inst.stages.filter(s => s.done).length
              const pct  = Math.round((done / inst.stages.length) * 100)
              return (
                <div key={inst.id} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 80px 120px 60px', gap: '12px', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #111' }}>
                  <span style={{ color: '#60A5FA', fontSize: '12px', fontFamily: F, fontWeight: 700 }}>{inst.id}</span>
                  <div>
                    <div style={{ color: '#FFF', fontSize: '13px', fontFamily: F, fontWeight: 500 }}>{inst.client}</div>
                    <div style={{ color: '#444', fontSize: '11px', fontFamily: F }}>{fD(inst.scheduledDate)} · {inst.technicianName}</div>
                  </div>
                  <div>
                    <div style={{ background: '#1A1A1A', borderRadius: '4px', height: '5px' }}>
                      <div style={{ background: '#60A5FA', height: '100%', width: `${pct}%`, borderRadius: '4px', transition: 'width .4s' }} />
                    </div>
                    <div style={{ color: '#444', fontSize: '10px', fontFamily: F, marginTop: '3px' }}>{pct}%</div>
                  </div>
                  <div style={{ color: '#555', fontSize: '11px', fontFamily: F }}>{done}/{inst.stages.length} etapas</div>
                  <Badge status={inst.status} />
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}
