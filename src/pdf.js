import { jsPDF } from 'jspdf'
import { IVA, ITYPE } from './constants'
import { $, fD, tod, calc } from './utils'
import { LOGO } from './logoBase64'

// Helper: agrega el logo en cualquier PDF
// x, y = esquina superior izquierda, w = ancho en mm (alto se calcula auto 1080x300 ≈ ratio 3.6:1)
const addLogo = (doc, x, y, w) => {
  try { doc.addImage(LOGO, 'JPEG', x, y, w, w / 3.6) } catch (_) {}
}

// ── SAVE WITH NATIVE DIALOG ───────────────────────────────────────────────────
export const savePDF = async (buildFn, filename) => {
  const blob = await buildFn()
  if (window.showSaveFilePicker) {
    try {
      const fh = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: 'PDF', accept: { 'application/pdf': ['.pdf'] } }],
      })
      const ws = await fh.createWritable()
      await ws.write(blob)
      await ws.close()
      return
    } catch (e) {
      if (e.name === 'AbortError') return
    }
  }
  const u = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = u; a.download = filename; a.click()
  setTimeout(() => URL.revokeObjectURL(u), 1200)
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
const pH = (doc, W, M, type, num, date) => {
  doc.setDrawColor(0); doc.setLineWidth(0.8); doc.line(M, 14, W - M, 14)
  addLogo(doc, M, 16, 52)   // logo 52mm ancho ≈ 14.4mm alto
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(0, 0, 0); doc.text(type, W - M, 20, { align: 'right' })
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(60, 60, 60)
  doc.text(`N° ${num}`, W - M, 26, { align: 'right' }); doc.text(`Fecha: ${date}`, W - M, 31, { align: 'right' })
  doc.setDrawColor(0); doc.setLineWidth(0.4); doc.line(M, 34, W - M, 34)
}

const tH = (doc, y, W, M, cols) => {
  doc.setFillColor(80, 80, 80); doc.rect(M, y, W - M * 2, 7, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(255, 255, 255)
  cols.forEach(([l, x, a]) => doc.text(l, x, y + 4.8, { align: a || 'left' }))
  return y + 7
}

// ── COTIZACIÓN PDF ────────────────────────────────────────────────────────────
export const buildQPDF = async (q) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' }); const W = 210, M = 16, CW = W - M * 2
  pH(doc, W, M, 'COTIZACIÓN', q.id, fD(q.date)); let y = 40
  doc.setFillColor(240, 240, 240); doc.rect(M, y, CW, 14, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(80, 80, 80); doc.text('CLIENTE', M + 4, y + 5)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(0, 0, 0); doc.text(q.client || '-', M + 4, y + 11)
  if (q.clientAddress) { doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(80, 80, 80); doc.text(q.clientAddress, W - M - 4, y + 9, { align: 'right' }) }
  if (q.clientPhone) { doc.setFontSize(8); doc.text(q.clientPhone, W - M - 4, y + 13, { align: 'right' }) }
  y += 20
  const cx = [M + 3, M + 90, M + 110, M + 126, M + 148, W - M - 3]
  y = tH(doc, y, W, M, [['DESCRIPCIÓN', cx[0]], ['TIPO', cx[1]], ['CANT.', cx[2]], ['P. UNIT.', cx[3] + 8, 'right'], ['IVA', cx[4] + 4, 'right'], ['SUBTOTAL', cx[5], 'right']])
  q.items.forEach((item, i) => {
    const bg = i % 2 === 0 ? 252 : 245
    doc.setFillColor(bg, bg, bg); doc.rect(M, y, CW, 7, 'F')
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(20, 20, 20); doc.text(String(item.name || '-'), cx[0], y + 4.5, { maxWidth: 82 })
    doc.setTextColor(80, 80, 80); doc.text(ITYPE[item.type] || '-', cx[1], y + 4.5)
    doc.text(String(item.qty || 0), cx[2] + 4, y + 4.5, { align: 'right' })
    doc.text($(item.unitPrice), cx[3] + 8, y + 4.5, { align: 'right' })
    doc.text(q.includeIVA ? '21%' : '-', cx[4] + 4, y + 4.5, { align: 'right' })
    doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 0, 0); doc.text($(item.subtotal), cx[5], y + 4.5, { align: 'right' })
    y += 7
  })
  doc.setDrawColor(0); doc.setLineWidth(0.3); doc.line(M, y, W - M, y); y += 8
  const T = calc(q.items, q.discount || 0, q.includeIVA)
  const tl = W - M - 70, tr = W - M - 3
  const tR = (label, val, b) => {
    doc.setFont('helvetica', b ? 'bold' : 'normal'); doc.setFontSize(b ? 10 : 8.5)
    doc.setTextColor(80, 80, 80); doc.text(label, tl, y)
    doc.setTextColor(0, 0, 0); doc.text($(val), tr, y, { align: 'right' }); y += b ? 9 : 6.5
  }
  tR('Subtotal', T.sub)
  if (q.discount > 0) tR(`Descuento (${q.discount}%)`, -T.da)
  if (q.includeIVA) tR('IVA (21%)', T.ia)
  doc.setDrawColor(0); doc.setLineWidth(0.4); doc.line(tl, y - 1, tr, y - 1); y += 3; tR('TOTAL', T.total, true); y += 8
  const blk = (title, text) => {
    if (!text) return
    const lines = doc.splitTextToSize(text, CW - 8); const h = lines.length * 4.5 + 14
    if (y + h > 275) { doc.addPage(); y = 18 }
    doc.setDrawColor(180, 180, 180); doc.setLineWidth(0.3); doc.rect(M, y, CW, h)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(80, 80, 80); doc.text(title, M + 4, y + 6)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(40, 40, 40); doc.text(lines, M + 4, y + 12)
    y += h + 6
  }
  blk('OBSERVACIONES', q.observations); blk('ESPECIFICACIONES', q.specifications)
  const pp = doc.internal.getNumberOfPages()
  for (let p = 1; p <= pp; p++) {
    doc.setPage(p); doc.setDrawColor(0); doc.setLineWidth(0.4); doc.line(M, 283, W - M, 283)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(130, 130, 130)
    doc.text(`THEIA · Presupuesto válido 7 días · Pág. ${p}/${pp}`, W / 2, 289, { align: 'center' })
  }
  return doc.output('blob')
}

