import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Menu,
  X,
  LogOut,
  Activity,
  Wallet,
  UserCog,
  SlidersHorizontal,
  Gift,
  Settings,
  CircleUserRound,
  Medal,
  ChevronDown,
  Home,
  Trophy,
  LayoutDashboard,
  Mail,
  type LucideIcon,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useAppSession } from '@/hooks/useAppSession'
import { ProfileRing } from './ProfileRing'
import { Logo } from '@/components/ui/Logo'
import { cn } from '@/lib/utils'

type SkillTier = 'bronze' | 'silver' | 'gold'

const TIER_COLOR_CLASS: Record<SkillTier, string> = {
  bronze: 'bg-amber-700',
  silver: 'bg-slate-400',
  gold: 'bg-yellow-500',
}

function getInitials(name: string, email: string | null | undefined): string {
  const trimmed = name.trim()
  if (trimmed) {
    const parts = trimmed.split(/\s+/)
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0][0].toUpperCase()
  }
  return email ? email[0].toUpperCase() : '?'
}

export function Navbar() {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()

  const toggleLanguage = () => {
    const next = i18n.language === 'he' ? 'en' : 'he'
    void i18n.changeLanguage(next)
    try {
      localStorage.setItem('rallyLang', next)
    } catch {
      // localStorage may be unavailable (private mode, SSR) — non-fatal
    }
  }
  const isHebrew = i18n.language === 'he'
  const currentFlag = isHebrew ? '🇮🇱' : '🇺🇸'
  const otherFlag = isHebrew ? '🇺🇸' : '🇮🇱'
  const otherLangLabel = isHebrew ? 'English' : 'עברית'
  const [mobileOpen, setMobileOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const { session, signOut, user } = useAuth()
  const { status, onboardingStatus, playerProfile, ensurePlayerProfile, clearSession } = useAppSession()
  const isSignedIn = !!session

  const navLinks: { to: string; label: string; icon: LucideIcon }[] = [
    { to: '/', label: t('nav.app'), icon: Home },
    { to: '/tournaments', label: t('nav.tournaments'), icon: Trophy },
    { to: '/crm', label: t('nav.crm'), icon: LayoutDashboard },
    { to: '/contact', label: t('nav.contact'), icon: Mail },
  ]

  // Mirrors the mobile drawer (AppDrawerItems). Items without a web route are
  // marked `comingSoon` — they render disabled with a "Soon" badge until the
  // corresponding pages exist on the website.
  const personalActions: {
    key: string
    to: string | null
    label: string
    icon: LucideIcon
    comingSoon?: boolean
  }[] = [
    { key: 'my_activity', to: '/my-activity', label: t('user_menu.my_activity'), icon: Activity },
    { key: 'edit_profile', to: '/profile/edit', label: t('user_menu.edit_profile'), icon: UserCog },
    { key: 'my_wallet', to: null, label: t('user_menu.my_wallet'), icon: Wallet, comingSoon: true },
    { key: 'player_preferences', to: null, label: t('user_menu.player_preferences'), icon: SlidersHorizontal, comingSoon: true },
    { key: 'refer_and_earn', to: null, label: t('user_menu.refer_and_earn'), icon: Gift, comingSoon: true },
    { key: 'settings', to: null, label: t('user_menu.settings'), icon: Settings, comingSoon: true },
  ]

  const handleSignOut = async () => {
    setMenuOpen(false)
    setMobileOpen(false)
    try {
      clearSession()
      await signOut()
    } catch (err) {
      console.error('[Navbar] Sign out failed:', err)
    }
    // Navigate unconditionally — if sign-out failed the user is still shown the
    // home page (signed-in state) which is less confusing than being stuck.
    navigate('/')
  }

  const handleMenuNavigate = (to: string) => {
    setMenuOpen(false)
    navigate(to)
  }

  const handleCompleteProfile = async () => {
    setMenuOpen(false)
    try {
      await ensurePlayerProfile()
    } catch {
      // USER_CANCELLED / SIGNED_OUT / PROFILE_ERROR — modal handles its own UX.
    }
  }

  const profileIncomplete = onboardingStatus && !onboardingStatus.has_player_profile

  const meta = (user?.user_metadata ?? {}) as Record<string, string>
  const profileName = `${playerProfile?.first_name ?? ''} ${playerProfile?.last_name ?? ''}`.trim()
  const metaName = (meta.full_name ?? meta.name ?? `${meta.first_name ?? ''} ${meta.last_name ?? ''}`).trim()
  const displayName = profileName || metaName || user?.email || ''
  const initials = getInitials(displayName, user?.email ?? null)
  const skillTier = (playerProfile?.skill_tier ?? null) as SkillTier | null
  const skillLevel = playerProfile?.skill_level ?? null
  const avatarBg = skillTier ? TIER_COLOR_CLASS[skillTier] : 'bg-electric-green/20'
  const avatarTextColor = skillTier ? 'text-slate-900' : 'text-electric-green'

  const isActiveRoute = (to: string) => {
    const [path] = to.split('?')
    return location.pathname === path
  }

  const loginHref = useMemo(() => {
    const here = location.pathname + location.search
    if (here.startsWith('/login') || here.startsWith('/auth/')) return '/login'
    return `/login?next=${encodeURIComponent(here)}`
  }, [location.pathname, location.search])

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-rally-bg/80 backdrop-blur-xl shadow-[0_1px_0_0_rgba(255,255,255,0.04)]">
      <div className="container mx-auto flex items-center justify-between px-4 py-4 md:py-5 rtl:max-md:flex-row-reverse">
        <Link to="/" className="flex-shrink-0">
          <Logo size="md" showText={true} />
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.to
            return (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  'relative font-display font-semibold text-base px-4 py-2.5 rounded-lg transition-all duration-200',
                  isActive
                    ? 'text-rally-accent'
                    : 'text-rally-text-2 hover:text-rally-text hover:bg-white/5',
                )}
              >
                {link.label}
                {isActive && (
                  <span
                    aria-hidden
                    className="absolute bottom-1 left-3 right-3 h-[3px] bg-rally-accent rounded-full shadow-glow-electric"
                  />
                )}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden md:block relative">
            <button
              onClick={() => setLangOpen((o) => !o)}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3.5 py-2 hover:border-rally-accent/40 hover:bg-white/5 transition-colors"
              aria-label="Change language"
              aria-expanded={langOpen}
            >
              <span className="text-lg leading-none">{currentFlag}</span>
              <ChevronDown
                size={16}
                className={cn(
                  'text-rally-text-muted transition-transform',
                  langOpen && 'rotate-180',
                )}
              />
            </button>
            {langOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setLangOpen(false)}
                />
                <div className="absolute end-0 mt-2 w-44 rounded-xl border border-white/10 bg-rally-surface shadow-2xl z-50 overflow-hidden">
                  <button
                    onClick={() => {
                      toggleLanguage()
                      setLangOpen(false)
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-rally-text hover:bg-white/5 transition-colors"
                  >
                    <span className="text-lg leading-none">{otherFlag}</span>
                    <span className="flex-1 text-start font-medium">{otherLangLabel}</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {isSignedIn && status !== 'loading' ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2 rounded-full hover:ring-2 hover:ring-electric-green/40 transition-all"
                aria-label="User menu"
              >
                <ProfileRing />
              </button>

              {menuOpen && (
                <>
                  {/* backdrop */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute end-0 mt-2 w-72 max-h-[80vh] overflow-y-auto rounded-xl border border-white/10 bg-slate-900 shadow-2xl z-50">
                    {/* Header — mirrors AppDrawerHeader */}
                    <div className="px-4 py-3 border-b border-white/10 bg-slate-800/60">
                      <div className="flex items-center gap-3">
                        <div className={cn('w-11 h-11 rounded-full overflow-hidden flex items-center justify-center', avatarBg)}>
                          {playerProfile?.avatar_url ? (
                            <img src={playerProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className={cn('text-sm font-semibold leading-none select-none', avatarTextColor)}>{initials}</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-100 truncate">{displayName}</p>
                          {skillTier && (
                            <span
                              className={cn(
                                'mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold text-slate-900',
                                TIER_COLOR_CLASS[skillTier],
                              )}
                            >
                              <Medal size={11} />
                              {`${skillTier.toUpperCase()}${skillLevel != null ? ` · ${skillLevel}` : ''}`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Profile completion (if applicable) */}
                    {profileIncomplete && (
                      <div className="p-1.5 border-b border-white/10">
                        <button
                          onClick={handleCompleteProfile}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-electric-green hover:bg-electric-green/10 rounded-lg transition-colors"
                        >
                          <CircleUserRound size={16} />
                          {t('user_menu.complete_profile')}
                        </button>
                      </div>
                    )}

                    {/* Personal actions — mirrors mobile drawer */}
                    <div className="p-1.5">
                      {personalActions.map((action) => {
                        const Icon = action.icon
                        const active = action.to ? isActiveRoute(action.to) : false
                        const disabled = action.comingSoon === true || action.to === null
                        const base = 'w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-colors'
                        const stateClasses = active
                          ? 'text-rally-accent bg-rally-accent/10 hover:bg-rally-accent/20'
                          : disabled
                            ? 'text-slate-500 cursor-not-allowed hover:bg-white/5'
                            : 'text-slate-200 hover:text-rally-accent hover:bg-rally-accent/15'
                        return (
                          <button
                            key={action.key}
                            onClick={() => action.to && !disabled && handleMenuNavigate(action.to)}
                            disabled={disabled}
                            className={`${base} ${stateClasses}`}
                          >
                            <Icon size={16} className={active ? '' : disabled ? 'text-slate-600' : 'text-slate-400'} />
                            <span className="flex-1 text-start">{action.label}</span>
                            {action.comingSoon && (
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 bg-slate-800/80 rounded-full px-2 py-0.5">
                                {t('user_menu.coming_soon')}
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>

                    {/* Sign out */}
                    <div className="p-1.5 border-t border-white/10">
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <LogOut size={16} />
                        {t('user_menu.sign_out')}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link
              to={loginHref}
              className="text-sm text-slate-300 hover:text-electric-green transition-colors"
            >
              {t('nav.signin')}
            </Link>
          )}

          <button
            className="md:hidden p-2.5 rounded-lg border border-white/10 text-rally-text-2 hover:text-rally-accent hover:border-rally-accent/40 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="md:hidden border-t border-white/10 bg-rally-bg px-4 py-4 flex flex-col gap-1">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.to
            const Icon = link.icon
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl font-display font-semibold text-base transition-colors min-h-[48px]',
                  isActive
                    ? 'bg-rally-accent/10 text-rally-accent border border-rally-accent/30'
                    : 'text-rally-text-2 hover:text-rally-text hover:bg-white/5 border border-transparent',
                )}
              >
                <Icon size={20} className={isActive ? 'text-rally-accent' : 'text-rally-text-muted'} />
                <span>{link.label}</span>
              </Link>
            )
          })}
          {isSignedIn ? (
            <>
              <div className="h-px bg-slate-800 my-1" />
              {profileIncomplete && (
                <button
                  onClick={() => {
                    setMobileOpen(false)
                    void handleCompleteProfile()
                  }}
                  className="text-start text-sm text-electric-green hover:text-electric-green/80 transition-colors"
                >
                  {t('user_menu.complete_profile')}
                </button>
              )}
              {personalActions.map((action) => {
                const disabled = action.comingSoon === true || action.to === null
                if (disabled) {
                  return (
                    <div
                      key={action.key}
                      className="flex items-center justify-between text-sm text-slate-500"
                    >
                      <span>{action.label}</span>
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 bg-slate-800/80 rounded-full px-2 py-0.5">
                        {t('user_menu.coming_soon')}
                      </span>
                    </div>
                  )
                }
                return (
                  <Link
                    key={action.key}
                    to={action.to!}
                    onClick={() => setMobileOpen(false)}
                    className="text-sm text-slate-300 hover:text-electric-green transition-colors"
                  >
                    {action.label}
                  </Link>
                )
              })}
              <div className="h-px bg-slate-800 my-1" />
              <button
                onClick={handleSignOut}
                className="text-start text-sm text-red-400 hover:text-red-300 transition-colors"
              >
                {t('user_menu.sign_out')}
              </button>
            </>
          ) : (
            <Link
              to={loginHref}
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-center gap-3 mt-2 px-4 py-3 rounded-xl bg-rally-accent text-rally-accent-text font-display font-bold text-base shadow-glow-electric hover:bg-rally-accent-hover transition-colors min-h-[48px]"
            >
              <CircleUserRound size={20} />
              <span>{t('nav.signin')}</span>
            </Link>
          )}
          <div className="h-px bg-white/10 my-2" />
          <button
            onClick={() => {
              toggleLanguage()
              setMobileOpen(false)
            }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium text-rally-text-2 hover:text-rally-text hover:bg-white/5 transition-colors min-h-[48px]"
            aria-label="Change language"
          >
            <span className="text-xl leading-none">{otherFlag}</span>
            <span>{otherLangLabel}</span>
          </button>
        </nav>
      )}
    </header>
  )
}
