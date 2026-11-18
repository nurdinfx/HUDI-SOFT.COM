import { useState, useEffect, useCallback } from 'react'
import api from '@/lib/api'

interface UseApiOptions {
  immediate?: boolean
}

export function useApi<T>(url: string, params?: Record<string, any>, options?: UseApiOptions) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async (overrideParams?: Record<string, any>) => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(url, { params: overrideParams ?? params })
      setData(res.data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [url])

  useEffect(() => {
    if (options?.immediate !== false) {
      fetch()
    }
  }, [fetch])

  return { data, loading, error, refetch: fetch }
}

export function useMutation<T>(url: string, method: 'post' | 'put' | 'delete' = 'post') {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutate = useCallback(async (body?: any, id?: string): Promise<T | null> => {
    setLoading(true)
    setError(null)
    try {
      const endpoint = id ? `${url}/${id}` : url
      const res = method === 'delete'
        ? await api.delete(endpoint)
        : await api[method](endpoint, body)
      return res.data
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Operation failed'
      setError(msg)
      throw new Error(msg)
    } finally {
      setLoading(false)
    }
  }, [url, method])

  return { mutate, loading, error }
}