// ── RECIBO PDF ────────────────────────────────────────────────────────────────
export const buildRCPDF = async (q, saleId, total, adelanto, saldo) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' }); const W = 210, M = 16, CW = W - M * 2
  pH(doc, W, M, 'RECIBO', saleId || q.id, fD(tod())); let y = 42
  doc.setFillColor(80, 80, 80); doc.rect(M, y, CW / 2 - 4, 24, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(200, 200, 200); doc.text('Venta', M + 5, y + 7)
  doc.setFontSize(13); doc.setTextColor(255, 255, 255); doc.text(`Venta N° ${saleId || q.id}`, M + 5, y + 15)
  doc.setFontSize(8); doc.setTextColor(180, 180, 180); doc.text(`Fecha: ${fD(tod())}`, M + 5, y + 21)
  doc.setFillColor(240, 240, 240); doc.rect(M + CW / 2, y, CW / 2 + 8, 24, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(0, 0, 0); doc.text('THEIA', M + CW / 2 + 8, y + 15); y += 30
  y = tH(doc, y, W, M, [['CANTIDAD DE PRODUCTOS', M + 3], ['MONTO TOTAL', W / 2 - 10, 'right'], ['ADELANTO', W / 2 + 30, 'right'], ['SALDO', W - M - 3, 'right']])
  doc.setFillColor(248, 248, 248); doc.rect(M, y, CW, 10, 'F')
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(0, 0, 0)
  const pc = (q.items || []).filter(i => i.type === 'product').reduce((s, i) => s + (+i.qty || 0), 0)
  const T_ = total || calc(q.items, q.discount || 0, q.includeIVA).total
  doc.text(String(pc), M + 3, y + 6.5)
  doc.text($(T_), W / 2 - 10, y + 6.5, { align: 'right' })
  doc.text($(adelanto || 0), W / 2 + 30, y + 6.5, { align: 'right' })
  doc.text($(saldo || 0), W - M - 3, y + 6.5, { align: 'right' }); y += 18
  ;[['Adelanto', $(adelanto || 0)], ['Total', $(T_)], ['Saldo pendiente', $(saldo || 0)]].forEach(([k, v]) => {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(80, 80, 80); doc.text(k, W - M - 60, y)
    doc.setTextColor(0, 0, 0); doc.text(v, W - M - 3, y, { align: 'right' }); y += 7
  })
  doc.setDrawColor(0); doc.setLineWidth(0.5); doc.line(W - M - 60, y - 1, W - M, y - 1); y += 5
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text('Importe del recibo', W - M - 60, y); doc.text($(adelanto || T_), W - M - 3, y, { align: 'right' })
  doc.setDrawColor(0); doc.setLineWidth(0.4); doc.line(M, 283, W - M, 283)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(130, 130, 130)
  doc.text('THEIA · Documento no válido como factura', W / 2, 289, { align: 'center' })
  return doc.output('blob')
}

// ── CONFORMIDAD PDF ───────────────────────────────────────────────────────────
export const buildCPDF = async (inst, sale) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' }); const W = 210, M = 16, CW = W - M * 2
  doc.setDrawColor(0); doc.setLineWidth(1); doc.line(M, 14, W - M, 14)
  doc.setFillColor(20, 20, 20); doc.rect(M, 17, 38, 14, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(255, 255, 255); doc.text('THEIA', M + 4, 26)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(200, 200, 200); doc.text('DISEÑO & CONSTRUCCIÓN', M + 4, 30)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(0, 0, 0); doc.text('REPORTE DE FINALIZACIÓN DE SERVICIO', W - M, 24, { align: 'right' })
  doc.setDrawColor(0); doc.setLineWidth(0.4); doc.line(M, 33, W - M, 33)
  let y = 38
  const col1 = M, col2 = M + 65, col3 = M + 130, refH = 10
  doc.setDrawColor(160, 160, 160); doc.setLineWidth(0.3)
  doc.rect(col1, y, 60, refH); doc.rect(col2, y, 62, refH); doc.rect(col3, y, CW - (col3 - M), refH)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(100, 100, 100)
  doc.text('COTIZACIÓN N°', col1 + 3, y + 4); doc.text('INSTALACIÓN N°', col2 + 3, y + 4); doc.text('ORDEN CTF', col3 + 3, y + 4)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(0, 0, 0)
  doc.text(inst.saleId || inst.id || '-', col1 + 3, y + 9); doc.text(inst.id || '-', col2 + 3, y + 9); doc.text(inst.ctfOrderId || '-', col3 + 3, y + 9)
  y += refH
  doc.rect(col1, y, 60, refH); doc.rect(col2, y, CW - 65, refH)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(100, 100, 100)
  doc.text('FECHA', col1 + 3, y + 4); doc.text('TÉCNICO RESPONSABLE', col2 + 3, y + 4)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(0, 0, 0)
  doc.text(fD(inst.scheduledDate || tod()), col1 + 3, y + 9); doc.text(inst.technicianName || '-', col2 + 3, y + 9)
  y += refH + 4
  doc.setFillColor(240, 240, 240); doc.rect(M, y, CW, 13, 'F'); doc.setDrawColor(160, 160, 160); doc.rect(M, y, CW, 13)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(100, 100, 100)
  doc.text('CLIENTE', M + 3, y + 4); doc.text('DIRECCIÓN', M + CW / 2 + 3, y + 4)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(0, 0, 0); doc.text(inst.client || '-', M + 3, y + 10.5)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text(inst.address || '-', M + CW / 2 + 3, y + 10.5)
  y += 19
  const fechaD = inst.scheduledDate ? new Date(inst.scheduledDate + 'T12:00:00') : new Date()
  const textoFormal = `Por medio de la presente, se deja constancia que a los ${fechaD.getDate()} días del mes de ${fechaD.toLocaleDateString('es-AR', { month: 'long' })} del año ${fechaD.getFullYear()}, se ha concluido de manera satisfactoria por parte de THEIA Diseño & Construcción, para ${inst.client || '_____________'}, la finalización de los servicios prestados por la instalación detallada a continuación, según ${inst.ctfOrderId ? 'Orden CTF N° ' + inst.ctfOrderId : 'la orden de trabajo correspondiente'}.`
  const tFLines = doc.splitTextToSize(textoFormal, CW)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(30, 30, 30); doc.text(tFLines, M, y); y += tFLines.length * 5 + 8
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(0, 0, 0); doc.text('TRABAJOS REALIZADOS', M, y)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(120, 120, 120); doc.text('(marcar con ✓ al completar)', M + 52, y); y += 5
  inst.stages.forEach((s, i) => {
    const bg = i % 2 === 0 ? 250 : 243
    doc.setFillColor(bg, bg, bg); doc.rect(M, y, CW, 11, 'F')
    doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.7); doc.rect(M + 4, y + 2.5, 6, 6)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(20, 20, 20); doc.text(s.name, M + 15, y + 7.5)
    doc.setDrawColor(180, 180, 180); doc.setLineWidth(0.3); doc.line(W - M - 50, y + 8, W - M - 4, y + 8)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(160, 160, 160); doc.text('fecha', W - M - 50, y + 6.5); y += 11
  })
  doc.setDrawColor(0); doc.setLineWidth(0.4); doc.line(M, y, W - M, y); y += 6
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(0, 0, 0); doc.text('Descripción:', M, y); y += 5
  for (let i = 0; i < 3; i++) { doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3); doc.line(M, y + i * 7, W - M, y + i * 7) }; y += 24
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.text('Observaciones:', M, y); y += 5
  for (let i = 0; i < 3; i++) { doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3); doc.line(M, y + i * 7, W - M, y + i * 7) }; y += 24
  if (y > 240) { doc.addPage(); y = 20 }; y += 4
  doc.setDrawColor(0); doc.setLineWidth(0.5); doc.line(M, y, W - M, y); y += 5
  const fw = (CW - 4) / 3
  ;['Total a pagar', 'Adelanto', 'Saldo pendiente'].forEach((lbl, i) => {
    doc.setFillColor(80, 80, 80); doc.rect(M + i * (fw + 2), y, fw, 8, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(255, 255, 255)
    doc.text(lbl, M + i * (fw + 2) + fw / 2, y + 5.5, { align: 'center' })
  }); y += 8
  const total_ = sale?.total || 0, adelanto_ = sale?.adelanto || 0, saldo_ = sale?.saldo || 0
  ;[$(total_), $(adelanto_), $(saldo_)].forEach((val, i) => {
    const hs = i === 2 && saldo_ > 0
    doc.setFillColor(hs ? 255 : 248, hs ? 240 : 248, hs ? 240 : 248)
    doc.rect(M + i * (fw + 2), y, fw, 11, 'F')
    doc.setDrawColor(180, 180, 180); doc.setLineWidth(0.3); doc.rect(M + i * (fw + 2), y, fw, 11)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(sale ? 11 : 9); doc.setTextColor(hs ? 180 : 30, 30, 30)
    if (!sale) { doc.setTextColor(160, 160, 160); doc.text('__________', M + i * (fw + 2) + fw / 2, y + 7.5, { align: 'center' }) }
    else doc.text(val, M + i * (fw + 2) + fw / 2, y + 7.5, { align: 'center' })
  }); y += 17
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(0, 0, 0); doc.text('Forma de pago:', M, y)
  const pMets = ['Efectivo', 'Transferencia']; const bw = 60; let bx = M + 38
  pMets.forEach(pm => {
    doc.setDrawColor(160, 160, 160); doc.setLineWidth(0.4); doc.rect(bx, y - 5, bw, 8)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(40, 40, 40); doc.text(pm, bx + bw / 2, y + 0.5, { align: 'center' }); bx += bw + 4
  }); y += 12
  doc.setDrawColor(0); doc.setLineWidth(0.3); doc.line(M, y, W - M, y); y += 6
  const legal = 'De esta manera se expresa que, a la firma del presente reporte, ambas partes han convenido que se ha revisado todos los detalles del trabajo realizado y/o de los productos instalados y que brindan su total conformidad.'
  const legalLines = doc.splitTextToSize(legal, CW)
  doc.setFont('helvetica', 'italic'); doc.setFontSize(8.5); doc.setTextColor(50, 50, 50); doc.text(legalLines, M, y); y += legalLines.length * 5 + 16
  if (y > 260) { doc.addPage(); y = 20 }
  const fw2 = 80, ex = W - M - fw2
  doc.setDrawColor(0); doc.setLineWidth(0.5)
  doc.line(M, y, M + fw2, y); doc.line(M, y + 18, M + fw2, y + 18)
  doc.line(ex, y, ex + fw2, y); doc.line(ex, y + 18, ex + fw2, y + 18)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(80, 80, 80)
  doc.text('FIRMA CLIENTE / RESPONSABLE', M, y + 4); doc.text('FIRMA EMPRESA', ex, y + 4)
  doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3); doc.line(M, y + 11, M + fw2, y + 11)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(130, 130, 130)
  doc.text('Aclaración', M, y + 14.5); doc.text('DNI / CUIT', M + fw2 / 2, y + 14.5)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(30, 30, 30); doc.text('THEIA Diseño & Construcción', ex, y + 9.5)
  doc.setFontSize(7); doc.setTextColor(100, 100, 100)
  if (inst.technicianName) doc.text(inst.technicianName, ex, y + 13.5)
  const pp = doc.internal.getNumberOfPages()
  for (let p = 1; p <= pp; p++) {
    doc.setPage(p); doc.setDrawColor(0); doc.setLineWidth(0.4); doc.line(M, 283, W - M, 283)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(130, 130, 130)
    doc.text(`THEIA Diseño & Construcción · Reporte de Finalización de Servicio · Pág. ${p}/${pp}`, W / 2, 289, { align: 'center' })
  }
  return doc.output('blob')
}

