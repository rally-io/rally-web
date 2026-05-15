// src/services/api/client.ts
import axios from 'axios'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
})

// Attach auth token from localStorage
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('sb-access-token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Extract data on success, throw typed error on failure
client.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response) {
      const { status, data } = error.response
      if (status === 401) {
        return Promise.reject({ isUnauthorized: true, detail: data.detail })
      }
      if (data?.error?.code === 'PROFILE_FIELDS_REQUIRED') {
        return Promise.reject({ isProfileFieldsRequired: true, ...data.error })
      }
      if (data?.success === false) {
        return Promise.reject(data.error)
      }
      if (data?.detail) {
        return Promise.reject({ code: 'SERVER_ERROR', message: data.detail })
      }
    }
    return Promise.reject({ code: 'NETWORK_ERROR', message: 'Network error' })
  },
)

export default client