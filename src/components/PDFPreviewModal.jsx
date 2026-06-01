import { useState, useEffect, useRef } from 'react'
import { F } from '../constants'

export default function PDFPreviewModal({ buildFn, filename, onClose }) {
  const [url, setUrl]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)
  const iframeRef           = useRef(null)
  const urlRef              = useRef(null)

  useEffect(() => {
    buildFn()
      .then(blob => {
        const u = URL.createObjectURL(blob)
        urlRef.current = u
        setUrl(u)
        setLoading(false)
      })
      .catch(e => { setError(e.message); setLoading(false) })
    return () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current) }
  }, [])

  const save = () => {
    if (!url) return
    if (window.showSaveFilePicker) {
      fetch(url).then(r => r.blob()).then(async blob => {
        try {
          const fh = await window.showSaveFilePicker({ suggestedName: filename, types: [{ description: 'PDF', accept: { 'application/pdf': ['.pdf'] } }] })
          const ws = await fh.createWritable()
          await ws.write(blob); await ws.close()
        } catch (e) { if (e.name !== 'AbortError') { const a = document.createElement('a'); a.href = url; a.download = filename; a.click() } }
      })
    } else {
      const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
    }
  }

  const print = () => {
    if (iframeRef.current) {
      iframeRef.current.contentWindow?.focus()
      iframeRef.current.contentWindow?.print()
    } else if (url) {
      window.open(url, '_blank')
    }
  }

  const btn = (label, onClick, bg = '#1A1A1A', color = '#FFF', accent = false) => (
    <button onClick={onClick} style={{
      background: accent ? '#F5A623' : bg, color: accent ? '#000' : color,
      border: 'none', borderRadius: '8px', padding: '9px 18px',
      fontFamily: F, fontSize: '13px', fontWeight: 700, cursor: 'pointer',
      transition: 'opacity .15s',
    }}>{label}</button>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 10000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#0D0D0D', border: '1px solid #2a2a2a', borderRadius: '16px', width: 'min(92vw, 900px)', height: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* ── Top bar */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #1A1A1A', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <span style={{ color: '#888', fontFamily: F, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.6px' }}>Vista previa</span>
            <div style={{ color: '#FFF', fontFamily: F, fontSize: '14px', fontWeight: 700, marginTop: '2px' }}>{filename}</div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {url && <>
              {btn('🖨️ Imprimir', print)}
              {btn('💾 Guardar PDF', save, '#F5A623', '#000', true)}
            </>}
            {btn('✕ Cerrar', onClose, 'transparent', '#666')}
          </div>
        </div>

        {/* ── Preview area */}
        <div style={{ flex: 1, background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {loading && (
            <div style={{ color: '#555', fontFamily: F, fontSize: '14px' }}>Generando PDF…</div>
          )}
          {error && (
            <div style={{ color: '#F87171', fontFamily: F, fontSize: '13px', textAlign: 'center', padding: '20px' }}>
              Error al generar el PDF:<br />{error}
            </div>
          )}
          {url && (
            <iframe
              ref={iframeRef}
              src={url}
              style={{ width: '100%', height: '100%', border: 'none' }}
              title="Vista previa PDF"
            />
          )}
        </div>
      </div>
    </div>
  )
}