// ── REMITO INTERNO PDF ────────────────────────────────────────────────────────
export const buildRMIntPDF = async (inst, compras) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' }); const W = 210, M = 16, CW = W - M * 2
  pH(doc, W, M, 'REMITO INTERNO', inst.id, fD(tod())); let y = 40
  doc.setFillColor(240, 240, 240); doc.rect(M, y, CW, 16, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(80, 80, 80)
  doc.text('INSTALACIÓN:', M + 4, y + 6); doc.text('DIRECCIÓN:', M + 4, y + 12)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(0, 0, 0)
  doc.text(`${inst.client || '-'}${inst.ctfOrderId ? ' — CTF: ' + inst.ctfOrderId : ''}`, M + 32, y + 6)
  doc.text(inst.address || '-', M + 32, y + 12); y += 22
  y = tH(doc, y, W, M, [['✓', M + 4], ['CANT.', M + 16], ['UNID.', M + 34], ['MATERIAL', M + 56], ['NOTAS', W - M - 55]])
  ;(compras || []).forEach((item, i) => {
    const bg = i % 2 === 0 ? 252 : 245
    doc.setFillColor(bg, bg, bg); doc.rect(M, y, CW, 10, 'F')
    doc.setDrawColor(0); doc.setLineWidth(0.55); doc.rect(M + 4, y + 3, 4, 4)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(20, 20, 20)
    doc.text(String(item.qty || 1), M + 20, y + 6.5, { align: 'right' })
    doc.text(item.unit || '-', M + 36, y + 6.5)
    doc.text(item.name || '-', M + 56, y + 6.5, { maxWidth: CW - 120 })
    doc.setTextColor(100, 100, 100); doc.text(item.notes || '', W - M - 55, y + 6.5, { maxWidth: 52 }); y += 10
  })
  if (!compras || !compras.length) {
    doc.setFont('helvetica', 'italic'); doc.setFontSize(9); doc.setTextColor(140, 140, 140); doc.text('Sin materiales cargados.', M, y + 8)
  }
  doc.setDrawColor(0); doc.setLineWidth(0.4); doc.line(M, 283, W - M, 283)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(130, 130, 130)
  doc.text('THEIA · Remito interno · No válido como factura comercial', W / 2, 289, { align: 'center' })
  return doc.output('blob')
}

// ── LIBRE DE DEUDAS PDF ───────────────────────────────────────────────────────
export const buildLDPDF = async (inst, sale) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' }); const W = 210, M = 16, CW = W - M * 2
  pH(doc, W, M, 'CERTIFICADO LIBRE DE DEUDA', inst.id, fD(tod())); let y = 42
  doc.setFillColor(240, 240, 240); doc.rect(M, y, CW, 20, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(80, 80, 80); doc.text('CLIENTE:', M + 4, y + 6)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(0, 0, 0); doc.text(inst.client || '-', M + 4, y + 14)
  if (inst.address) { doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(80, 80, 80); doc.text(inst.address, W - M - 4, y + 14, { align: 'right' }) }; y += 26
  if (sale) {
    y = tH(doc, y, W, M, [['REFERENCIA', M + 3], ['TOTAL', W / 2 - 10, 'right'], ['ADELANTO ABONADO', W / 2 + 30, 'right'], ['SALDO PENDIENTE', W - M - 3, 'right']])
    doc.setFillColor(248, 248, 248); doc.rect(M, y, CW, 11, 'F')
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(0, 0, 0); doc.text(sale.id, M + 3, y + 7)
    doc.text($(sale.total || 0), W / 2 - 10, y + 7, { align: 'right' })
    doc.text($(sale.adelanto || 0), W / 2 + 30, y + 7, { align: 'right' })
    doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 120, 30); doc.text('$ 0,00', W - M - 3, y + 7, { align: 'right' }); y += 18
  }
  y += 8
  const ct = `Por medio del presente documento, THEIA Diseño & Construcción certifica que el/la cliente ${inst.client || ''} no registra deudas pendientes en concepto de la obra realizada en ${inst.address || 'el domicilio acordado'}.\n\nLos trabajos detallados fueron inspeccionados, verificados y aprobados por el cliente mediante la correspondiente Conformidad de Obra. La totalidad del monto acordado ha sido recibida en forma satisfactoria.\n\nEste certificado es emitido a solicitud del cliente y tiene validez como constancia de finalización de obra y cancelación total de haberes.`
  const ls = doc.splitTextToSize(ct, CW)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(30, 30, 30); doc.text(ls, M, y); y += ls.length * 5.5 + 22
  doc.setDrawColor(0); doc.setLineWidth(0.4)
  doc.line(M, y, M + 75, y); doc.line(W - M - 75, y, W - M, y); y += 5
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(100, 100, 100)
  doc.text('Firma y aclaración del cliente', M, y); doc.text('THEIA Diseño & Construcción', W - M - 75, y); y += 10
  doc.line(M, y, M + 50, y); doc.line(W - M - 75, y, W - M - 10, y)
  doc.text('DNI / CUIT', M, y + 5); doc.text(fD(tod()), W - M - 75, y + 5)
  doc.setDrawColor(0); doc.setLineWidth(0.4); doc.line(M, 283, W - M, 283)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(130, 130, 130)
  doc.text('THEIA Diseño & Construcción · Certificado de obra finalizada y cancelación de haberes', W / 2, 289, { align: 'center' })
  return doc.output('blob')
}

