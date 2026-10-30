/**
 * SettingsPanel — preferencias de alerta del usuario (`/api/preferences`).
 *
 * Son las mismas reglas que aplica el motor de matching en el backend:
 *   - qué tipos de evento le interesan,
 *   - desde qué severidad quiere enterarse,
 *   - por qué canales (push / email / SMS; el SMS solo sale desde `high`).
 */
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Check, LogIn, Mail, MessageSquare, Settings, X } from 'lucide-react'
import {
  fetchPreferences,
  updatePreferences,
  type AuthUser,
  type Preferences,
  type Severity,
} from '../services/api'

// Los tipos que acepta el backend (`DISASTER_TYPES` en routes/preferences.ts)
const ALERT_TYPES: { type: string; label: string }[] = [
  { type: 'earthquake', label: 'Terremotos' },
  { type: 'storm', label: 'Tormentas' },
  { type: 'flood', label: 'Inundaciones' },
  { type: 'rain', label: 'Lluvia' },
  { type: 'landslide', label: 'Deslizamientos' },
  { type: 'volcanic', label: 'Volcánicos' },
  { type: 'hurricane', label: 'Huracanes' },
]

const SEVERITIES: { value: Severity; label: string; color: string }[] = [
  { value: 'low', label: 'Baja', color: '#38bdf8' },
  { value: 'medium', label: 'Media', color: '#fbbf24' },
  { value: 'high', label: 'Alta', color: '#fb923c' },
  { value: 'critical', label: 'Crítica', color: '#f87171' },
]

const E164 = /^\+[1-9]\d{7,14}$/

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
  user: AuthUser | null
  onRequestLogin: () => void
}

