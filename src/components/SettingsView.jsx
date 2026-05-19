import { useState } from 'react'
import { sb } from '../supabase'
import { F } from '../constants'
import { Card, Textarea, Btn, Modal } from './ui'

export default function SettingsView({ data, setData, userId, onSignOut, toast }) {
  const [obs, setObs]     = useState(data.settings.defaultObservations)
  const [specs, setSpecs] = useState(data.settings.defaultSpecifications)
  const [saving, setSaving] = useState(false)
  const [showDel, setShowDel] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const save = async () => {
    if (saving) return
    setSaving(true)
    try {
      const { error } = await sb.from('user_settings').upsert(
        { user_id: userId, default_observations: obs, default_specifications: specs },
        { onConflict: 'user_id' }
      )
      if (error) throw new Error(error.message)
      setData({ ...data, settings: { defaultObservations: obs, defaultSpecifications: specs } })
      toast('Configuración guardada')
    } catch (e) {
      console.error('settings save error:', e)
      toast('Error al guardar: ' + e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const deleteAccount = async () => {
    setDeleting(true)
    try {
      const { error } = await sb.rpc('delete_own_account')
      if (error) throw error
      await sb.auth.signOut()
      onSignOut()
    } catch (e) {
      toast('Error al eliminar cuenta: ' + e.message, 'error')
      setDeleting(false)
      setShowDel(false)
    }
  }

  return (
    <div>
      <h2 style={{ color: '#FFF', fontFamily: F, margin: '0 0 8px', fontSize: '26px', fontWeight: 800 }}>Configuración</h2>
      <p style={{ color: '#444', fontFamily: F, margin: '0 0 24px', fontSize: '14px' }}>
        Textos pre-cargados en cada nueva cotización.
      </p>

      <Card style={{ marginBottom: '14px' }}>
        <Textarea label="Observaciones por defecto" value={obs} onChange={setObs} rows={7} />
      </Card>
      <Card style={{ marginBottom: '24px' }}>
        <Textarea label="Especificaciones por defecto" value={specs} onChange={setSpecs} rows={7} />
      </Card>

      <div style={{ background: '#1A1A1A', border: '1px solid #222', borderRadius: '12px', padding: '14px 18px', marginBottom: '24px' }}>
        <div style={{ color: '#555', fontSize: '12px', fontFamily: F, lineHeight: 1.8 }}>
          <strong style={{ color: '#888' }}>💾 Guardar PDFs en carpeta específica</strong><br />
          En Chrome: Configuración → Descargas → activar <em>"Preguntar dónde guardar cada archivo"</em>.<br />
          Al tocar cualquier botón PDF, el sistema te va a pedir la carpeta antes de guardar.
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Btn onClick={onSignOut} variant="danger">Cerrar sesión</Btn>
          <Btn onClick={() => setShowDel(true)} variant="danger">Eliminar cuenta</Btn>
        </div>
        <Btn onClick={save} size="lg" disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar'}
        </Btn>
      </div>

      {showDel && (
        <Modal onClose={() => !deleting && setShowDel(false)} title="⚠ Eliminar cuenta">
          <p style={{ color: '#CCC', fontFamily: F, fontSize: '14px', margin: '0 0 8px' }}>
            Esta acción es <strong style={{ color: '#F87171' }}>irreversible</strong>. Se borrarán tu cuenta y todos tus datos.
          </p>
          <p style={{ color: '#555', fontFamily: F, fontSize: '13px', margin: '0 0 24px' }}>
            ¿Estás seguro?
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <Btn onClick={() => setShowDel(false)} variant="ghost" disabled={deleting}>Cancelar</Btn>
            <Btn onClick={deleteAccount} variant="danger" disabled={deleting}>
              {deleting ? 'Eliminando...' : 'Sí, eliminar todo'}
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