// ── ORDEN DE TRABAJO PDF ─────────────────────────────────────────────────────
export const buildOTPDF = async (data) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210, M = 14, CW = W - M * 2, MID = M + CW / 2
  let y = M

  // ── HEADER ──
  doc.setDrawColor(0); doc.setLineWidth(0.8); doc.line(M, y, W - M, y); y += 2
  addLogo(doc, M, y, 52)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(0, 0, 0)
  doc.text('COTIZACIÓN N°:', W - M - 80, y + 4)
  doc.setFont('helvetica', 'normal'); doc.text(data.cotizNum || '-', W - M - 45, y + 4)
  doc.text('FECHA:', W - M - 80, y + 10)
  doc.text(fD(data.fecha || tod()), W - M - 60, y + 10)
  y += 16
  doc.setDrawColor(0); doc.setLineWidth(0.4); doc.line(M, y, W - M, y); y += 3

  // ── TITLE BAR ──
  doc.setFillColor(25, 25, 25); doc.rect(M, y, CW, 8, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(255, 255, 255)
  doc.text('ORDEN DE TRABAJO', W / 2, y + 5.5, { align: 'center' })
  y += 8

  // ── INFO SECTION (sin logo) ──
  const fH = 7, infoRows = 5, infoH = fH * infoRows
  const H2 = CW / 2  // mitad del ancho
  doc.setDrawColor(0); doc.setLineWidth(0.3); doc.rect(M, y, CW, infoH)
  // línea vertical central
  doc.setDrawColor(210, 210, 210); doc.setLineWidth(0.2); doc.line(M + H2, y, M + H2, y + infoH)

  const fX = M + 3, fX2 = M + H2 + 3
  const vX = M + 28,  vX2 = M + H2 + 28
  const row = (i) => y + i * fH

  const infoField = (label, value, x, vx, rowIdx) => {
    doc.setDrawColor(210, 210, 210); doc.setLineWidth(0.2)
    if (rowIdx > 0) doc.line(M, row(rowIdx), W - M, row(rowIdx))
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6); doc.setTextColor(100, 100, 100)
    doc.text(label, x, row(rowIdx) + 3.5)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(0, 0, 0)
    doc.text(String(value || '-'), vx, row(rowIdx) + 6)
  }

  infoField('FECHA DE INICIO', fD(data.fechaInicio || tod()), fX, vX, 0)
  infoField('INSTALADOR:', data.instalador, fX2, vX2, 0)
  doc.setDrawColor(210, 210, 210); doc.line(M, row(1), W - M, row(1))
  doc.setFont('helvetica', 'bold'); doc.setFontSize(6); doc.setTextColor(100, 100, 100); doc.text('UBICACIÓN:', fX, row(1) + 3.5)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(0, 0, 0); doc.text(data.ubicacion || '-', vX, row(1) + 6, { maxWidth: H2 - 32 })
  infoField('BARRIO:', data.barrio, fX, vX, 2)
  infoField('LOTE N°:', data.lote, fX2, vX2, 2)
  infoField('ALTURA:', data.altura, fX, vX, 3)
  doc.setDrawColor(210, 210, 210); doc.line(M, row(3), W - M, row(3))
  doc.setFont('helvetica', 'bold'); doc.setFontSize(6); doc.setTextColor(100, 100, 100)
  doc.text('INTERIOR:', fX2, row(3) + 3.5)
  doc.setDrawColor(0); doc.setLineWidth(0.5); doc.rect(fX2 + 15, row(3) + 1, 4.5, 4.5)
  if (data.interior) { doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(0,0,0); doc.text('×', fX2 + 16, row(3) + 5.2) }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(6); doc.setTextColor(100, 100, 100)
  doc.text('EXTERIOR:', fX2 + 26, row(3) + 3.5)
  doc.rect(fX2 + 41, row(3) + 1, 4.5, 4.5)
  if (data.exterior) { doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(0,0,0); doc.text('×', fX2 + 42, row(3) + 5.2) }
  infoField('RESP. DE OBRA:', data.respObra, fX, vX, 4)
  infoField('TELÉFONO:', data.telefono, fX2, vX2, 4)
  y += infoH

  // ── MATERIALS SPLIT HEADER ──
  doc.setFillColor(60, 60, 60); doc.rect(M, y, CW / 2, 7, 'F')
  doc.setFillColor(90, 90, 90); doc.rect(MID, y, CW / 2, 7, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(255, 255, 255)
  doc.text('MATERIALES', M + CW / 4, y + 4.8, { align: 'center' })
  doc.text('IMPORTES', MID + CW / 4, y + 4.8, { align: 'center' })
  y += 7

  // Sub-headers
  doc.setFillColor(220, 220, 220); doc.rect(M, y, CW / 2, 6, 'F')
  doc.setFillColor(230, 230, 230); doc.rect(MID, y, CW / 2, 6, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(60, 60, 60)
  const Lh = [[' DETALLE', M + 1], ['COLOR', M + 50], ['UNI.', M + 67], ['CANT.', M + 77]]
  const Rh = [['MATERIAL', MID + 1], ['UNI.', MID + 38], ['CANT.', MID + 50], ['IMPORTE', W - M - 2]]
  Lh.forEach(([l, x]) => doc.text(l, x, y + 4.2))
  Rh.forEach(([l, x], i) => doc.text(l, x, y + 4.2, { align: i === 3 ? 'right' : 'left' }))
  y += 6

  // Rows (minimum 8)
  const mats = data.materiales || []; const minRows = Math.max(mats.length, 8); const rH = 7
  for (let i = 0; i < minRows; i++) {
    const m = mats[i]
    const bg = i % 2 === 0 ? 252 : 245
    doc.setFillColor(bg, bg, bg); doc.rect(M, y, CW, rH, 'F')
    doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.2)
    doc.line(MID, y, MID, y + rH); doc.line(M, y + rH, W - M, y + rH)
    if (m) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(20, 20, 20)
      if (m.detalle) doc.text(m.detalle, M + 2, y + 4.8, { maxWidth: 44 })
      if (m.color) doc.text(m.color, M + 50, y + 4.8, { maxWidth: 14 })
      if (m.uni) doc.text(m.uni, M + 67, y + 4.8)
      if (m.cant) doc.text(String(m.cant), M + 80, y + 4.8, { align: 'right' })
      if (m.material) doc.text(m.material, MID + 2, y + 4.8, { maxWidth: 34 })
      if (m.uni2) doc.text(m.uni2, MID + 38, y + 4.8)
      if (m.cant2) doc.text(String(m.cant2), MID + 52, y + 4.8)
      if (m.importe) { doc.setFont('helvetica', 'bold'); doc.text(m.importe, W - M - 2, y + 4.8, { align: 'right' }) }
    }
    y += rH
  }

  // Total
  doc.setFillColor(238, 238, 238); doc.rect(M, y, CW, 8, 'F')
  doc.setDrawColor(0); doc.setLineWidth(0.4); doc.rect(M, y, CW, 8)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(0, 0, 0)
  doc.text('TOTAL', MID + 2, y + 5.5)
  const totalFmt = (data.total || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })
  doc.text(totalFmt, W - M - 2, y + 5.5, { align: 'right' })
  y += 12

  // ── CONDICIONES COMERCIALES ──
  const section = (title, text, minH = 20) => {
    if (y + 16 > 272) { doc.addPage(); y = M }
    doc.setFillColor(50, 50, 50); doc.rect(M, y, CW, 7, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(255, 255, 255)
    doc.text(title, W / 2, y + 4.8, { align: 'center' }); y += 7
    const maxTW = CW - 10
    const lines = doc.splitTextToSize(text || '', maxTW)
    const lineH = 4.8
    const h = Math.max(lines.length * lineH + 10, minH)
    if (y + h > 278) { doc.addPage(); y = M }
    doc.setDrawColor(180, 180, 180); doc.setLineWidth(0.3); doc.rect(M, y, CW, h)
    if (text) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(20, 20, 20)
      doc.text(lines, M + 5, y + 7, { maxWidth: maxTW })
    }
    y += h + 5
  }

  section('CONDICIONES COMERCIALES', data.condComerciales, 18)
  section('DETALLE DE LAS TAREAS A REALIZAR', data.tareas, 40)

  // ── SIGNATURES ──
  if (y + 28 > 278) { doc.addPage(); y = M }
  y += 4
  if (data.firmaEmpresa) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(30, 30, 30)
    doc.text(data.firmaEmpresa, M + CW / 4, y, { align: 'center' })
  }
  y += 10
  doc.setDrawColor(0); doc.setLineWidth(0.5)
  doc.line(M, y, M + CW / 2 - 8, y); doc.line(MID + 8, y, W - M, y); y += 5
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(80, 80, 80)
  doc.text('FIRMA RESPONSABLE EMPRESA', M, y); doc.text('FIRMA RESPONSABLE INSTALACIÓN', MID + 8, y)

  // Footer
  const pp = doc.internal.getNumberOfPages()
  for (let p = 1; p <= pp; p++) {
    doc.setPage(p); doc.setDrawColor(0); doc.setLineWidth(0.4); doc.line(M, 283, W - M, 283)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(130, 130, 130)
    doc.text(`THEIA Diseño & Construcción · Orden de Trabajo${data.cotizNum ? ' · ' + data.cotizNum : ''} · Pág. ${p}/${pp}`, W / 2, 289, { align: 'center' })
  }
  return doc.output('blob')
}

