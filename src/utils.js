import { IVA } from './constants'

export const nextNum = (list, prefix) => {
  if (!list || !list.length) return `${prefix}1`
  const nums = list.map(i => {
    const m = (i.id || '').match(/(\d+)$/)
    return m ? parseInt(m[1]) : 0
  })
  return `${prefix}${Math.max(...nums) + 1}`
}

export const $ = n =>
  `$ ${(+n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export const fD = d => (d ? new Date(d + 'T12:00:00').toLocaleDateString('es-AR') : '-')

export const tod = () => new Date().toISOString().split('T')[0]

export const todayFile = () => {
  const d = new Date()
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`
}

export const pdfName = (tipo, id, client) =>
  `${id}_${(client || '').replace(/\s+/g, '_')}_${todayFile()}_THEIA.pdf`

export const calc = (items = [], disc = 0, iva = true) => {
  const sub = items.reduce((s, i) => s + (i.subtotal || 0), 0)
  const da = +(sub * (disc / 100)).toFixed(2)
  const net = sub - da
  const ia = iva ? +(net * IVA).toFixed(2) : 0
  return { sub, da, net, ia, total: net + ia }
}

export const gcal = (title, date, time, desc, loc) => {
  const dt = date.replace(/-/g, '')
  const [h, m] = (time || '09:00').split(':')
  const eH = String(Math.min(parseInt(h) + 2, 23)).padStart(2, '0')
  window.open(
    `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${dt}T${h}${m}00/${dt}T${eH}${m}00&details=${encodeURIComponent(desc || '')}&location=${encodeURIComponent(loc || '')}`,
    '_blank'
  )
}
