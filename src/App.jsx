import { useState, useEffect } from 'react'
import { sb } from './supabase'
import { F, E0 } from './constants'
import { loadAll } from './dataLayer'
import { useToast } from './components/ui'
import LoginScreen      from './components/LoginScreen'
import Dashboard        from './components/Dashboard'
import QuotesView       from './components/QuotesView'
import SalesView        from './components/SalesView'
import InstallationsView from './components/InstallationsView'
import ShipmentsView    from './components/ShipmentsView'
import CatalogView      from './components/CatalogView'
import SettingsView     from './components/SettingsView'

// ── LOADING ───────────────────────────────────────────────────────────────────
function Loading({ timeout }) {
  return (
    <div style={{ background: '#000', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
      <div style={{ color: '#F5A623', fontFamily: F, fontSize: '16px', fontWeight: 600 }}>Cargando...</div>
      {timeout && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#555', fontFamily: F, fontSize: '13px', marginBottom: '12px' }}>La conexión tardó demasiado.</div>
          <button onClick={() => window.location.reload()} style={{ background: '#F5A623', color: '#000', border: 'none', borderRadius: '10px', padding: '10px 20px', fontFamily: F, fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
            Reintentar
          </button>
        </div>
      )}
    </div>
  )
}

// ── APP ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser]       = useState(null)
  const [data, setData]       = useState(E0)
  const [tab, setTab]         = useState('dashboard')
  const [loading, setLoading] = useState(true)
  const [loadTimeout, setLoadTimeout] = useState(false)
  const { show: toast, ToastContainer } = useToast()

  useEffect(() => {
    // Timeout de seguridad: si en 12s no cargó, muestra botón de reintentar
    const fallback = setTimeout(() => {
      setLoading(false)
      setLoadTimeout(true)
    }, 12000)

    const { data: { subscription } } = sb.auth.onAuthStateChange(async (event, session) => {
      try {
        if (event === 'SIGNED_OUT') {
          setUser(null); setData(E0)
        } else if (session?.user && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'USER_UPDATED')) {
          setUser(session.user)
          // Timeout de 10s en loadAll para que no cuelgue si Supabase no responde
          const d = await Promise.race([
            loadAll(session.user.id),
            new Promise((_, rej) => setTimeout(() => rej(new Error('Tiempo de espera agotado. Verificá tu conexión.')), 10000))
          ])
          setData(d)
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          setUser(session.user)
        }
      } catch (e) {
        console.error('Auth/load error:', e)
      } finally {
        clearTimeout(fallback)
        setLoading(false)
      }
    })

    return () => { clearTimeout(fallback); subscription.unsubscribe() }
  }, [])

  const onAuth = async u => {
    setUser(u); setLoading(true)
    const d = await loadAll(u.id)
    setData(d); setLoading(false)
  }

  const onSignOut = async () => {
    await sb.auth.signOut()
    setUser(null); setData(E0)
  }

  if (loading)  return <Loading timeout={loadTimeout} />
  if (!user)    return <LoginScreen onAuth={onAuth} />

  // Nav items with live badges
  const nav = [
    { id: 'dashboard',     icon: '◈',  label: 'Dashboard' },
    { id: 'quotes',        icon: '📋', label: 'Cotizaciones', badge: data.quotes.filter(q => q.status !== 'confirmed').length },
    { id: 'sales',         icon: '💼', label: 'Ventas' },
    { id: 'installations', icon: '🔧', label: 'Instalaciones', badge: data.installations.filter(i => i.status !== 'completed').length },
    { id: 'shipments',     icon: '📦', label: 'Envíos', badge: data.shipments.filter(s => s.status !== 'delivered').length },
    { id: 'catalog',       icon: '📂', label: 'Catálogo' },
    { id: 'settings',      icon: '⚙️', label: 'Configuración' },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#000', fontFamily: F }}>
      {/* ── Sidebar ── */}
      <div style={{ width: '210px', background: '#000', borderRight: '1px solid #111', display: 'flex', flexDirection: 'column', flexShrink: 0, position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}>
        <div style={{ padding: '28px 20px 22px', borderBottom: '1px solid #111' }}>
          <div style={{ fontFamily: F, fontWeight: 900, fontSize: '28px', color: '#FFF', letterSpacing: '-1px' }}>THEIA</div>
          <div style={{ fontSize: '10px', color: '#F5A623', fontWeight: 700, marginTop: '2px', letterSpacing: '2.5px', textTransform: 'uppercase' }}>Operations</div>
        </div>

        <nav style={{ flex: 1, padding: '14px 10px' }}>
          {nav.map(item => (
            <button key={item.id} onClick={() => setTab(item.id)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '12px', marginBottom: '2px',
                background: tab === item.id ? '#F5A62314' : 'transparent',
                border: `1px solid ${tab === item.id ? '#F5A62330' : 'transparent'}`,
                color: tab === item.id ? '#F5A623' : '#555',
                cursor: 'pointer', textAlign: 'left', fontFamily: F, fontSize: '14px',
                fontWeight: tab === item.id ? 600 : 400, transition: 'all .15s' }}>
              <span style={{ fontSize: '16px' }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge > 0 && (
                <span style={{ background: '#F5A623', color: '#000', borderRadius: '10px', padding: '1px 7px', fontSize: '10px', fontWeight: 800 }}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div style={{ padding: '14px 20px', borderTop: '1px solid #111' }}>
          <div style={{ fontSize: '10px', color: '#333', fontFamily: F, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.email}
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div style={{ flex: 1, padding: '38px', overflowY: 'auto' }}>
        {tab === 'dashboard'     && <Dashboard data={data} onNav={setTab} />}
        {tab === 'quotes'        && <QuotesView data={data} setData={setData} userId={user.id} toast={toast} />}
        {tab === 'sales'         && <SalesView data={data} toast={toast} />}
        {tab === 'installations' && <InstallationsView data={data} setData={setData} userId={user.id} toast={toast} />}
        {tab === 'shipments'     && <ShipmentsView data={data} setData={setData} userId={user.id} toast={toast} />}
        {tab === 'catalog'       && <CatalogView data={data} setData={setData} userId={user.id} toast={toast} />}
        {tab === 'settings'      && <SettingsView data={data} setData={setData} userId={user.id} onSignOut={onSignOut} toast={toast} />}
      </div>

      <ToastContainer />
    </div>
  )
}
