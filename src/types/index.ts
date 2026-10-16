export type DisasterType = 'earthquake' | 'storm' | 'flood' | 'rain' | 'landslide' | 'volcanic' | 'hurricane'

export interface DisasterEvent {
  id: string
  type: DisasterType
  title: string
  description: string
  latitude: number
  longitude: number
  magnitude?: number
  intensity?: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  occurredAt: string
  detectedAt: string
  source: string
  rawData?: Record<string, unknown>
}

export interface UserLocation {
  id: string
  name: string
  latitude: number
  longitude: number
  radiusKm: number
}

export interface User {
  id: string
  email: string
  locations: UserLocation[]
  preferences: {
    disasterTypes: DisasterType[]
    pushNotifications: boolean
    emailNotifications: boolean
  }
}

export interface AlertNotification {
  id: string
  eventId: string
  userId: string
  distance_km: number
  sentAt: string
  read: boolean
}