// ── INFORME DE CAMBIOS PDF ────────────────────────────────────────────────────
export const buildICPDF = async ({ fecha, descripcion, motivo, solicitadoPor, inst }) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' }); const W = 210, M = 16, CW = W - M * 2
  pH(doc, W, M, 'INFORME DE MODIFICACIONES', inst?.id || '-', fD(fecha || tod())); let y = 42

  // Client ref
  doc.setFillColor(240, 240, 240); doc.rect(M, y, CW, 16, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(80, 80, 80)
  doc.text('INSTALACIÓN:', M + 4, y + 6); doc.text('CLIENTE:', M + CW / 2 + 4, y + 6)
  doc.text('DIRECCIÓN:', M + 4, y + 13)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(0, 0, 0)
  doc.text(inst?.id || '-', M + 28, y + 6)
  doc.text(inst?.client || '-', M + CW / 2 + 20, y + 6)
  doc.text(inst?.address || '-', M + 28, y + 13, { maxWidth: CW / 2 - 30 }); y += 22

  // Meta row
  const half = (CW - 4) / 2
  doc.setDrawColor(160, 160, 160); doc.setLineWidth(0.3)
  doc.rect(M, y, half, 10); doc.rect(M + half + 4, y, half, 10)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(100, 100, 100)
  doc.text('FECHA DEL INFORME', M + 3, y + 4); doc.text('SOLICITADO / NOTIFICADO POR', M + half + 7, y + 4)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(0, 0, 0)
  doc.text(fD(fecha || tod()), M + 3, y + 9); doc.text(solicitadoPor || '-', M + half + 7, y + 9); y += 16

  const blk = (title, text, rgb) => {
    doc.setFillColor(...rgb); doc.rect(M, y, CW, 7, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(255, 255, 255)
    doc.text(title, W / 2, y + 4.8, { align: 'center' }); y += 7
    const lines = doc.splitTextToSize(text || '—', CW - 6)
    const h = Math.max(lines.length * 5 + 10, 28)
    if (y + h > 278) { doc.addPage(); y = 16 }
    doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3); doc.rect(M, y, CW, h)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(25, 25, 25)
    doc.text(lines, M + 4, y + 7); y += h + 8
  }
  blk('DESCRIPCIÓN DE LA MODIFICACIÓN / CAMBIO', descripcion, [60, 100, 200])
  blk('MOTIVO / JUSTIFICACIÓN', motivo, [70, 70, 70])

  // Legal
  const legal = 'El presente informe documenta las modificaciones realizadas sobre la orden de trabajo original. Ambas partes quedan notificadas de los cambios detallados y prestan conformidad mediante la firma al pie.'
  const ll = doc.splitTextToSize(legal, CW)
  if (y + ll.length * 5 + 30 > 278) { doc.addPage(); y = 16 }
  doc.setFont('helvetica', 'italic'); doc.setFontSize(8.5); doc.setTextColor(80, 80, 80)
  doc.text(ll, M, y); y += ll.length * 5 + 14

  // Signatures
  const fw = 75
  doc.setDrawColor(0); doc.setLineWidth(0.5)
  doc.line(M, y, M + fw, y); doc.line(W - M - fw, y, W - M, y); y += 5
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(80, 80, 80)
  doc.text('RESPONSABLE EMPRESA', M, y); doc.text('CLIENTE / RESPONSABLE', W - M - fw, y)

  doc.setDrawColor(0); doc.setLineWidth(0.4); doc.line(M, 283, W - M, 283)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(130, 130, 130)
  doc.text(`THEIA Diseño & Construcción · Informe de Modificaciones · ${inst?.id || ''} · ${fD(fecha || tod())}`, W / 2, 289, { align: 'center' })
  return doc.output('blob')
}

