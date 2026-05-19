import { useState } from 'react'
import { F } from '../constants'
import { $, fD, calc, pdfName } from '../utils'
import { savePDF, buildQPDF, buildRCPDF } from '../pdf'
import { Card, Badge, Btn, Modal, ST } from './ui'

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

export default function SalesView({ data }) {
  const [docModal, setDocModal] = useState(null)

  return (
    <div>
      <h2 style={{ color: '#FFF', fontFamily: F, margin: '0 0 24px', fontSize: '26px', fontWeight: 800 }}>Ventas</h2>

      {!data.sales.length ? (
        <Card style={{ textAlign: 'center', padding: '70px' }}>
          <div style={{ fontSize: '54px', marginBottom: '16px' }}>💼</div>
          <p style={{ color: '#444', fontFamily: F, margin: 0, fontSize: '16px' }}>Las ventas aparecen al confirmar cotizaciones</p>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {data.sales.map(s => {
            const q = data.quotes.find(qt => qt.id === s.quoteId) || s.quoteRef
            return (
              <Card key={s.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: s.adelanto > 0 ? '12px' : '0' }}>
                  <div style={{ background: '#A78BFA12', border: '1px solid #A78BFA30', borderRadius: '10px', padding: '8px 12px', minWidth: '80px', textAlign: 'center' }}>
                    <div style={{ color: '#A78BFA', fontFamily: F, fontSize: '13px', fontWeight: 800 }}>{s.id}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#FFF', fontWeight: 600, fontFamily: F, fontSize: '15px' }}>{s.client}</div>
                    <div style={{ color: '#444', fontSize: '12px', fontFamily: F, marginTop: '2px' }}>CTF: {s.ctfOrderId || '-'} · {fD(s.date)}</div>
                  </div>
                  <div style={{ color: '#F5A623', fontFamily: F, fontSize: '16px', fontWeight: 700 }}>{$(s.total)}</div>
                  <Badge status={s.status} />
                  {q && <Btn onClick={() => setDocModal({ q, saleId: s.id, sale: s })} variant="secondary" size="sm">📄 Docs</Btn>}
                </div>

                {s.adelanto > 0 && (
                  <div style={{ display: 'flex', gap: '10px', background: '#000', borderRadius: '10px', padding: '10px 14px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '9px', color: '#555', fontFamily: F, fontWeight: 700, textTransform: 'uppercase', marginBottom: '3px' }}>Adelanto cobrado</div>
                      <div style={{ color: '#22C55E', fontFamily: F, fontSize: '14px', fontWeight: 700 }}>{$(s.adelanto)}</div>
                    </div>
                    <div style={{ width: '1px', background: '#1A1A1A' }} />
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: '9px', color: '#555', fontFamily: F, fontWeight: 700, textTransform: 'uppercase', marginBottom: '3px' }}>Saldo pendiente</div>
                      <div style={{ color: s.saldo > 0 ? '#F87171' : '#22C55E', fontFamily: F, fontSize: '14px', fontWeight: 700 }}>{$(s.saldo)}</div>
                    </div>
                    <div style={{ width: '1px', background: '#1A1A1A' }} />
                    <div style={{ flex: 1, textAlign: 'right' }}>
                      <div style={{ fontSize: '9px', color: '#555', fontFamily: F, fontWeight: 700, textTransform: 'uppercase', marginBottom: '3px' }}>Total</div>
                      <div style={{ color: '#FFF', fontFamily: F, fontSize: '14px', fontWeight: 700 }}>{$(s.total)}</div>
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {docModal && (
        <Modal title={`Docs — ${docModal.q?.client || ''}`} onClose={() => setDocModal(null)} width={360}>
          <PDFButtons q={docModal.q} saleId={docModal.saleId} sale={docModal.sale} />
        </Modal>
      )}
    </div>
  )
}
