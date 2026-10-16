import axios from 'axios'
import { DisasterEvent } from '../types'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
})

export async function fetchDisasterEvents(filters: {
  types: string[]
  timeRange: '1h' | '24h' | '7d'
}): Promise<DisasterEvent[]> {
  try {
    const response = await api.get('/events', {
      params: {
        types: filters.types.join(','),
        timeRange: filters.timeRange,
      },
    })
    return response.data
  } catch (error) {
    console.error('Error fetching events:', error)
    // Return mock data for MVP
    return getMockEvents()
  }
}

export async function fetchEventById(id: string): Promise<DisasterEvent | null> {
  try {
    const response = await api.get(`/events/${id}`)
    return response.data
  } catch (error) {
    console.error('Error fetching event:', error)
    return null
  }
}

export async function subscribeToAlerts(locationId: string): Promise<void> {
  try {
    await api.post('/notifications/subscribe', { locationId })
  } catch (error) {
    console.error('Error subscribing to alerts:', error)
  }
}

// Mock data for MVP
function getMockEvents(): DisasterEvent[] {
  return [
    {
      id: 'evt-001',
      type: 'earthquake',
      title: 'Terremoto en Colombia',
      description: 'Terremoto de magnitud 5.2 en zona cafetera',
      latitude: 5.0,
      longitude: -75.5,
      magnitude: 5.2,
      severity: 'high',
      occurredAt: new Date(Date.now() - 30 * 60000).toISOString(),
      detectedAt: new Date(Date.now() - 25 * 60000).toISOString(),
      source: 'USGS',
      rawData: {
        lat: 5.0,
        lon: -75.5,
        depth: 12,
        mag: 5.2,
      },
    },
    {
      id: 'evt-002',
      type: 'storm',
      title: 'Tormenta severa en Ecuador',
      description: 'Tormenta con vientos de 60 km/h en Quito',
      latitude: -0.22,
      longitude: -78.51,
      severity: 'medium',
      occurredAt: new Date(Date.now() - 10 * 60000).toISOString(),
      detectedAt: new Date(Date.now() - 8 * 60000).toISOString(),
      source: 'NOAA',
    },
    {
      id: 'evt-003',
      type: 'flood',
      title: 'Inundaciones en Perú',
      description: 'Desbordamiento del Río Urubamba',
      latitude: -12.04,
      longitude: -72.54,
      severity: 'critical',
      occurredAt: new Date(Date.now() - 5 * 60000).toISOString(),
      detectedAt: new Date(Date.now() - 3 * 60000).toISOString(),
      source: 'NASA FIRMS',
    },
    {
      id: 'evt-004',
      type: 'rain',
      title: 'Lluvia extrema en Venezuela',
      description: 'Precipitación de 200mm registrada en Caracas',
      latitude: 10.49,
      longitude: -66.86,
      severity: 'high',
      occurredAt: new Date(Date.now() - 2 * 60000).toISOString(),
      detectedAt: new Date(Date.now() - 1 * 60000).toISOString(),
      source: 'NOAA',
    },
    {
      id: 'evt-005',
      type: 'earthquake',
      title: 'Temblor en Chile',
      description: 'Sismo de magnitud 4.8 en zona central',
      latitude: -33.87,
      longitude: -70.67,
      magnitude: 4.8,
      severity: 'medium',
      occurredAt: new Date(Date.now() - 45 * 60000).toISOString(),
      detectedAt: new Date(Date.now() - 40 * 60000).toISOString(),
      source: 'USGS',
    },
  ]
}