// ── CONFORME A OBRA PDF ───────────────────────────────────────────────────────
export const buildCAOPDF = async ({ fechaFin, clienteNombre, clienteDni, checklistItems, obsFinales, saldoAbonado, inst, sale }) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' }); const W = 210, M = 16, CW = W - M * 2

  // Header — logo imagen
  doc.setDrawColor(0); doc.setLineWidth(0.8); doc.line(M, 14, W - M, 14)
  addLogo(doc, M, 16, 52)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(0, 0, 0); doc.text('CONFORME A OBRA', W - M, 24, { align: 'right' })
  doc.setDrawColor(0); doc.setLineWidth(0.4); doc.line(M, 33, W - M, 33)
  let y = 38

  // Reference boxes
  const col1 = M, col2 = M + 65, col3 = M + 130, refH = 10
  doc.setDrawColor(160, 160, 160); doc.setLineWidth(0.3)
  doc.rect(col1, y, 60, refH); doc.rect(col2, y, 62, refH); doc.rect(col3, y, CW - (col3 - M), refH)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(100, 100, 100)
  doc.text('INSTALACIÓN N°', col1 + 3, y + 4); doc.text('CLIENTE', col2 + 3, y + 4); doc.text('FECHA', col3 + 3, y + 4)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(0, 0, 0)
  doc.text(inst?.id || '-', col1 + 3, y + 9)
  doc.text((clienteNombre || inst?.client || '-').substring(0, 22), col2 + 3, y + 9)
  doc.text(fD(fechaFin || tod()), col3 + 3, y + 9)
  y += refH
  doc.rect(col1, y, 60, refH); doc.rect(col2, y, CW - 65, refH)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(100, 100, 100)
  doc.text('DNI / DOCUMENTO', col1 + 3, y + 4); doc.text('DIRECCIÓN DE OBRA', col2 + 3, y + 4)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(0, 0, 0)
  doc.text(clienteDni || '—', col1 + 3, y + 9)
  doc.text((inst?.address || '-').substring(0, 40), col2 + 3, y + 9)
  y += refH + 6

  // ── TEXTO FORMAL — izquierda, en recuadro (zona verde)
  const fechaD = fechaFin ? new Date(fechaFin + 'T12:00:00') : new Date()
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
  const dia = fechaD.getDate()
  const texto = `Por medio de la presente, el/la cliente ${clienteNombre || inst?.client || '_____________'}, DNI ${clienteDni || '____________'}, presta su conformidad con los trabajos realizados a los ${dia} ${dia === 1 ? 'día' : 'días'} del mes de ${meses[fechaD.getMonth()]} del año ${fechaD.getFullYear()}, en el inmueble ubicado en ${inst?.address || '________________'}, llevados a cabo por THEIA Design and Co. Declara haber inspeccionado y verificado los trabajos, encontrándolos conformes a lo acordado.`
  const textMaxW = CW - 10
  const tLines = doc.splitTextToSize(texto, textMaxW)
  const textBoxH = tLines.length * 7 + 14
  doc.setDrawColor(180, 180, 180); doc.setLineWidth(0.4); doc.rect(M, y, CW, textBoxH)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(12); doc.setTextColor(20, 20, 20)
  doc.text(tLines, M + 5, y + 10, { maxWidth: textMaxW })
  y += textBoxH + 18  // espacio entre texto y checklist (zona roja más abajo)

  // ── CHECKLIST — zona roja
  const checkItems = ['MATERIAL EN OBRA', 'COLOCACION Y TERMINACIONES', 'LIMPIEZA EN OBRA', 'CAMBIOS O ADICIONALES']
  const checkH = 7 + checkItems.length * 10 + 4
  doc.setDrawColor(180, 180, 180); doc.setLineWidth(0.4); doc.rect(M, y, CW, checkH)
  doc.setFillColor(30, 30, 30); doc.rect(M, y, CW, 7, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(255, 255, 255)
  doc.text('VERIFICACIÓN DE TRABAJO REALIZADO', W / 2, y + 4.8, { align: 'center' }); y += 7

  checkItems.forEach((label, idx) => {
    const bg = idx % 2 === 0 ? 248 : 241
    doc.setFillColor(bg, bg, bg); doc.rect(M, y, CW, 10, 'F')
    doc.setDrawColor(0); doc.setLineWidth(0.6); doc.rect(M + 4, y + 2.5, 5, 5)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(20, 20, 20)
    doc.text(label, M + 14, y + 7)
    doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.2); doc.line(M, y + 10, W - M, y + 10)
    y += 10
  })
  y += 4 + 12  // cierre del rect + espacio

  // Observations
  if (obsFinales) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(80, 80, 80)
    doc.text('OBSERVACIONES FINALES', M, y); y += 5
    const obsLines = doc.splitTextToSize(obsFinales, CW)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(30, 30, 30)
    doc.text(obsLines, M, y); y += obsLines.length * 5 + 8
  }

  if (saldoAbonado) {
    doc.setDrawColor(0); doc.setLineWidth(0.3); doc.line(M, y, W - M, y); y += 6
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(0, 0, 0)
    doc.text('Saldo abonado en conformidad:', M, y); doc.text(saldoAbonado, W - M, y, { align: 'right' }); y += 12
  }

  // Legal + firmas fijas al pie
  const legal = 'De esta manera se expresa que, a la firma del presente documento, el cliente ha revisado todos los detalles del trabajo realizado y/o de los productos instalados, prestando su total conformidad con los mismos.'
  const ll = doc.splitTextToSize(legal, CW)
  const sigY = 248  // posición fija firmas

  doc.setFont('helvetica', 'italic'); doc.setFontSize(8.5); doc.setTextColor(50, 50, 50)
  doc.text(ll, M, sigY - ll.length * 5 - 14)

  const fw = 75
  doc.setDrawColor(0); doc.setLineWidth(0.5)
  doc.line(M, sigY, M + fw, sigY); doc.line(W - M - fw, sigY, W - M, sigY)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(80, 80, 80)
  doc.text('FIRMA CLIENTE / RESPONSABLE', M, sigY + 5)
  doc.text('THEIA DESIGN AND CO', W - M - fw, sigY + 5)
  doc.setDrawColor(180, 180, 180); doc.setLineWidth(0.3); doc.line(M, sigY + 12, M + fw, sigY + 12)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(130, 130, 130)
  doc.text('Aclaración', M, sigY + 16); doc.text('DNI', M + fw / 2, sigY + 16)
  if (clienteNombre) { doc.setFontSize(8); doc.setTextColor(30, 30, 30); doc.text(clienteNombre, M, sigY + 3) }
  if (inst?.technicianName) { doc.setFontSize(8); doc.setTextColor(30, 30, 30); doc.text(inst.technicianName, W - M - fw, sigY + 3) }

  const pp = doc.internal.getNumberOfPages()
  for (let p = 1; p <= pp; p++) {
    doc.setPage(p); doc.setDrawColor(0); doc.setLineWidth(0.4); doc.line(M, 283, W - M, 283)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(130, 130, 130)
    doc.text(`THEIA Diseño & Construcción · Conforme a Obra · ${inst?.id || ''} · Pág. ${p}/${pp}`, W / 2, 289, { align: 'center' })
  }
  return doc.output('blob')
}

