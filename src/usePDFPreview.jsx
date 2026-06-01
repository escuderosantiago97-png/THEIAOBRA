import { useState } from 'react'
import PDFPreviewModal from './components/PDFPreviewModal'

// Hook: devuelve { previewEl, openPreview }
// openPreview(buildFn, filename) → abre el modal de vista previa
export function usePDFPreview() {
  const [preview, setPreview] = useState(null)

  const openPreview = (buildFn, filename) => setPreview({ buildFn, filename })
  const closePreview = () => setPreview(null)

  const previewEl = preview
    ? <PDFPreviewModal buildFn={preview.buildFn} filename={preview.filename} onClose={closePreview} />
    : null

  return { previewEl, openPreview }
}
