// ── FROM DB → APP ─────────────────────────────────────────────────────────────
export const mQ = r => ({
  id: r.id, date: r.date, client: r.client, clientAddress: r.client_address,
  clientPhone: r.client_phone, items: r.items || [], discount: r.discount || 0,
  includeIVA: r.include_iva, observations: r.observations, specifications: r.specifications,
  status: r.status, ctfOrderId: r.ctf_order_id,
})

export const mS = r => ({
  id: r.id, quoteId: r.quote_id, ctfOrderId: r.ctf_order_id, client: r.client,
  date: r.date, installationId: r.installation_id, shipmentId: r.shipment_id,
  total: r.total, adelanto: r.adelanto || 0, saldo: r.saldo || 0,
  status: r.status, quoteRef: r.quote_ref,
})

export const mI = r => ({
  id: r.id, saleId: r.sale_id, ctfOrderId: r.ctf_order_id, client: r.client,
  address: r.address, technicianName: r.technician_name, scheduledDate: r.scheduled_date,
  scheduledTime: r.scheduled_time, status: r.status, stages: r.stages || [],
  materials: r.materials || [], compras: r.compras || [], notes: r.notes,
  photos: r.photos || [], conformidadUploaded: r.conformidad_uploaded,
  conformidadPhoto: r.conformidad_photo,
})

export const mSh = r => ({
  id: r.id, saleId: r.sale_id, ctfOrderId: r.ctf_order_id, client: r.client,
  address: r.address, scheduledDate: r.scheduled_date, carrier: r.carrier,
  trackingNumber: r.tracking_number || '', status: r.status, notes: r.notes,
})

export const mC = r => ({ id: r.id, type: r.type, name: r.name, unitPrice: r.unit_price })

// ── FROM APP → DB ─────────────────────────────────────────────────────────────
export const dQ = (q, u) => ({
  id: q.id, user_id: u, date: q.date, client: q.client,
  client_address: q.clientAddress, client_phone: q.clientPhone,
  items: q.items, discount: q.discount, include_iva: q.includeIVA,
  observations: q.observations, specifications: q.specifications,
  status: q.status, ctf_order_id: q.ctfOrderId,
})

export const dS = (s, u) => ({
  id: s.id, user_id: u, quote_id: s.quoteId, ctf_order_id: s.ctfOrderId,
  client: s.client, date: s.date, installation_id: s.installationId,
  shipment_id: s.shipmentId, total: s.total, adelanto: s.adelanto || 0,
  saldo: s.saldo || 0, status: s.status, quote_ref: s.quoteRef,
})

export const dI = (i, u) => ({
  id: i.id, user_id: u, sale_id: i.saleId, ctf_order_id: i.ctfOrderId,
  client: i.client, address: i.address, technician_name: i.technicianName,
  scheduled_date: i.scheduledDate, scheduled_time: i.scheduledTime,
  status: i.status, stages: i.stages, materials: i.materials,
  compras: i.compras || [], notes: i.notes, photos: i.photos,
  conformidad_uploaded: i.conformidadUploaded, conformidad_photo: i.conformidadPhoto,
})

export const dSh = (s, u) => ({
  id: s.id, user_id: u, sale_id: s.saleId, ctf_order_id: s.ctfOrderId,
  client: s.client, address: s.address, scheduled_date: s.scheduledDate,
  carrier: s.carrier, tracking_number: s.trackingNumber, status: s.status, notes: s.notes,
})

export const dC = (c, u) => ({ id: c.id, user_id: u, type: c.type, name: c.name, unit_price: c.unitPrice })
