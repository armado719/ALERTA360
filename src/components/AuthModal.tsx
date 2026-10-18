import { useState } from 'react'
import { motion } from 'framer-motion'
import { Globe2 } from 'lucide-react'
import { login, register, AuthUser } from '../services/api'

interface AuthModalProps {
  isOpen: boolean
  mode: 'login' | 'register'
  onClose: () => void
  onModeChange: (mode: 'login' | 'register') => void
  onAuthSuccess: (user: AuthUser) => void
}

export default function AuthModal({
  isOpen,
  mode,
  onClose,
  onModeChange,
  onAuthSuccess,
}: AuthModalProps) {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMsg('')
    try {
      const result = mode === 'login'
        ? await login(email, password)
        : await register(email, username, password)
      onAuthSuccess(result.user)
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.error || err.message || 'Error de autenticación')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  const inputClass =
    'w-full px-3.5 py-2.5 rounded-xl text-[13px] text-slate-200 placeholder-slate-500 ' +
    'bg-[#101d2a] border border-white/[0.07] ' +
    'focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/25 transition'

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[100] p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-[#050b12]/75 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        className="relative w-full max-w-[400px] panel p-7"
      >
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-9 h-9 rounded-xl grid place-items-center bg-gradient-to-br from-[#8b5cf6] via-[#6366f1] to-[#22d3ee] shadow-[0_0_18px_rgba(139,92,246,.4)]">
            <Globe2 className="w-4.5 h-4.5 text-white" strokeWidth={2.1} />
          </div>
          <div>
            <h2 className="text-[15px] font-bold text-white leading-tight">
              {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
            </h2>
            <p className="text-[10.5px] text-slate-500">ALERTA360 · Centro de Mando</p>
          </div>
          <button
            onClick={() => onModeChange(mode === 'login' ? 'register' : 'login')}
            className="ml-auto text-[11px] text-cyan-300/80 hover:text-cyan-200 transition"
          >
            {mode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-red-400/10 border border-red-400/25 text-[11.5px] text-red-300">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'register' && (
            <div>
              <label className="block text-[10.5px] font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                Nombre de usuario
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={inputClass}
                placeholder="Tu nombre"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-[10.5px] font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="tu@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-[10.5px] font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              placeholder="••••••••"
              required
              minLength={8}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-1 py-2.5 rounded-xl text-[13px] font-semibold text-[#06222b]
                       bg-gradient-to-b from-cyan-300 to-cyan-400
                       hover:from-cyan-200 hover:to-cyan-300
                       shadow-[0_8px_24px_-8px_rgba(34,211,238,.8)]
                       disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-[#06222b] border-t-transparent rounded-full animate-spin" />
                {mode === 'login' ? 'Entrando…' : 'Creando…'}
              </span>
            ) : mode === 'login' ? (
              'Entrar'
            ) : (
              'Registrarse'
            )}
          </button>
        </form>

        <button
          onClick={onClose}
          className="w-full mt-3 py-1.5 text-[11.5px] text-slate-500 hover:text-slate-300 transition"
        >
          Continuar como invitado
        </button>
      </motion.div>
    </div>
  )
}
