import pino from 'pino'

const isDev = process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test'

const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  // pino-pretty abre un worker: solo tiene sentido en desarrollo local
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
})

export default logger
