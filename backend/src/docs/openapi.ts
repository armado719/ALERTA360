/**
 * Especificación OpenAPI 3.0 de ALERTA360.
 *
 * Se sirve en `/openapi.json` y la UI en `/docs`. Es estática a propósito: no
 * obliga a añadir esquemas JSON a cada ruta (que serializarían las respuestas
 * y podrían recortar campos) ni a cambiar el comportamiento en producción.
 * Al añadir un endpoint hay que documentarlo aquí.
 */

const severity = { type: 'string', enum: ['low', 'medium', 'high', 'critical'] } as const

const errorSchema = {
  type: 'object',
  properties: {
    error: { type: 'string', example: 'Unauthorized' },
    message: { type: 'string' },
    details: { type: 'array', items: { type: 'object' } },
  },
} as const

const eventSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    type: {
      type: 'string',
      enum: ['earthquake', 'storm', 'flood', 'rain', 'landslide', 'volcanic', 'hurricane'],
    },
    title: { type: 'string', example: 'Sismo cerca de Bogotá' },
    description: { type: 'string' },
    latitude: { type: 'number', example: 4.711 },
    longitude: { type: 'number', example: -74.0721 },
    magnitude: { type: 'number', nullable: true },
    intensity: { type: 'integer', nullable: true, minimum: 1, maximum: 10 },
    severity,
    occurredAt: { type: 'string', format: 'date-time' },
    detectedAt: { type: 'string', format: 'date-time' },
    source: { type: 'string', example: 'usgs' },
  },
} as const

const notificationSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    channel: { type: 'string', enum: ['push', 'email', 'sms'] },
    status: {
      type: 'string',
      enum: ['pending', 'sent', 'delivered', 'failed', 'skipped'],
    },
    distanceKm: { type: 'number', example: 2.9 },
    sentAt: { type: 'string', format: 'date-time' },
    readAt: { type: 'string', format: 'date-time', nullable: true },
    event: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        type: { type: 'string' },
        title: { type: 'string' },
        severity,
        latitude: { type: 'number' },
        longitude: { type: 'number' },
        occurredAt: { type: 'string', format: 'date-time' },
        source: { type: 'string' },
      },
    },
  },
} as const

const preferencesSchema = {
  type: 'object',
  properties: {
    userId: { type: 'string' },
    alertRadiusKm: { type: 'integer', minimum: 1, maximum: 2000, example: 50 },
    disasterTypes: {
      type: 'array',
      items: {
        type: 'string',
        enum: ['earthquake', 'storm', 'flood', 'rain', 'landslide', 'volcanic', 'hurricane'],
      },
    },
    minSeverity: severity,
    pushEnabled: { type: 'boolean' },
    emailEnabled: { type: 'boolean' },
    smsEnabled: { type: 'boolean' },
  },
} as const

const bearer = [{ bearerAuth: [] }]

