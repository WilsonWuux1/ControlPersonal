import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Menu, Plus, RefreshCw, X } from 'lucide-react'
import { useState } from 'react'
import { navItems } from '../routes/navigation'
import { Button } from '../components/Button'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { QuickActionModal } from '../components/QuickActionModal'
import { useAppStore } from '../stores/appStore'
import { daysSince } from '../utils/date'

export function AppLayout() {
  const [quickOpen, setQuickOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const online = useOnlineStatus()
  const location = useLocation()
  const settings = useAppStore((state) => state.data?.settings)
  const backupAge = daysSince(settings?.lastBackupAt)

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span>CP</span>
          <div>
            <strong>Control Personal</strong>
            <small>Local y offline</small>
          </div>
        </div>
        <nav aria-label="Navegacion principal">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? 'active' : undefined)} end={item.to === '/'}>
                <Icon width={20} height={20} />
                {item.label}
              </NavLink>
            )
          })}
        </nav>
      </aside>
      <main className="workspace">
        <header className="topbar">
          <div>
            <p>{online ? 'En linea' : 'Modo offline'}</p>
            <h1>{navItems.find((item) => item.to === location.pathname)?.label ?? 'Control Personal'}</h1>
          </div>
          <div className="topbar-actions">
            {backupAge !== null && backupAge >= 7 ? (
              <span className="backup-reminder">
                <RefreshCw size={16} />
                Respaldo pendiente
              </span>
            ) : null}
            <Button aria-label="Nuevo" onClick={() => setQuickOpen(true)} icon={<Plus size={18} />}>
              Nuevo
            </Button>
          </div>
        </header>
        <Outlet />
      </main>
      {mobileMenuOpen ? (
        <div className="mobile-more-menu">
          {navItems.slice(5).map((item) => {
            const Icon = item.icon
            return (
              <NavLink key={item.to} to={item.to} onClick={() => setMobileMenuOpen(false)}>
                <Icon width={20} height={20} />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </div>
      ) : null}
      <nav className="bottom-nav" aria-label="Navegacion movil">
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon
          return (
            <NavLink key={item.to} to={item.to} end={item.to === '/'}>
              <Icon width={20} height={20} />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
        <button type="button" className={mobileMenuOpen ? 'active' : undefined} onClick={() => setMobileMenuOpen((open) => !open)}>
          {mobileMenuOpen ? <X width={20} height={20} /> : <Menu width={20} height={20} />}
          <span>Mas</span>
        </button>
      </nav>
      <QuickActionModal open={quickOpen} onClose={() => setQuickOpen(false)} />
    </div>
  )
}
