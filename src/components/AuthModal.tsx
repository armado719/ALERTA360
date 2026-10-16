import { useState } from 'react'
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

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[100] p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md glass-dark border border-border rounded-2xl shadow-2xl animate-stagger">
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">
              {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
            </h2>
            <button
              onClick={() => onModeChange(mode === 'login' ? 'register' : 'login')}
              className="text-xs text-slate-400 hover:text-slate-300 transition"
            >
              {mode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
            </button>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-severity-critical/10 border border-severity-critical/30 rounded-lg text-sm text-severity-critical">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Nombre de usuario
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-surfaceElev border border-border rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent transition"
                  placeholder="Tu nombre"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-surfaceElev border border-border rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent transition"
                placeholder="tu@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-surfaceElev border border-border rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent transition"
                placeholder="••••••••"
                required
                minLength={8}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-accent hover:bg-accent/80 text-white font-semibold rounded-xl transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed shadow-glow-cyan hover:shadow-glow-cyan"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{mode === 'login' ? 'Entrando...' : 'Creando...'}</span>
                </div>
              ) : (
                mode === 'login' ? 'Entrar' : 'Registrarse'
              )}
            </button>
          </form>

          <button
            onClick={onClose}
            className="w-full mt-4 py-2 text-slate-400 hover:text-slate-300 text-sm transition"
          >
            Continuar como invitado
          </button>
        </div>
      </div>
    </div>
  )
}
