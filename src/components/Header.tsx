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
    <header className="glass-dark border-b border-border px-6 py-4 flex items-center justify-between">
      {/* Logo + Title */}
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent via-purple-500 to-cyan-400 flex items-center justify-center shadow-glow-cyan">
          <span className="text-white text-xl">🌐</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-accent to-purple-500">
            ALERTA360
          </h1>
          <p className="text-xs text-slate-400 leading-tight">
            Centro de Mando de Emergencias — {dateStr}
          </p>
        </div>
      </div>

      {/* Right side: time + user */}
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex flex-col items-end text-right">
          <div className="text-lg font-mono text-cyan-400">{timeStr}</div>
          <div className="text-xs text-slate-500">{dateStr}</div>
        </div>

        <button
          className="p-3 glass rounded-xl text-slate-300 hover:text-cyan-400 hover:bg-surfaceElev transition-all duration-200 group"
          title="Buscar eventos"
        >
          <span className="text-lg group-hover:scale-110 transition-transform">🔍</span>
        </button>

        <button
          className="relative p-3 glass rounded-xl text-slate-300 hover:text-amber-400 hover:bg-surfaceElev transition-all duration-200 group"
          title="Notificaciones"
        >
          <span className="text-lg group-hover:scale-110 transition-transform">🔔</span>
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-severity-high rounded-full text-xs text-white flex items-center justify-center border-2 border-surface">
            12
          </span>
        </button>

        <button
          className="p-3 glass rounded-xl text-slate-300 hover:text-purple-400 hover:bg-surfaceElev transition-all duration-200 group"
          title="Configuración"
        >
          <span className="text-lg group-hover:scale-110 transition-transform">⚙️</span>
        </button>

        {/* User / Auth */}
        {user ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center text-xs font-bold text-white">
              {user.username?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <span className="hidden sm:text-sm text-slate-300">
              {user.username ?? user.email}
            </span>
            <button
              onClick={onLogout}
              className="text-xs text-slate-500 hover:text-slate-300 transition"
            >
              Salir
            </button>
          </div>
        ) : (
          <button
            onClick={onAuthClick}
            className="px-4 py-2 text-sm font-medium text-white bg-accent hover:bg-accent/80 rounded-xl transition-all transform hover:scale-105 shadow-glow-cyan"
          >
            Acceder
          </button>
        )}
      </div>
    </header>
  )
}
