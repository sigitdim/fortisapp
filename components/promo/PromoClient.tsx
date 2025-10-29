'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { api, apiGet, apiPost } from '@/lib/api'

type PromoType = 'diskon' | 'b1g1' | 'tebus' | 'bundling'

export type Produk = { id: string; nama: string }
export type PromoRow = {
  id: string
  nama: string
  type: PromoType
  aktif: boolean
  nilai?: number | null
  tipe?: 'percent' | 'nominal' | null
  produk_ids?: string[] | null
}

export type PromoUpsertBody = {
  nama: string
  type: PromoType
  aktif: boolean
  nilai?: number | null
  tipe?: 'percent' | 'nominal' | null
  produk_id?: string | null
  produk_ids?: string[] | null
}

export type PromoUpsertResp = { ok: boolean; data?: PromoRow }

export default function PromoClient() {
  const [promos, setPromos] = useState<PromoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  // form
  const [namaPromo, setNamaPromo] = useState('')
  const [tipePromo, setTipePromo] = useState<PromoType>('diskon')
  const [nilai, setNilai] = useState<number | ''>('')
  const [selectedProdukIds, setSelectedProdukIds] = useState<string[]>([])
  const [aktif, setAktif] = useState(true)

  const [produkList, setProdukList] = useState<Produk[]>([])

  // load produk & promos
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true); setErr(null)
        const [{ data: list }, pr] = await Promise.all([
          apiGet<{ data: Produk[] }>('/setup/produk'),
          apiGet<{ data: PromoRow[] }>('/promo')
        ])
        if (!cancelled) {
          setProdukList(list ?? [])
          setPromos(pr?.data ?? (Array.isArray(pr) ? (pr as any) : []))
        }
      } catch (e: any) {
        if (!cancelled) setErr(String(e?.message ?? e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const listPromos = useMemo(() => promos, [promos])

  async function resetForm() {
    setNamaPromo('')
    setTipePromo('diskon')
    setNilai('')
    setSelectedProdukIds([])
    setAktif(true)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      setErr(null)
      const body: PromoUpsertBody = {
        nama: namaPromo.trim(),
        type: tipePromo,
        aktif,
        produk_id: selectedProdukIds[0] || null,
        produk_ids: selectedProdukIds.length ? selectedProdukIds : null,
      }
      if (tipePromo === 'diskon') {
        body.tipe = 'percent'
        body.nilai = typeof nilai === 'string' ? Number(nilai || 0) : nilai
      }

      const resp = await apiPost<PromoUpsertResp>('/promo', body)
      if (resp?.ok) {
        // refresh
        const { data } = await apiGet<{ data: PromoRow[] }>('/promo')
        setPromos(data ?? [])
        await resetForm()
      } else {
        throw new Error('Gagal menyimpan promo')
      }
    } catch (e: any) {
      setErr(String(e?.message ?? e))
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="rounded-2xl border p-4 space-y-3">
        <div className="text-base font-semibold">Tambah/Update Promo</div>
        {err && <div className="text-sm text-red-600">{err}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">Nama Promo</span>
            <input value={namaPromo} onChange={e=>setNamaPromo(e.target.value)} className="border rounded-xl p-2" />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">Tipe</span>
            <select value={tipePromo} onChange={e=>setTipePromo(e.target.value as PromoType)} className="border rounded-xl p-2">
              <option value="diskon">Diskon</option>
              <option value="b1g1">Beli 1 Gratis 1</option>
              <option value="tebus">Tebus Murah</option>
              <option value="bundling">Bundling</option>
            </select>
          </label>

          {tipePromo === 'diskon' && (
            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-600">Nilai (%)</span>
              <input type="number" min={0} max={100} value={nilai} onChange={e=>setNilai(e.target.value === '' ? '' : Number(e.target.value))} className="border rounded-xl p-2" />
            </label>
          )}

          <label className="flex items-center gap-2">
            <input type="checkbox" checked={aktif} onChange={e=>setAktif(e.target.checked)} />
            <span className="text-sm">Aktif</span>
          </label>

          <label className="flex flex-col gap-1 md:col-span-2">
            <span className="text-sm text-gray-600">Produk</span>
            <select multiple className="border rounded-xl p-2 h-28"
              value={selectedProdukIds}
              onChange={e=>{
                const opts = Array.from(e.currentTarget.selectedOptions).map(o=>o.value)
                setSelectedProdukIds(opts)
              }}>
              {produkList.map(p => <option key={p.id} value={p.id}>{p.nama}</option>)}
            </select>
          </label>
        </div>

        <button type="submit" className="px-4 py-2 rounded-xl border hover:bg-gray-50">Simpan</button>
      </form>

      <div className="rounded-2xl border">
        <div className="px-4 py-2 text-sm text-gray-600">Daftar Promo</div>
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">Nama</th>
              <th className="px-3 py-2 text-left">Tipe</th>
              <th className="px-3 py-2 text-left">Nilai</th>
              <th className="px-3 py-2 text-left">Aktif</th>
            </tr>
          </thead>
          <tbody>
            {listPromos.map((r,i)=>(
              <tr key={r.id ?? i} className="odd:bg-white even:bg-gray-50">
                <td className="px-3 py-2">{r.nama}</td>
                <td className="px-3 py-2">{r.type}</td>
                <td className="px-3 py-2">{r.nilai ?? '-'}</td>
                <td className="px-3 py-2">{r.aktif ? 'Ya' : 'Tidak'}</td>
              </tr>
            ))}
            {listPromos.length === 0 && (
              <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-500">Belum ada promo.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
