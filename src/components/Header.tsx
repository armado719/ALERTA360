import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Bell, Settings, LogOut, User, Globe2, MapPin } from 'lucide-react'
import { AuthUser } from '../services/api'

interface HeaderProps {
  user: AuthUser | null
  demo?: boolean
  onAuthClick: () => void
  onLogout: () => void
  /** Alertas sin leer (badge de la campana). */
  unread?: number
  onNotificationsClick?: () => void
  notificationsOpen?: boolean
  onLocationClick?: () => void
  locationsCount?: number
  onSettingsClick?: () => void
}

export default function Header({
  user,
  demo = false,
  onAuthClick,
  onLogout,
  unread = 0,
  onNotificationsClick,
  notificationsOpen = false,
  onLocationClick,
  locationsCount = 0,
  onSettingsClick,
}: HeaderProps) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const timeStr = now.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const dateStr = now.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  return (
    <motion.header
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="relative z-30 flex items-center justify-between gap-3 px-3 sm:px-5 py-2.5 sm:py-3
                 bg-[#15202d]/85 backdrop-blur-xl border-b border-white/[0.06]"
    >
      {/* ---------- Marca ---------- */}
      <div className="flex items-center gap-3 min-w-0">
        <motion.div
          className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0
                     bg-gradient-to-br from-[#8b5cf6] via-[#6366f1] to-[#22d3ee]
                     shadow-[0_0_22px_rgba(139,92,246,.45)]"
          whileHover={{ rotate: 6, scale: 1.05 }}
          transition={{ type: 'spring', stiffness: 400 }}
        >
          <Globe2 className="w-5 h-5 text-white/95" strokeWidth={2.1} />
        </motion.div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-[17px] sm:text-[22px] leading-none font-extrabold tracking-[0.02em]
                           text-transparent bg-clip-text bg-gradient-to-r from-[#38e8ff] via-[#7dd3fc] to-[#a78bfa]">
              ALERTA360
            </h1>
            {demo && (
              <span
                title="Backend sin conexión: mostrando datos de demostración"
                className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md
                           text-[10px] font-bold tracking-wider text-amber-300
                           bg-amber-400/10 border border-amber-400/30"
              >
                DEMO
              </span>
            )}
          </div>
          <p className="hidden sm:block text-[11.5px] text-slate-400/90 truncate mt-1 capitalize-first">
            Centro de Mando de Emergencias — {dateStr}
          </p>
        </div>
      </div>

      {/* ---------- Reloj + acciones ---------- */}
      <div className="flex items-center gap-1.5 sm:gap-2.5">
        <div className="hidden md:flex flex-col items-end leading-tight mr-1">
          <span className="font-mono text-[22px] font-semibold text-cyan-300 tabular-nums">
            {timeStr}
          </span>
          <span className="text-[10.5px] text-slate-500">{dateStr}</span>
        </div>

        <IconButton title="Buscar eventos" hoverColor="cyan">
          <Search className="w-[17px] h-[17px]" />
        </IconButton>

        <IconButton
          title="Zonas de alerta"
          hoverColor="violet"
          onClick={onLocationClick}
          badge={locationsCount && locationsCount > 0 ? locationsCount : undefined}
        >
          <MapPin className="w-[17px] h-[17px]" />
        </IconButton>

        <IconButton
          title={unread > 0 ? `Notificaciones (${unread} sin leer)` : 'Notificaciones'}
          hoverColor="amber"
          badge={unread}
          onClick={onNotificationsClick}
          active={notificationsOpen}
        >
          <Bell className="w-[17px] h-[17px]" />
        </IconButton>

        <div className="hidden sm:block">
          <IconButton title="Configuración" hoverColor="violet" onClick={onSettingsClick}>
            <Settings className="w-[17px] h-[17px]" />
          </IconButton>
        </div>

        {user ? (
          <motion.div
            className="flex items-center gap-2.5 ml-1 pl-2.5 border-l border-white/10"
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-violet-500
                            flex items-center justify-center text-[11px] font-bold text-white">
              {user.username?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase()}
            </div>
            <span className="hidden lg:block text-sm text-slate-300 max-w-[120px] truncate">
              {user.username ?? user.email}
            </span>
            <button
              onClick={onLogout}
              className="text-xs text-slate-400 hover:text-slate-200 transition flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/5"
            >
              <LogOut className="w-3.5 h-3.5" />
              Salir
            </button>
          </motion.div>
        ) : (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onAuthClick}
            className="ml-1 flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-xl text-[12px] sm:text-sm font-semibold text-[#06222b]
                       bg-gradient-to-b from-cyan-300 to-cyan-400
                       shadow-[0_6px_20px_-6px_rgba(34,211,238,.8)]
                       hover:from-cyan-200 hover:to-cyan-300 transition-colors"
          >
            <User className="w-4 h-4" />
            Acceder
          </motion.button>
        )}
      </div>
    </motion.header>
  )
}

function IconButton({
  children,
  title,
  badge,
  hoverColor = 'cyan',
  onClick,
  active = false,
}: {
  children: React.ReactNode
  title: string
  badge?: number
  hoverColor?: 'cyan' | 'amber' | 'violet'
  onClick?: () => void
  active?: boolean
}) {
  const hover =
    hoverColor === 'amber'
      ? 'hover:text-amber-300 hover:border-amber-300/40'
      : hoverColor === 'violet'
      ? 'hover:text-violet-300 hover:border-violet-300/40'
      : 'hover:text-cyan-300 hover:border-cyan-300/40'

  return (
    <motion.button
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.95 }}
      title={title}
      onClick={onClick}
      className={`relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl grid place-items-center
                  bg-white/[0.03] border transition-colors duration-200 ${hover}
                  ${active
                    ? 'border-amber-300/40 text-amber-200 bg-amber-400/10'
                    : 'border-white/[0.07] text-slate-300'}`}
    >
      {children}
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full
                         text-[10px] font-bold text-white bg-orange-500
                         flex items-center justify-center border-2 border-[#15202d]">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </motion.button>
  )
}
