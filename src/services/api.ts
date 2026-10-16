import axios from 'axios'
import { DisasterEvent } from '../types'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

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

// Alerts
export async function subscribeToAlerts(locationId: string): Promise<void> {
  await api.post('/notifications/subscribe', { locationId })
}
