export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://api.fortislab.id'

export const OWNER_ID =
  process.env.NEXT_PUBLIC_OWNER_ID || ''

// alias yang dipakai beberapa komponen lama
export const API_BASE = API_URL
export const HEALTH_PATH = '/health'
export const VERSION_PATH = '/version'