export default function SettingsPanel({ isOpen, onClose, user, onRequestLogin }: SettingsPanelProps) {
  const [prefs, setPrefs] = useState<Preferences | null>(null)
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // Se recargan al abrir: así el panel nunca muestra datos viejos
  useEffect(() => {
    if (!isOpen || !user) return
    setLoading(true)
    setError(null)
    setSaved(false)
    fetchPreferences()
      .then((data) => {
        setPrefs(data)
        setPhone(data.phone ?? '')
      })
      .catch(() => setError('No se pudieron cargar tus preferencias.'))
      .finally(() => setLoading(false))
  }, [isOpen, user])

  const update = (changes: Partial<Preferences>) => {
    setPrefs((p) => (p ? { ...p, ...changes } : p))
    setSaved(false)
  }

  const toggleType = (type: string) => {
    if (!prefs) return
    const next = prefs.disasterTypes.includes(type)
      ? prefs.disasterTypes.filter((t) => t !== type)
      : [...prefs.disasterTypes, type]
    update({ disasterTypes: next })
  }

  const phoneInvalid = !!prefs?.smsEnabled && !E164.test(phone.trim())
  const noChannel = !!prefs && !prefs.pushEnabled && !prefs.emailEnabled && !prefs.smsEnabled
  const noTypes = !!prefs && prefs.disasterTypes.length === 0

  const handleSave = async () => {
    if (!prefs || phoneInvalid) return
    setSaving(true)
    setError(null)
    try {
      const result = await updatePreferences({
        disasterTypes: prefs.disasterTypes,
        minSeverity: prefs.minSeverity,
        pushEnabled: prefs.pushEnabled,
        emailEnabled: prefs.emailEnabled,
        smsEnabled: prefs.smsEnabled,
        phone: phone.trim() || null,
      })
      setPrefs(result)
      setPhone(result.phone ?? '')
      setSaved(true)
    } catch {
      setError('No se pudieron guardar los cambios. Inténtalo de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const sectionTitle = 'text-[10.5px] font-medium text-slate-400 uppercase tracking-wider mb-2'

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="w-full max-w-[440px] max-h-[85vh] flex flex-col rounded-2xl
                       bg-[#101d2a]/95 border border-white/10 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Configuración de alertas"
          >
            {/* ---------- Header ---------- */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] shrink-0">
              <h2 className="text-[15px] font-bold text-slate-200 flex items-center gap-2">
                <Settings className="w-4 h-4 text-violet-400" />
                Configuración de alertas
              </h2>
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto a360-scroll px-4 py-4 space-y-5">
              {!user ? (
                <div className="py-6 text-center">
                  <p className="text-[13px] text-slate-300">
                    Inicia sesión para elegir qué alertas recibir y por qué canal.
                  </p>
                  <button
                    onClick={onRequestLogin}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold
                               text-[#06222b] bg-gradient-to-b from-cyan-300 to-cyan-400 hover:from-cyan-200 hover:to-cyan-300 transition"
                  >
                    <LogIn className="w-4 h-4" />
                    Iniciar sesión
                  </button>
                </div>
              ) : loading || !prefs ? (
                <div className="py-10 flex flex-col items-center gap-3 text-[12px] text-slate-400">
                  {error ?? (
                    <>
                      <div className="w-5 h-5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                      Cargando preferencias…
                    </>
                  )}
                </div>
              ) : (
                <>
                  {/* ---------- Tipos de evento ---------- */}
                  <section>
                    <h3 className={sectionTitle}>Tipos de evento</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {ALERT_TYPES.map(({ type, label }) => {
                        const active = prefs.disasterTypes.includes(type)
                        return (
                          <button
                            key={type}
                            onClick={() => toggleType(type)}
                            aria-pressed={active}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] border transition ${
                              active
                                ? 'bg-cyan-400/15 border-cyan-400/40 text-cyan-200'
                                : 'bg-white/[0.03] border-white/[0.08] text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {active && <Check className="w-3 h-3" />}
                            {label}
                          </button>
                        )
                      })}
                    </div>
                    {noTypes && (
                      <p className="mt-2 text-[11px] text-amber-300">Sin tipos seleccionados no recibirás ninguna alerta.</p>
                    )}
                  </section>

                  {/* ---------- Severidad mínima ---------- */}
                  <section>
                    <h3 className={sectionTitle}>Severidad mínima</h3>
                    <div className="grid grid-cols-4 gap-1.5">
                      {SEVERITIES.map(({ value, label, color }) => {
                        const active = prefs.minSeverity === value
                        return (
                          <button
                            key={value}
                            onClick={() => update({ minSeverity: value })}
                            aria-pressed={active}
                            className={`py-1.5 rounded-lg text-[12px] border transition ${
                              active ? 'text-white' : 'bg-white/[0.03] border-white/[0.08] text-slate-400 hover:text-slate-200'
                            }`}
                            style={active ? { borderColor: color, background: `${color}26` } : undefined}
                          >
                            {label}
                          </button>
                        )
                      })}
                    </div>
                    <p className="mt-2 text-[11px] text-slate-500">
                      Solo recibirás eventos de esta severidad o mayor.
                    </p>
                  </section>

                  {/* ---------- Canales ---------- */}
                  <section>
                    <h3 className={sectionTitle}>Canales</h3>
                    <div className="space-y-1.5">
                      <ChannelToggle
                        icon={<Bell className="w-4 h-4" />}
                        label="Notificación en el navegador"
                        hint="Aunque la pestaña esté cerrada"
                        checked={prefs.pushEnabled}
                        onChange={(v) => update({ pushEnabled: v })}
                      />
                      <ChannelToggle
                        icon={<Mail className="w-4 h-4" />}
                        label="Correo electrónico"
                        hint={user.email}
                        checked={prefs.emailEnabled}
                        onChange={(v) => update({ emailEnabled: v })}
                      />
                      <ChannelToggle
                        icon={<MessageSquare className="w-4 h-4" />}
                        label="SMS"
                        hint="Solo eventos de severidad alta o crítica"
                        checked={prefs.smsEnabled}
                        onChange={(v) => update({ smsEnabled: v })}
                      />
                    </div>

                    {prefs.smsEnabled && (
                      <div className="mt-3">
                        <label htmlFor="settings-phone" className="block text-[11px] text-slate-400 mb-1.5">
                          Teléfono para SMS (con código de país)
                        </label>
                        <input
                          id="settings-phone"
                          type="tel"
                          value={phone}
                          onChange={(e) => {
                            setPhone(e.target.value)
                            setSaved(false)
                          }}
                          placeholder="+573001234567"
                          className={`w-full px-3 py-2 rounded-xl text-[13px] text-slate-200 placeholder-slate-600 bg-[#0b1520]
                                      border focus:outline-none transition ${
                                        phoneInvalid && phone ? 'border-red-400/50' : 'border-white/[0.08] focus:border-cyan-400/50'
                                      }`}
                        />
                        {phoneInvalid && (
                          <p className="mt-1.5 text-[11px] text-amber-300">
                            Escribe el número con + y código de país, por ejemplo +573001234567.
                          </p>
                        )}
                      </div>
                    )}
                    {noChannel && (
                      <p className="mt-2 text-[11px] text-amber-300">
                        Sin canales activos solo verás las alertas dentro de la app.
                      </p>
                    )}
                  </section>
                </>
              )}
            </div>

            {/* ---------- Footer ---------- */}
            {user && prefs && (
              <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-white/[0.06] shrink-0">
                <span className="text-[11.5px] min-h-[1em]">
                  {error ? (
                    <span className="text-red-300">{error}</span>
                  ) : saved ? (
                    <span className="flex items-center gap-1 text-emerald-300">
                      <Check className="w-3.5 h-3.5" /> Cambios guardados
                    </span>
                  ) : null}
                </span>
                <button
                  onClick={handleSave}
                  disabled={saving || phoneInvalid}
                  className="px-4 py-2 rounded-xl text-[13px] font-semibold text-[#06222b]
                             bg-gradient-to-b from-cyan-300 to-cyan-400 hover:from-cyan-200 hover:to-cyan-300
                             disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {saving ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function ChannelToggle({
  icon,
  label,
  hint,
  checked,
  onChange,
}: {
  icon: React.ReactNode
  label: string
  hint: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] cursor-pointer hover:bg-white/[0.05] transition">
      <span className={checked ? 'text-cyan-300' : 'text-slate-500'}>{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-[12.5px] text-slate-200">{label}</span>
        <span className="block text-[11px] text-slate-500 truncate">{hint}</span>
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={`relative w-9 h-5 rounded-full transition ${checked ? 'bg-cyan-400/80' : 'bg-white/15'}`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`}
        />
      </span>
    </label>
  )
}
