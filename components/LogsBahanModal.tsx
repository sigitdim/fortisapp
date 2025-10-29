// components/LogsBahanModal.tsx
'use client'

import React from 'react'
import ErrorBoundary from '@/app/components/ErrorBoundary'
import ChartClient from '@/app/components/ChartClient'
import { rupiah } from '@/lib/format'

type LogItem = {
  id?: string
  created_at?: string
  tanggal?: string
  harga?: number | string | null
  qty?: number | string | null
  catatan?: string | null
}

type Props = {
  open: boolean
  onClose: () => void
  title?: string
  logs: LogItem[] | null | undefined
}

function normalizeLogs(raw: LogItem[] | null | undefined) {
  const arr = Array.isArray(raw) ? raw.slice() : []
  // Urutkan ASC by time yang paling robust
  arr.sort((a, b) => {
    const ta = a.created_at || a.tanggal || ''
    const tb = b.created_at || b.tanggal || ''
    return new Date(ta as string).getTime() - new Date(tb as string).getTime()
  })
  // Siapkan data chart
  const chart = arr.map((it) => {
    const t = it.created_at || it.tanggal || ''
    const label = new Date(t as string).toLocaleDateString('id-ID', {
      year: '2-digit',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
    return {
      tanggal: label,
      harga: typeof it.harga === 'string' ? Number(it.harga) : (it.harga ?? 0),
      qty: typeof it.qty === 'string' ? Number(it.qty) : (it.qty ?? 0),
    }
  })
  return { rows: arr, chart }
}

export default function LogsBahanModal({ open, onClose, title = 'Logs Bahan', logs }: Props) {
  if (!open) return null

  const { rows, chart } = normalizeLogs(logs)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-4xl rounded-2xl bg-white p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-xl border px-3 py-1 text-sm hover:bg-gray-50"
          >
            Tutup
          </button>
        </div>

        <ErrorBoundary>
          <div className="mb-4 rounded-xl border p-3">
            <div className="mb-2 text-sm font-medium text-gray-600">Grafik Harga</div>
            <ChartClient
              data={chart}
              xKey="tanggal"
              lines={[{ dataKey: 'harga', name: 'Harga' }]}
              height={300}
              type="line"
            />
          </div>
        </ErrorBoundary>

        <div className="overflow-auto rounded-xl border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Tanggal</th>
                <th className="px-3 py-2 text-left font-medium">Harga</th>
                <th className="px-3 py-2 text-left font-medium">Qty</th>
                <th className="px-3 py-2 text-left font-medium">Catatan</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const t = r.created_at || r.tanggal || ''
                const label = new Date(t as string).toLocaleString('id-ID')
                const hargaNum = typeof r.harga === 'string' ? Number(r.harga) : (r.harga ?? 0)
                const qtyNum = typeof r.qty === 'string' ? Number(r.qty) : (r.qty ?? 0)
                return (
                  <tr key={r.id ?? i} className="odd:bg-white even:bg-gray-50">
                    <td className="px-3 py-2">{label}</td>
                    <td className="px-3 py-2">{rupiah(hargaNum)}</td>
                    <td className="px-3 py-2">{qtyNum}</td>
                    <td className="px-3 py-2">{r.catatan ?? '-'}</td>
                  </tr>
                )
              })}
              {rows.length === 0 && (
                <tr>
                  <td className="px-3 py-6 text-center text-gray-500" colSpan={4}>
                    Belum ada log.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
