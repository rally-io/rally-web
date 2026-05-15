import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus'
import { ProfileRing } from './ProfileRing'
import { cn } from '@/lib/utils'

export function Navbar() {
  const { t } = useTranslation()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { data: status } = useOnboardingStatus()

  const navLinks = [
    { to: '/', label: t('nav.app') || 'בית' },
    { to: '/clubs', label: t('nav.clubs') || 'מועדונים' },
    { to: '/tournaments', label: t('nav.tournaments') || 'טורנירים' },
    { to: '/crm', label: t('nav.crm') || 'מערכת למועדונים' },
    { to: '/level', label: t('nav.level') || 'שיטת דירוג' },
    { to: '/pricing', label: t('nav.pricing') || 'תמחור' },
    { to: '/contact', label: t('nav.contact') || 'צור קשר' },
  ]

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        <Link to="/" className="text-xl font-bold text-electric-green">
          Rally
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                'text-sm transition-colors hover:text-electric-green',
                location.pathname === link.to ? 'text-electric-green' : 'text-slate-300',
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {status?.is_authenticated ? (
            <ProfileRing />
          ) : (
            <Link
              to="/contact"
              className="text-sm text-slate-300 hover:text-electric-green transition-colors"
            >
              {t('nav.signin') || 'התחבר'}
            </Link>
          )}

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 text-slate-300 hover:text-electric-green"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <nav className="md:hidden border-t border-slate-800 bg-slate-950 px-4 py-4 flex flex-col gap-3">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'text-sm transition-colors hover:text-electric-green',
                location.pathname === link.to ? 'text-electric-green' : 'text-slate-300',
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  )
}