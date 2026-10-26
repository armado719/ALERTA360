import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X } from 'lucide-react'

const DISMISS_KEY = 'alerta360_push_prompt_dismissed_at'
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

function isDismissedRecently(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY)
    if (!raw) return false
    const ts = Number(raw)
    if (Number.isNaN(ts)) return false
    return Date.now() - ts < SEVEN_DAYS_MS
  } catch {
    return false
  }
}

function dismissNow() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
  } catch {
    // Si localStorage falla, simplemente no se recuerda.
  }
}

export default function PushPrompt({
  supported,
  permission,
  enable,
  onGranted,
}: {
  supported: boolean
  permission: NotificationPermission
  enable: () => Promise<void>
  onGranted: () => void
}) {
  const [visible, setVisible] = useState(false)
  const [denied, setDenied] = useState(false)
  const [busy, setBusy] = useState(false)

  // Solo se ofrece cuando el permiso no se ha decidido. Si ya estaba bloqueado
  // de antes, no se insiste: el aviso "bloqueadas" sale únicamente como
  // respuesta a "Activar" (ver handleActivate).
  useEffect(() => {
    if (!supported || permission !== 'default') return
    if (isDismissedRecently()) return
    const t = setTimeout(() => setVisible(true), 3000)
    return () => clearTimeout(t)
  }, [supported, permission])

  const handleActivate = async () => {
    setBusy(true)
    await enable()
    setBusy(false)
    // Re-leer permiso tras el intento.
    if (Notification.permission === 'granted') {
      setVisible(false)
      onGranted()
    } else if (Notification.permission === 'denied') {
      setDenied(true)
    }
  }

  const handleDismiss = () => {
    dismissNow()
    setVisible(false)
  }

  const handleUnderstood = () => {
    setVisible(false)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="dialog"
          aria-label="Activar notificaciones"
          initial={{ opacity: 0, y: 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="fixed z-50 bottom-4 left-4 right-4 md:right-auto md:w-[360px]
                     rounded-2xl bg-[#101d2a]/95 backdrop-blur-xl border border-white/10
                     shadow-[0_30px_70px_-25px_rgba(0,0,0,.95)] p-4"
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-400/15 border border-cyan-400/30 grid place-items-center text-cyan-300 shrink-0">
              <Bell className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              {!denied ? (
                <>
                  <h3 className="text-[13.5px] font-bold text-white leading-snug">
                    Recibe alertas aunque cierres la app
                  </h3>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-slate-400">
                    Te avisaremos de sismos, lluvias fuertes y huracanes cerca de tus zonas.
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={handleDismiss}
                      className="px-3 py-2 rounded-xl text-[12px] font-medium text-slate-300
                                 bg-white/5 border border-white/10 hover:bg-white/10 transition"
                    >
                      Ahora no
                    </button>
                    <button
                      onClick={handleActivate}
                      disabled={busy}
                      className="px-3 py-2 rounded-xl text-[12px] font-semibold text-[#06222b]
                                 bg-gradient-to-b from-cyan-300 to-cyan-400
                                 hover:from-cyan-200 hover:to-cyan-300 transition disabled:opacity-60"
                    >
                      {busy ? 'Activando…' : 'Activar'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-[13.5px] font-bold text-white leading-snug">
                    Notificaciones bloqueadas
                  </h3>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-slate-400">
                    Tu navegador bloqueó las notificaciones. Puedes activarlas desde el ícono del candado junto a la dirección.
                  </p>
                  <div className="mt-3">
                    <button
                      onClick={handleUnderstood}
                      className="px-3 py-2 rounded-xl text-[12px] font-semibold text-[#06222b]
                                 bg-gradient-to-b from-cyan-300 to-cyan-400
                                 hover:from-cyan-200 hover:to-cyan-300 transition"
                    >
                      Entendido
                    </button>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={() => setVisible(false)}
              className="text-slate-500 hover:text-white transition p-1"
              aria-label="Cerrar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}