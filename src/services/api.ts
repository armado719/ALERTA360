import axios from 'axios'
import { DisasterEvent } from '../types'

// Por defecto se usa una ruta relativa: en desarrollo la resuelve el proxy de
// Vite (vite.config.ts) y en producción nginx. Así no hay CORS de por medio.
// Para apuntar a otro backend: VITE_API_URL=https://api.ejemplo.com/api
const API_BASE = import.meta.env.VITE_API_URL || '/api'

// Create axios instance
const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
})

// Auth token storage
let authToken: string | null = localStorage.getItem('alerta360_token')

// Set Authorization header if token exists
if (authToken) {
  api.defaults.headers.common['Authorization'] = `Bearer ${authToken}`
}

// Persist token to localStorage and set header
export function setAuthToken(token: string | null) {
  authToken = token
  if (token) {
    localStorage.setItem('alerta360_token', token)
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
  } else {
    localStorage.removeItem('alerta360_token')
    delete api.defaults.headers.common['Authorization']
  }
}

// Auth API
export interface AuthUser {
  id: string
  email: string
  username: string
}

export async function register(
  email: string,
  username: string,
  password: string
): Promise<{ user: AuthUser; token: string }> {
  const response = await api.post('/auth/register', { email, username, password })
  const { token, user } = response.data
  setAuthToken(token ?? null)
  return { user, token: token ?? '' }
}

export async function login(
  email: string,
  password: string
): Promise<{ token: string; user: AuthUser }> {
  const response = await api.post('/auth/login', { email, password })
  const { token, user } = response.data
  setAuthToken(token)
  return { token, user }
}

export async function logout(): Promise<void> {
  setAuthToken(null)
}

export async function getMe(): Promise<AuthUser> {
  const response = await api.get('/auth/me')
  return response.data
}

// Events API
export async function fetchDisasterEvents(filters: {
  types: string[]
  timeRange: '1h' | '24h' | '7d'
}): Promise<DisasterEvent[]> {
  const response = await api.get('/events', {
    params: {
      types: filters.types.join(','),
      timeRange: filters.timeRange,
    },
  })
  return response.data
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

// Locations API
export interface Location {
  id: string
  name: string
  latitude: number
  longitude: number
  radiusKm: number
  createdAt: string
  updatedAt: string
}

export async function fetchLocations(): Promise<Location[]> {
  const response = await api.get('/locations')
  return response.data
}

export async function createLocation(location: {
  name: string
  latitude: number
  longitude: number
  radiusKm: number
}): Promise<Location> {
  const response = await api.post('/locations', location)
  return response.data
}

export async function deleteLocation(id: string): Promise<void> {
  await api.delete(`/locations/${id}`)
}

// Geocodificación — backend usa Nominatim con caché y rate limit
export interface GeocodeLocation {
  name: string
  lat: number
  lon: number
  display_name: string
  type?: string
}

export async function searchLocations(query: string): Promise<GeocodeLocation[]> {
  const response = await api.get('/geocode/search', { params: { q: query } })
  return response.data
}

export interface ReverseGeocodeResult {
  name: string
  display_name: string
  lat: number
  lon: number
}

export async function reverseGeocode(lat: number, lon: number): Promise<ReverseGeocodeResult> {
  const response = await api.get('/geocode/reverse', { params: { lat, lon } })
  return response.data
}

// Alerts
export async function subscribeToAlerts(locationId: string): Promise<void> {
  await api.post('/notifications/subscribe', { locationId })
}

// ============================================================================
// Alertas (motor de matching del backend)
// ============================================================================

export type AlertChannel = 'push' | 'email' | 'sms'

export interface NotificationEvent {
  id: string
  type: string
  title: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  latitude: number
  longitude: number
  occurredAt: string
  source: string
}

export interface ServerNotification {
  id: string
  channel: AlertChannel
  status: string
  distanceKm: number
  sentAt: string
  readAt: string | null
  event: NotificationEvent
}

export interface AlertsPage {
  notifications: ServerNotification[]
  unread: number
}

export async function fetchNotifications(limit = 50): Promise<AlertsPage> {
  const response = await api.get('/notifications', { params: { limit } })
  return response.data
}

export async function fetchUnreadCount(): Promise<number> {
  const response = await api.get('/notifications/unread-count')
  return response.data.count ?? 0
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.post(`/notifications/${id}/read`)
}

export async function markAllNotificationsRead(): Promise<number> {
  const response = await api.post('/notifications/read-all')
  return response.data.updated ?? 0
}

export async function deleteNotification(id: string): Promise<void> {
  await api.delete(`/notifications/${id}`)
}

/**
 * URL del WebSocket de alertas en vivo.
 * `http://host/api` → `ws://host/ws/alerts?token=…`
 */
export function alertsSocketUrl(): string | null {
  if (!authToken) return null

  // Funciona con base absoluta (http://localhost:3000/api) o relativa (/api)
  const apiUrl = new URL(API_BASE, window.location.origin)
  const base = apiUrl.pathname.replace(/\/api\/?$/, '')
  const protocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${apiUrl.host}${base}/ws/alerts?token=${encodeURIComponent(authToken)}`
}