// ── GARANTÍA 10 AÑOS PDF ─────────────────────────────────────────────────────
export const buildGarantiaPDF = async (inst, sale) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' }); const W = 210, M = 16, CW = W - M * 2

  // ── Header
  doc.setDrawColor(0); doc.setLineWidth(0.8); doc.line(M, 14, W - M, 14)
  addLogo(doc, M, 16, 52)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(0, 0, 0)
  doc.text('CERTIFICADO DE GARANTÍA', W - M, 22, { align: 'right' })
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(80, 80, 80)
  doc.text('10 años · THEIA Design and Co', W - M, 29, { align: 'right' })
  doc.setDrawColor(0); doc.setLineWidth(0.4); doc.line(M, 34, W - M, 34)
  let y = 40

  // ── Ref boxes
  const col1 = M, col2 = M + 65, col3 = M + 130, refH = 10
  doc.setDrawColor(160, 160, 160); doc.setLineWidth(0.3)
  doc.rect(col1, y, 60, refH); doc.rect(col2, y, 62, refH); doc.rect(col3, y, CW - (col3 - M), refH)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(100, 100, 100)
  doc.text('INSTALACIÓN N°', col1 + 3, y + 4); doc.text('CLIENTE', col2 + 3, y + 4); doc.text('FECHA', col3 + 3, y + 4)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(0, 0, 0)
  doc.text(inst?.id || '-', col1 + 3, y + 9)
  doc.text((inst?.client || '-').substring(0, 22), col2 + 3, y + 9)
  doc.text(fD(tod()), col3 + 3, y + 9)
  y += refH
  doc.rect(col1, y, 60, refH); doc.rect(col2, y, CW - 65, refH)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(100, 100, 100)
  doc.text('TÉCNICO', col1 + 3, y + 4); doc.text('DIRECCIÓN DE OBRA', col2 + 3, y + 4)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(0, 0, 0)
  doc.text(inst?.technicianName || '-', col1 + 3, y + 9)
  doc.text((inst?.address || '-').substring(0, 40), col2 + 3, y + 9)
  y += refH + 6

  // ── Título de garantía
  doc.setFillColor(20, 20, 20); doc.rect(M, y, CW, 12, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(255, 255, 255)
  doc.text('GARANTÍA DE 10 AÑOS', W / 2, y + 8.5, { align: 'center' }); y += 16

  // ── Texto introductorio
  const intro = `THEIA Design and Co garantiza al cliente ${inst?.client || '_______________'} que los materiales instalados y la mano de obra ejecutada en el inmueble ubicado en ${inst?.address || '_______________'} cuentan con una garantía de DIEZ (10) AÑOS a partir de la fecha de instalación, sujeta a las condiciones y cláusulas detalladas a continuación.`
  const introLines = doc.splitTextToSize(intro, CW - 8)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(20, 20, 20)
  doc.text(introLines, M + 4, y, { maxWidth: CW - 8 }); y += introLines.length * 5.8 + 10

  // ── Cláusulas
  const clausulas = [
    {
      titulo: 'CLÁUSULA 1 — COBERTURA',
      texto: 'La presente garantía cubre defectos de fabricación y/o instalación de los materiales colocados por THEIA Design and Co, incluyendo: deck WPC, wall panels, revestimientos, perfiles, grampas y demás componentes instalados conforme a la orden de trabajo correspondiente.'
    },
    {
      titulo: 'CLÁUSULA 2 — VIGENCIA',
      texto: 'La garantía tiene una duración de DIEZ (10) años contados a partir de la fecha de instalación indicada en el conforme de obra firmado por ambas partes. Vencido dicho plazo, la garantía queda automáticamente extinguida sin necesidad de notificación.'
    },
    {
      titulo: 'CLÁUSULA 3 — CONDICIONES DE VALIDEZ',
      texto: 'La garantía es válida siempre que: (a) el cliente haya respetado las instrucciones de mantenimiento provistas por THEIA Design and Co; (b) los materiales no hayan sido objeto de modificaciones, reparaciones o intervenciones realizadas por terceros sin autorización escrita de THEIA Design and Co; (c) el pago total del servicio haya sido efectuado conforme a lo acordado.'
    },
    {
      titulo: 'CLÁUSULA 4 — EXCLUSIONES',
      texto: 'Quedan expresamente excluidos de esta garantía: (a) daños causados por uso inadecuado, negligencia, accidentes o fuerza mayor (inundaciones, terremotos, incendios, etc.); (b) desgaste normal por el paso del tiempo y uso habitual; (c) daños ocasionados por objetos cortantes, productos químicos agresivos o limpieza con elementos abrasivos; (d) deterioro por falta de mantenimiento preventivo; (e) daños causados por terceros ajenos a THEIA Design and Co.'
    },
    {
      titulo: 'CLÁUSULA 5 — PROCEDIMIENTO DE RECLAMO',
      texto: 'Para hacer efectiva la garantía, el cliente debe: (1) comunicar el defecto dentro de los treinta (30) días corridos de detectado, mediante correo electrónico a theiadesignandco@gmail.com; (2) indicar el número de instalación, descripción del defecto y adjuntar fotografías del problema; (3) permitir el acceso al inmueble para la inspección técnica por parte de THEIA Design and Co dentro de los quince (15) días hábiles de recibido el reclamo.'
    },
    {
      titulo: 'CLÁUSULA 6 — ALCANCE DE LA REPARACIÓN',
      texto: 'En caso de que el defecto esté cubierto por esta garantía, THEIA Design and Co procederá, a su exclusivo criterio, a: (a) reparar el material defectuoso; o (b) reemplazar el material afectado por uno de iguales o superiores características, sin cargo para el cliente. El alcance de la reparación se limita a la zona afectada, sin incluir modificaciones en áreas no comprometidas.'
    },
    {
      titulo: 'CLÁUSULA 7 — MANTENIMIENTO RECOMENDADO',
      texto: 'Para mantener la garantía vigente, se recomienda: limpieza periódica con agua y jabón neutro; evitar el contacto prolongado con agua estancada; inspección anual de fijaciones y perfiles; no aplicar pinturas, barnices ni productos no recomendados por el fabricante. THEIA Design and Co podrá solicitar evidencia del mantenimiento realizado como condición para la aplicación de la garantía.'
    },
    {
      titulo: 'CLÁUSULA 8 — LIMITACIÓN DE RESPONSABILIDAD',
      texto: 'La responsabilidad de THEIA Design and Co bajo esta garantía se limita estrictamente a la reparación o reposición del material defectuoso. En ningún caso THEIA Design and Co será responsable por daños indirectos, lucro cesante, perjuicios consecuentes o daños a terceros derivados del defecto cubierto. Esta garantía no reemplaza ni modifica los derechos del consumidor establecidos por la legislación argentina vigente.'
    },
  ]

  clausulas.forEach((cl, idx) => {
    const bodyLines = doc.splitTextToSize(cl.texto, CW - 8)
    const blockH = 7 + bodyLines.length * 5 + 8
    if (y + blockH > 278) { doc.addPage(); y = M }

    // Header cláusula
    doc.setFillColor(idx % 2 === 0 ? 240 : 232, idx % 2 === 0 ? 240 : 232, idx % 2 === 0 ? 240 : 232)
    doc.rect(M, y, CW, 7, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(20, 20, 20)
    doc.text(cl.titulo, M + 4, y + 5)

    // Body
    doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3); doc.rect(M, y + 7, CW, bodyLines.length * 5 + 8)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(30, 30, 30)
    doc.text(bodyLines, M + 4, y + 13, { maxWidth: CW - 8 })
    y += blockH + 3
  })

  // ── Firmas
  if (y + 40 > 278) { doc.addPage(); y = M }
  y += 8
  doc.setDrawColor(0); doc.setLineWidth(0.3); doc.line(M, y, W - M, y); y += 6
  const legal2 = 'La emisión del presente certificado implica la aceptación de todas las cláusulas precedentes por parte del cliente. Este documento tiene validez legal como constancia de garantía de obra.'
  const ll2 = doc.splitTextToSize(legal2, CW)
  doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(80, 80, 80)
  doc.text(ll2, M, y); y += ll2.length * 5 + 14

  const fw = 75
  doc.setDrawColor(0); doc.setLineWidth(0.5)
  doc.line(M, y, M + fw, y); doc.line(W - M - fw, y, W - M, y); y += 5
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(80, 80, 80)
  doc.text('FIRMA CLIENTE / RESPONSABLE', M, y); doc.text('THEIA DESIGN AND CO', W - M - fw, y)

  // Footer en todas las páginas
  const pp = doc.internal.getNumberOfPages()
  for (let p = 1; p <= pp; p++) {
    doc.setPage(p); doc.setDrawColor(0); doc.setLineWidth(0.4); doc.line(M, 283, W - M, 283)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(130, 130, 130)
    doc.text(`THEIA Design and Co · Certificado de Garantía 10 años · ${inst?.id || ''} · Pág. ${p}/${pp}`, W / 2, 289, { align: 'center' })
  }
  return doc.output('blob')
}