export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'ALERTA360 API',
    version: '0.4.0',
    description: [
      'API de la plataforma de alertas tempranas ALERTA360.',
      '',
      '**Autenticación:** JWT en `Authorization: Bearer <token>`. Se obtiene en',
      '`POST /api/auth/login` y dura 7 días.',
      '',
      '**Alertas en vivo:** WebSocket en `wss://<host>/ws/alerts?token=<jwt>`.',
      'Mensajes: `{"type":"ready"}` al conectar y `{"type":"alert",...}` por cada evento',
      'que entra en el radio de las ubicaciones del usuario.',
    ].join('\n'),
  },
  servers: [
    { url: 'http://localhost:3000', description: 'Desarrollo' },
    { url: 'https://alerta360.com', description: 'Producción' },
  ],
  tags: [
    { name: 'Salud', description: 'Estado del servicio' },
    { name: 'Auth', description: 'Registro, login y perfil' },
    { name: 'Eventos', description: 'Eventos de desastre' },
    { name: 'Ubicaciones', description: 'Zonas de interés del usuario' },
    { name: 'Notificaciones', description: 'Bandeja de alertas' },
    { name: 'Preferencias', description: 'Reglas del motor de alertas' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: errorSchema,
      Event: eventSchema,
      Notification: notificationSchema,
      Preferences: preferencesSchema,
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Salud'],
        summary: 'Estado del servicio',
        description: 'Comprueba la base de datos y la frescura de la ingesta. Devuelve 503 si la BD falla.',
        responses: {
          '200': {
            description: 'Servicio operativo',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', enum: ['ok', 'degraded'] },
                    version: { type: 'string' },
                    uptimeSeconds: { type: 'integer' },
                    timestamp: { type: 'string', format: 'date-time' },
                    checks: { type: 'object' },
                  },
                },
              },
            },
          },
          '503': { description: 'Base de datos caída' },
        },
      },
    },

    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Crear cuenta',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'username', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  username: { type: 'string', minLength: 3 },
                  password: { type: 'string', minLength: 8 },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Cuenta creada' },
          '409': { description: 'El email ya existe', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Iniciar sesión',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Token JWT (7 días) y datos del usuario',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    token: { type: 'string' },
                    user: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        email: { type: 'string' },
                        username: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': { description: 'Credenciales inválidas' },
        },
      },
    },

    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Perfil del usuario autenticado',
        security: bearer,
        responses: {
          '200': { description: 'Usuario con preferencias y ubicaciones' },
          '401': { description: 'No autenticado' },
        },
      },
    },

    '/api/events': {
      get: {
        tags: ['Eventos'],
        summary: 'Listar eventos activos',
        parameters: [
          { name: 'types', in: 'query', schema: { type: 'string' }, example: 'earthquake,flood' },
          {
            name: 'timeRange',
            in: 'query',
            schema: { type: 'string', enum: ['1h', '24h', '7d'], default: '24h' },
          },
        ],
        responses: {
          '200': {
            description: 'Eventos ordenados por fecha descendente',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Event' } },
              },
            },
          },
        },
      },
    },

    '/api/events/{id}': {
      get: {
        tags: ['Eventos'],
        summary: 'Detalle de un evento',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Evento',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Event' } } },
          },
          '404': { description: 'No existe o no está activo' },
        },
      },
    },

    '/api/locations': {
      get: {
        tags: ['Ubicaciones'],
        summary: 'Ubicaciones del usuario',
        security: bearer,
        responses: { '200': { description: 'Lista de ubicaciones' } },
      },
      post: {
        tags: ['Ubicaciones'],
        summary: 'Crear ubicación',
        security: bearer,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'latitude', 'longitude'],
                properties: {
                  name: { type: 'string' },
                  latitude: { type: 'number', minimum: -90, maximum: 90 },
                  longitude: { type: 'number', minimum: -180, maximum: 180 },
                  radiusKm: { type: 'integer', minimum: 1, maximum: 1000, default: 50 },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Ubicación creada' } },
      },
    },

    '/api/locations/{id}': {
      delete: {
        tags: ['Ubicaciones'],
        summary: 'Borrar ubicación',
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '204': { description: 'Borrada' },
          '403': { description: 'La ubicación es de otro usuario' },
          '404': { description: 'No existe' },
        },
      },
    },

    '/api/notifications': {
      get: {
        tags: ['Notificaciones'],
        summary: 'Bandeja de alertas',
        security: bearer,
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 } },
          { name: 'unreadOnly', in: 'query', schema: { type: 'string', enum: ['true', 'false'] } },
        ],
        responses: {
          '200': {
            description: 'Notificaciones del usuario y contador de no leídas',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    unread: { type: 'integer' },
                    notifications: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Notification' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    '/api/notifications/unread-count': {
      get: {
        tags: ['Notificaciones'],
        summary: 'Contador de no leídas',
        security: bearer,
        responses: {
          '200': {
            description: 'Contador',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { count: { type: 'integer' } } },
              },
            },
          },
        },
      },
    },

    '/api/notifications/{id}/read': {
      post: {
        tags: ['Notificaciones'],
        summary: 'Marcar como leída (idempotente)',
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Marcada' },
          '404': { description: 'No existe o es de otro usuario' },
        },
      },
    },

    '/api/notifications/read-all': {
      post: {
        tags: ['Notificaciones'],
        summary: 'Marcar todas como leídas',
        security: bearer,
        responses: {
          '200': {
            description: 'Cantidad actualizada',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { ok: { type: 'boolean' }, updated: { type: 'integer' } },
                },
              },
            },
          },
        },
      },
    },

    '/api/notifications/{id}': {
      delete: {
        tags: ['Notificaciones'],
        summary: 'Borrar una notificación',
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '204': { description: 'Borrada' }, '404': { description: 'No existe' } },
      },
    },

    '/api/preferences': {
      get: {
        tags: ['Preferencias'],
        summary: 'Preferencias del usuario',
        description: 'Si no existen, se crean con los valores por defecto.',
        security: bearer,
        responses: {
          '200': {
            description: 'Preferencias',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Preferences' } },
            },
          },
        },
      },
      put: {
        tags: ['Preferencias'],
        summary: 'Actualizar preferencias (parcial)',
        security: bearer,
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/Preferences' } },
          },
        },
        responses: {
          '200': { description: 'Preferencias actualizadas' },
          '400': { description: 'Valores inválidos' },
        },
      },
    },
  },
}
