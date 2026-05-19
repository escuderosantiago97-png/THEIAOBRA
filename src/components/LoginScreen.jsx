import { useState } from 'react'
import { sb } from '../supabase'
import { F } from '../constants'
import { Field } from './ui'

export default function LoginScreen({ onAuth }) {
  const [mode, setMode]       = useState('login')   // 'login' | 'signup' | 'recover'
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')

  const switchMode = m => { setMode(m); setError(''); setSuccess('') }

  const handle = async () => {
    setError(''); setSuccess('')

    if (mode === 'recover') {
      if (!email) { setError('Ingresá tu email'); return }
      setLoading(true)
      const { error: e } = await sb.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      })
      setLoading(false)
      if (e) setError(e.message)
      else setSuccess('Te enviamos un email para restablecer tu contraseña.')
      return
    }

    if (!email || !password) { setError('Completá email y contraseña'); return }
    setLoading(true)
    try {
      if (mode === 'login') {
        const res = await sb.auth.signInWithPassword({ email, password })
        if (res.error) throw res.error
        onAuth(res.data.user)
      } else {
        const res = await sb.auth.signUp({ email, password })
        if (res.error) throw res.error
        setSuccess('¡Cuenta creada! Iniciá sesión.'); switchMode('login')
      }
    } catch (e) {
      setError(
        e.message === 'Invalid login credentials' ? 'Email o contraseña incorrectos' :
        e.message === 'User already registered' ? 'Ese email ya tiene una cuenta. Iniciá sesión.' :
        e.message
      )
    }
    setLoading(false)
  }

  const onKey = e => e.key === 'Enter' && handle()

  return (
    <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ fontFamily: F, fontWeight: 900, fontSize: '42px', color: '#FFF', letterSpacing: '-2px' }}>THEIA</div>
          <div style={{ fontSize: '12px', color: '#F5A623', fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', marginTop: '4px' }}>Operations</div>
        </div>

        <div style={{ background: '#0D0D0D', border: '1px solid #1A1A1A', borderRadius: '16px', padding: '32px' }}>

          {mode !== 'recover' && (
            <div style={{ display: 'flex', gap: '4px', background: '#000', borderRadius: '10px', padding: '4px', marginBottom: '28px' }}>
              {[['login', 'Iniciar sesión'], ['signup', 'Crear cuenta']].map(([m, l]) => (
                <button key={m} onClick={() => switchMode(m)}
                  style={{ flex: 1, padding: '9px', borderRadius: '8px', border: 'none',
                    background: mode === m ? '#F5A623' : 'transparent',
                    color: mode === m ? '#000' : '#555',
                    fontFamily: F, fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all .15s' }}>
                  {l}
                </button>
              ))}
            </div>
          )}

          {mode === 'recover' && (
            <div style={{ marginBottom: '22px' }}>
              <div style={{ color: '#FFF', fontFamily: F, fontWeight: 700, fontSize: '18px', marginBottom: '6px' }}>Recuperar cuenta</div>
              <div style={{ color: '#555', fontFamily: F, fontSize: '13px' }}>Te enviamos un link para resetear tu contraseña.</div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Field label="Email" value={email} onChange={setEmail} type="email" placeholder="tu@email.com" onKeyDown={onKey} />
            {mode !== 'recover' && (
              <Field label="Contraseña" value={password} onChange={setPassword} type="password" placeholder="••••••••" onKeyDown={onKey} />
            )}
          </div>

          {error && (
            <div style={{ marginTop: '14px', background: '#F8717112', border: '1px solid #F8717140', borderRadius: '10px', padding: '10px', color: '#F87171', fontSize: '13px', fontFamily: F }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ marginTop: '14px', background: '#22C55E12', border: '1px solid #22C55E40', borderRadius: '10px', padding: '10px', color: '#22C55E', fontSize: '13px', fontFamily: F }}>
              {success}
            </div>
          )}

          <button onClick={handle} disabled={loading}
            style={{ width: '100%', marginTop: '20px', padding: '13px', background: '#F5A623', color: '#000',
              border: 'none', borderRadius: '10px', fontFamily: F, fontSize: '15px', fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
            {loading ? '...' : mode === 'login' ? 'Entrar' : mode === 'signup' ? 'Crear cuenta' : 'Enviar email'}
          </button>

          {/* Forgot password / back links */}
          <div style={{ marginTop: '18px', textAlign: 'center' }}>
            {mode === 'login' && (
              <button onClick={() => switchMode('recover')}
                style={{ background: 'none', border: 'none', color: '#444', fontFamily: F, fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}>
                Olvidé mi contraseña
              </button>
            )}
            {mode === 'recover' && (
              <button onClick={() => switchMode('login')}
                style={{ background: 'none', border: 'none', color: '#444', fontFamily: F, fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}>
                ← Volver al inicio de sesión
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
