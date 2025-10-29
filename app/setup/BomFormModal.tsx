'use client'

import React, { useEffect, useState } from 'react'

type Bahan = { id: string; nama_bahan: string; satuan?: string | null; harga?: number }
type Item = { bahan_id: string; qty: number; unit: string }

const ownerId =
  (typeof window !== 'undefined' && (localStorage.getItem('x-owner-id') || '')) ||
  (process.env.NEXT_PUBLIC_OWNER_ID as string) ||
  ''

export default function BomFormModal({ onSaved }: { onSaved?: () => void }) {
  const [open, setOpen] = useState(false)
  const [produk, setProduk] = useState('')
  const [items, setItems] = useState<Item[]>([{ bahan_id: '', qty: 0, unit: '' }])
  const [bahanList, setBahanList] = useState<Bahan[]>([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/setup/bahan', { headers: { 'x-owner-id': ownerId } })
      .then((r) => r.json())
      .then((d) => setBahanList(d?.data || []))
      .catch(() => setBahanList([]))
  }, [])

  function updateItem(i: number, key: keyof Item, val: any) {
    setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, [key]: val } : it)))
  }
  function addItem() { setItems((arr) => [...arr, { bahan_id: '', qty: 0, unit: '' }]) }
  function removeItem(i: number) { setItems((arr) => arr.filter((_, idx) => idx !== i)) }

  async function save() {
    setLoading(true); setMsg(null)
    try {
      if (!produk.trim()) throw new Error('Nama produk wajib diisi')
      const invalid = items.find(
        (x) => !/^[0-9a-f-]{36}$/.test(x.bahan_id) || !x.unit || Number(x.qty) <= 0,
      )
      if (invalid) throw new Error('Pastikan bahan_id valid (UUID 36), qty>0, dan unit terisi')

      const res = await fetch('/api/setup/bom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-owner-id': ownerId },
        body: JSON.stringify({ produk, items }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'Gagal simpan BOM')

      setMsg('✅ BOM tersimpan'); onSaved?.(); setTimeout(() => setOpen(false), 800)
    } catch (e: any) {
      setMsg(`❌ ${e.message}`)
    } finally { setLoading(false) }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="px-4 py-2 rounded-xl border hover:bg-gray-100">
        + Tambah BOM
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-xl">
            <h2 className="text-xl font-semibold mb-4">Tambah / Edit BOM</h2>

            <label className="block mb-2 text-sm font-medium">Nama Produk</label>
            <input
              value={produk}
              onChange={(e) => setProduk(e.target.value)}
              className="border rounded-xl px-3 py-2 w-full mb-4"
              placeholder="Contoh: Latte 250ml"
            />

            <div className="space-y-3">
              {items.map((it, i) => (
                <div key={i} className="flex flex-wrap gap-2 items-center">
                  <select
                    value={it.bahan_id}
                    onChange={(e) => updateItem(i, 'bahan_id', e.target.value)}
                    className="border rounded-xl px-3 py-2 flex-1"
                  >
                    <option value="">Pilih Bahan</option>
                    {bahanList.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.nama_bahan} ({b.satuan || '-'})
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    value={it.qty}
                    onChange={(e) => updateItem(i, 'qty', Number(e.target.value))}
                    placeholder="Qty"
                    className="border rounded-xl px-3 py-2 w-24"
                  />

                  <input
                    value={it.unit}
                    onChange={(e) => updateItem(i, 'unit', e.target.value)}
                    placeholder="Unit"
                    className="border rounded-xl px-3 py-2 w-24"
                  />

                  <button onClick={() => removeItem(i)} className="px-3 py-2 border rounded-lg hover:bg-gray-100">
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <button onClick={addItem} className="mt-3 text-sm text-blue-600 hover:underline">
              + Tambah Bahan
            </button>

            {msg && <div className="mt-4 text-sm">{msg}</div>}

            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setOpen(false)} className="px-4 py-2 border rounded-xl">Tutup</button>
              <button onClick={save} disabled={loading} className="px-4 py-2 rounded-xl bg-black text-white disabled:opacity-50">
                {loading ? 'Menyimpan…' : 'Simpan BOM'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
