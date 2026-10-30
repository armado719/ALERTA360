import { typeBadgeHtml } from '../data/eventIcons'
import { typeLabel } from '../data/eventTypes'

/**
 * Insignia redonda del tipo de desastre (la misma del mapa). El HTML sale de
 * constantes propias (`eventIcons.ts`), nunca de datos de las fuentes.
 */
export default function TypeBadge({ type, size = 22, className = '' }: { type: string; size?: number; className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 ${className}`}
      title={typeLabel(type)}
      dangerouslySetInnerHTML={{ __html: typeBadgeHtml(type, size) }}
    />
  )
}
