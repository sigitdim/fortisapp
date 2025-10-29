'use client'
import { useEffect, useState } from 'react'
import { apiGet } from '@/lib/api'

export type PricingRow = Record<string, any>
export type PricingResponse = { data?: PricingRow[] } | PricingRow[] | any

export function usePricingFinal(path: string = '/pricing/final') {
  const [data, setData] = useState<PricingRow[] | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await apiGet<PricingResponse>(path)
        const rows = Array.isArray(res) ? res : (res?.data ?? [])
        if (!cancelled) setData(rows as PricingRow[])
      } catch (e: any) {
        if (!cancelled) setError(String(e?.message ?? e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [path])

  return { data, loading, error }
}
export default usePricingFinal
