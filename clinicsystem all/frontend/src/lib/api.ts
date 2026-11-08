import axios from 'axios'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:6001/api'
console.log('⚡ [API] Base URL is:', BASE_URL)

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// Recursive snake_case to camelCase converter
function snakeToCamel(str: string): string {
  return str.replace(/([-_][a-z])/gi, ($1) => {
    return $1.toUpperCase().replace('-', '').replace('_', '')
  })
}

function convertKeysToCamel(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map((v) => convertKeysToCamel(v))
  } else if (obj !== null && obj !== undefined && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      const camelKey = snakeToCamel(key)
      result[camelKey] = convertKeysToCamel(obj[key])
      return result
    }, {} as any)
  }
  return obj
}

// Attach JWT and License Key automatically
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const session = localStorage.getItem('dcs_session')
    if (session) {
      try {
        const parsed = JSON.parse(session)
        if (parsed?.token) {
          config.headers.Authorization = `Bearer ${parsed.token}`
        }
      } catch {}
    }

    const licenseKey = localStorage.getItem('hudi_license_key')
    if (licenseKey) {
      config.headers['x-license-key'] = licenseKey
    }
  }
  return config
})

// Global error handling & key transformation
api.interceptors.response.use(
  (res) => {
    if (res.data) {
      res.data = convertKeysToCamel(res.data)
    }
    return res
  },
  (err) => {
    if (typeof window !== 'undefined') {
      if (err.response?.status === 401) {
        localStorage.removeItem('dcs_session')
        window.location.href = '/login'
      } else if (err.response?.status === 403) {
        const data = err.response?.data
        const msg = String(data?.message || data?.error || '')
        if (data?.error === 'SUBSCRIPTION_SUSPENDED' || data?.status === 'Suspended' || msg.includes('Suspended') || msg.includes('hakiyay')) {
          const raw = localStorage.getItem('dcs_session')
          if (raw) {
            try {
              const parsed = JSON.parse(raw)
              parsed.subscriptionStatus = 'Suspended'
              localStorage.setItem('dcs_session', JSON.stringify(parsed))
              window.dispatchEvent(new CustomEvent('dcs_subscription_suspended'))
            } catch {}
          }
        }
      }
    }
    return Promise.reject(err)
  }
)

export default api
