import { motion } from 'framer-motion'
import { Search, Bell, Settings, LogOut, User } from 'lucide-react'
import { AuthUser } from '../services/api'

interface HeaderProps {
  user: AuthUser | null
  onAuthClick: () => void
  onLogout: () => void
}

export default function Header({ user, onAuthClick, onLogout }: HeaderProps) {
  const now = new Date()
  const timeStr = now.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const dateStr = now.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="glass-dark border-b border-border px-6 py-4 flex items-center justify-between"
    >
      {/* Logo + Title */}
      <div className="flex items-center gap-4">
        <motion.div
          className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 via-accent to-purple-500 flex items-center justify-center shadow-glow-cyan"
          whileHover={{ rotate: 5, scale: 1.05 }}
          transition={{ type: 'spring', stiffness: 400 }}
        >
          <span className="text-white text-xl">🌐</span>
        </motion.div>
        <div>
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-accent to-purple-500">
            ALERTA360
          </h1>
          <p className="text-xs text-slate-400 leading-tight mt-0.5">
            Centro de Mando de Emergencias — {dateStr}
          </p>
        </div>
      </div>

      {/* Right side: time + controls + user */}
      <div className="flex items-center gap-3">
        <motion.div
          className="hidden sm:flex flex-col items-end text-right"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="text-lg font-mono text-cyan-400">{timeStr}</div>
          <div className="text-xs text-slate-500">{dateStr}</div>
        </motion.div>

        <motion.button
          whileHover={{ scale: 1.1, rotate: 10 }}
          className="p-3 glass-dark border border-border text-slate-300 hover:text-cyan-400 hover:border-cyan-400/50 rounded-xl transition-all duration-200 group"
          title="Buscar eventos"
        >
          <Search className="w-4 h-4 group-hover:scale-110 transition-transform" />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1 }}
          className="relative p-3 glass-dark border border-border text-slate-300 hover:text-amber-400 hover:border-amber-400/50 rounded-xl transition-all duration-200 group"
          title="Notificaciones"
        >
          <Bell className="w-4 h-4 group-hover:scale-110 transition-transform" />
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-severity-high rounded-full text-xs text-white flex items-center justify-center border-2 border-surface">
            12
          </span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1, rotate: 10 }}
          className="p-3 glass-dark border border-border text-slate-300 hover:text-purple-400 hover:border-purple-400/50 rounded-xl transition-all duration-200 group"
          title="Configuración"
        >
          <Settings className="w-4 h-4 group-hover:scale-110 transition-transform" />
        </motion.button>

        {/* User / Auth */}
        {user ? (
          <motion.div
            className="flex items-center gap-3"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center text-xs font-bold text-white">
              {user.username?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase()}
            </div>
            <span className="hidden sm:text-sm text-slate-300">
              {user.username ?? user.email}
            </span>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onLogout}
              className="text-xs text-slate-400 hover:text-slate-300 transition flex items-center gap-1"
            >
              <LogOut className="w-3 h-3" />
              Salir
            </motion.button>
          </motion.div>
        ) : (
          <motion.button
            whileHover={{ scale: 1.03, boxShadow: 'var(--tw-shadow-color)' }}
            whileTap={{ scale: 0.97 }}
            onClick={onAuthClick}
            className="px-4 py-2 text-sm font-medium text-white bg-cyan-500 hover:bg-cyan-400 rounded-xl transition-all transform shadow-glow-cyan"
          >
            <User className="w-4 h-4 inline mr-1" />
            Acceder
          </motion.button>
        )}
      </div>
    </motion.header>
  )
}
