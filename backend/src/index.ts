import { buildApp } from './app'
import { config } from './utils/config'
import logger from './utils/logger'
import { startIngestScheduler } from './services/ingestion'
import { matchEvent } from './services/matching'
import { wsConnections } from './plugins/metrics'

/**
 * Punto de entrada: construye la app, arranca la ingesta con el motor de
 * alertas enganchado y escucha. Toda la lógica vive en `app.ts` para poder
 * testearla sin abrir un puerto.
 */
const app = await buildApp()

// Cada evento nuevo entra al motor de matching, que crea las notificaciones
// y las empuja por WebSocket a quien esté conectado.
startIngestScheduler(app.prisma, {
  onEventCreated: async event => {
    await matchEvent(app.prisma, event, app.hub)
  },
})

const start = async () => {
  try {
    await app.listen({ port: config.PORT, host: '0.0.0.0' })
    logger.info(`Server running on http://localhost:${config.PORT}`)

    // Estado inicial de las métricas que dependen del hub
    wsConnections.set(app.hub.size)
  } catch (err) {
    logger.error(err, 'Failed to start server')
    await app.close()
    process.exit(1)
  }
}

start()

// Graceful shutdown — Docker manda SIGTERM al reiniciar o desplegar
const shutdown = async (signal: string) => {
  logger.info({ signal }, 'Shutting down gracefully...')
  try {
    await app.close()
  } catch (err) {
    logger.error({ err }, 'Error during shutdown')
  }
  process.exit(0)
}

process.on('SIGINT', () => void shutdown('SIGINT'))
process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('unhandledRejection', reason => {
  logger.error({ reason }, 'Unhandled rejection')
})