// ── INFORME SEMANAL PDF ───────────────────────────────────────────────────────
export const buildWeeklyPDF = async (data) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' }); const W = 210, M = 16, CW = W - M * 2

  // Header
  doc.setDrawColor(0); doc.setLineWidth(0.8); doc.line(M, 14, W - M, 14)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(0, 0, 0)
  doc.text('THEIA', M, 10)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(100, 100, 100)
  doc.text('INFORME SEMANAL DE OPERACIONES', W - M, 10, { align: 'right' })
  doc.text(fD(tod()), W - M, 6, { align: 'right' })

  let y = 28

  // ── Resumen financiero
  const totalVentas = data.sales.reduce((s, v) => s + (v.total || 0), 0)
  const totalSaldo  = data.sales.reduce((s, v) => s + (v.saldo || 0), 0)
  const totalAdelanto = data.sales.reduce((s, v) => s + (v.adelanto || 0), 0)

  doc.setFillColor(245, 166, 35); doc.rect(M, y, CW, 7, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(0, 0, 0)
  doc.text('RESUMEN FINANCIERO', M + 3, y + 5); y += 12

  const financials = [
    ['Total facturado', $(totalVentas)],
    ['Adelantos cobrados', $(totalAdelanto)],
    ['Saldo pendiente de cobro', $(totalSaldo)],
    ['Total de ventas', String(data.sales.length)],
  ]
  financials.forEach(([label, value]) => {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(50, 50, 50)
    doc.text(label, M + 3, y)
    doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 0, 0)
    doc.text(value, W - M - 3, y, { align: 'right' })
    y += 7
  }); y += 6

  // ── Cotizaciones
  doc.setFillColor(245, 166, 35); doc.rect(M, y, CW, 7, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(0, 0, 0)
  doc.text(`COTIZACIONES (${data.quotes.length})`, M + 3, y + 5); y += 10

  if (data.quotes.length) {
    // Cabecera tabla
    doc.setFillColor(230, 230, 230); doc.rect(M, y, CW, 6, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(80, 80, 80)
    doc.text('ID', M + 2, y + 4); doc.text('CLIENTE', M + 22, y + 4); doc.text('TOTAL', W - M - 40, y + 4); doc.text('ESTADO', W - M - 3, y + 4, { align: 'right' })
    y += 7
    data.quotes.slice(0, 15).forEach((q, i) => {
      const T = calc(q.items, q.discount || 0, q.includeIVA)
      if (i % 2 === 0) { doc.setFillColor(248, 248, 248); doc.rect(M, y - 1, CW, 6, 'F') }
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(0, 0, 0)
      doc.text(q.id, M + 2, y + 3)
      doc.text((q.client || '-').substring(0, 25), M + 22, y + 3)
      doc.text($(T.total), W - M - 40, y + 3)
      const statusMap = { draft: 'Borrador', sent: 'Enviado', confirmed: 'Confirmado' }
      doc.text(statusMap[q.status] || q.status, W - M - 3, y + 3, { align: 'right' })
      y += 6
    })
  } else {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(120, 120, 120)
    doc.text('Sin cotizaciones', M + 3, y + 4); y += 8
  }; y += 8

  // ── Instalaciones en curso
  const pendInst = data.installations.filter(i => i.status !== 'completed')
  doc.setFillColor(96, 165, 250); doc.rect(M, y, CW, 7, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(255, 255, 255)
  doc.text(`INSTALACIONES EN CURSO (${pendInst.length})`, M + 3, y + 5); y += 10

  if (pendInst.length) {
    pendInst.slice(0, 8).forEach((inst, i) => {
      if (i % 2 === 0) { doc.setFillColor(248, 248, 248); doc.rect(M, y - 1, CW, 6, 'F') }
      const done = inst.stages.filter(s => s.done).length
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(0, 0, 0)
      doc.text(inst.id, M + 2, y + 3)
      doc.text((inst.client || '-').substring(0, 20), M + 22, y + 3)
      doc.text(fD(inst.scheduledDate), M + 90, y + 3)
      doc.text(`${done}/${inst.stages.length} etapas`, W - M - 3, y + 3, { align: 'right' })
      y += 6
    })
  } else {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(120, 120, 120)
    doc.text('Sin instalaciones en curso', M + 3, y + 4); y += 8
  }; y += 8

  // ── Envíos pendientes
  const pendShip = data.shipments.filter(s => s.status !== 'delivered')
  doc.setFillColor(34, 197, 94); doc.rect(M, y, CW, 7, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(255, 255, 255)
  doc.text(`ENVÍOS PENDIENTES (${pendShip.length})`, M + 3, y + 5); y += 10

  if (pendShip.length) {
    pendShip.slice(0, 8).forEach((ship, i) => {
      if (i % 2 === 0) { doc.setFillColor(248, 248, 248); doc.rect(M, y - 1, CW, 6, 'F') }
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(0, 0, 0)
      doc.text(ship.id, M + 2, y + 3)
      doc.text((ship.client || '-').substring(0, 20), M + 22, y + 3)
      doc.text(fD(ship.scheduledDate), M + 90, y + 3)
      doc.text(ship.carrier || 'Sin transportista', W - M - 3, y + 3, { align: 'right' })
      y += 6
    })
  } else {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(120, 120, 120)
    doc.text('Sin envíos pendientes', M + 3, y + 4); y += 8
  }

  // Footer
  doc.setDrawColor(0); doc.setLineWidth(0.4); doc.line(M, 283, W - M, 283)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(130, 130, 130)
  doc.text(`THEIA Diseño & Construcción · Informe generado el ${fD(tod())}`, W / 2, 289, { align: 'center' })
  return doc.output('blob')
}
