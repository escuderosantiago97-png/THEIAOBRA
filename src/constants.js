export const IVA = 0.21
export const F = "'Outfit',sans-serif"

export const DOBS = `• Presupuesto válido por 7 días corridos desde la fecha de emisión.\n• Precios expresados en pesos argentinos. Tipo de cambio dólar oficial BNA a convenir.\n• Cualquier modificación deberá acordarse y documentarse por escrito.\n• El inicio de obra queda sujeto a confirmación por escrito y pago del anticipo acordado.`

export const DSPECS = `• Los trabajos se realizarán en días y horarios hábiles.\n• El cliente deberá facilitar acceso al espacio de trabajo con antelación mínima de 30 minutos.\n• Se incluye limpieza del área de trabajo al finalizar cada jornada.\n• Se garantizan los trabajos realizados por un período de 12 meses contra defectos de ejecución.`

export const STAGES = ['Visita previa', 'Preparación del espacio', 'Instalación', 'Prueba y ajustes', 'Entrega y conformidad']

export const ITYPE = { product: 'Producto', labor: 'Mano de obra', shipping: 'Envío' }

export const SC = {
  draft: '#666',
  sent: '#F5A623',
  confirmed: '#22C55E',
  scheduled: '#60A5FA',
  in_progress: '#F5A623',
  completed: '#22C55E',
  dispatched: '#F5A623',
  delivered: '#22C55E',
  active: '#60A5FA',
}

export const SL = {
  draft: 'Borrador',
  sent: 'Enviado',
  confirmed: 'Confirmado',
  scheduled: 'Agendado',
  in_progress: 'En curso',
  completed: 'Completado',
  dispatched: 'Despachado',
  delivered: 'Entregado',
  active: 'Activa',
}

export const E0 = {
  quotes: [],
  sales: [],
  installations: [],
  shipments: [],
  catalog: { labor: [], shipping: [] },
  settings: { defaultObservations: DOBS, defaultSpecifications: DSPECS },
}
