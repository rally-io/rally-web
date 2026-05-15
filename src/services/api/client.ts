// src/services/api/client.ts
import axios from 'axios'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
})

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('sb-access-token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

client.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response) {
      const { status, data } = error.response

      if (status === 401) {
        return Promise.reject({
          isUnauthorized: true,
          status,
          detail: data?.detail ?? 'Authentication required',
        })
      }

      if (data?.error?.code === 'PROFILE_FIELDS_REQUIRED') {
        return Promise.reject({
          isProfileFieldsRequired: true,
          status,
          ...data.error,
        })
      }

      if (data?.success === false && data?.error) {
        return Promise.reject({
          status,
          code: data.error.code,
          message: data.error.message,
          details: data.error.details,
        })
      }

      if (status === 404) {
        return Promise.reject({
          isNotFound: true,
          status,
          message: data?.detail ?? 'Not found',
        })
      }

      if (data?.detail) {
        return Promise.reject({ status, code: 'SERVER_ERROR', message: data.detail })
      }

      return Promise.reject({ status, code: 'SERVER_ERROR', message: 'An unexpected error occurred' })
    }
    return Promise.reject({ code: 'NETWORK_ERROR', message: 'Network error' })
  },
)

export default client
