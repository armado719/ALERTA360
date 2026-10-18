import { motion, AnimatePresence } from 'framer-motion'
import { X, MapPin, Clock, Radio, Activity } from 'lucide-react'
import { DisasterEvent } from '../types'

const SEVERITY = {
  critical: { color: '#f87171', label: 'CRÍTICO' },
  high: { color: '#fb923c', label: 'ALTO' },
  medium: { color: '#fbbf24', label: 'MEDIO' },
  low: { color: '#38bdf8', label: 'BAJO' },
} as const

const TYPE_LABEL: Record<string, string> = {
  earthquake: 'Sismo',
  storm: 'Tormenta',
  flood: 'Inundación',
  rain: 'Lluvia',
  landslide: 'Deslizamiento',
  volcanic: 'Volcán',
  hurricane: 'Huracán',
}

/**
 * Tarjeta flotante con el detalle del evento seleccionado.
 * Se muestra sobre el mapa para no empujar el panel lateral.
 */
export default function EventDetailCard({
  event,
  onClose,
}: {
  event: DisasterEvent | null
  onClose: () => void
}) {
  return (
    <AnimatePresence>
      {event && (
        <motion.div
          key={event.id}
          initial={{ opacity: 0, y: 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="absolute left-4 bottom-4 z-40 w-[330px] max-w-[calc(100%-2rem)] max-h-[calc(100%-2rem)] overflow-y-auto rounded-2xl
                     bg-[#0f1c29]/92 backdrop-blur-xl border border-white/10
                     shadow-[0_30px_70px_-25px_rgba(0,0,0,.95)] overflow-hidden"
        >
          {(() => {
            const sev = SEVERITY[event.severity as keyof typeof SEVERITY] ?? SEVERITY.low
            return (
              <>
                <div
                  className="h-[3px] w-full"
                  style={{ background: `linear-gradient(90deg, ${sev.color}, transparent 85%)` }}
                />
                <div className="p-3.5">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="text-[9px] font-bold tracking-[0.14em] px-1.5 py-0.5 rounded"
                          style={{ color: sev.color, background: `${sev.color}1f` }}
                        >
                          {sev.label}
                        </span>
                        <span className="text-[9.5px] uppercase tracking-wider text-slate-500">
                          {TYPE_LABEL[event.type] ?? event.type}
                        </span>
                      </div>
                      <h3 className="text-[13.5px] font-bold text-white leading-snug">
                        {event.title}
                      </h3>
                    </div>
                    <button
                      onClick={onClose}
                      className="text-slate-500 hover:text-white transition -mt-0.5 -mr-0.5 p-1"
                      aria-label="Cerrar"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="mt-2 text-[11.5px] leading-relaxed text-slate-400">
                    {event.description}
                  </p>

                  <div className="mt-3 grid grid-cols-2 gap-1.5">
                    <Stat
                      icon={<MapPin className="w-3 h-3" />}
                      label="Coordenadas"
                      value={`${event.latitude.toFixed(2)}, ${event.longitude.toFixed(2)}`}
                      mono
                    />
                    <Stat
                      icon={<Clock className="w-3 h-3" />}
                      label="Detectado"
                      value={new Date(event.detectedAt).toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                      })}
                      mono
                    />
                    {event.magnitude !== undefined && (
                      <Stat
                        icon={<Activity className="w-3 h-3" />}
                        label="Magnitud"
                        value={`M ${event.magnitude.toFixed(1)}`}
                      />
                    )}
                    <Stat
                      icon={<Radio className="w-3 h-3" />}
                      label="Fuente"
                      value={event.source.toUpperCase()}
                    />
                  </div>
                </div>
              </>
            )
          })()}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Stat({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="rounded-lg bg-black/25 border border-white/[0.05] px-2 py-1.5">
      <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-slate-500">
        {icon}
        {label}
      </div>
      <div className={`mt-0.5 text-[11.5px] font-semibold text-slate-200 ${mono ? 'font-mono' : ''}`}>
        {value}
      </div>
    </div>
  )
}
