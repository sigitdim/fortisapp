// @ts-nocheck
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertCircle,
  X,
  ChevronDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { rupiah } from '@/lib/format';
import { apiGet, apiDelete, apiPut } from '@/lib/api';

const OWNER_ID = process.env.NEXT_PUBLIC_OWNER_ID || '';
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';
const api = (p: string) => (API_BASE ? `${API_BASE}${p}` : p);

/* ================== Types ================== */

type Bahan = {
  id: string;
  nama: string;
  satuan?: string | null;
  harga?: number | null;
};

type SummaryItem = {
  bahan_id: string;
  bahan_nama?: string;
  saldo: number;
  satuan?: string;
  status?: string;
  harga?: number | null;
  batas?: number | null;
};

type LogItem = {
  id: string;
  created_at: string;
  bahan_id: string;
  qty: number;
  tipe: 'in' | 'out' | 'adjust' | 'void';
  is_void: boolean;
  catatan?: string | null;
  saldo_before?: number | null;
  saldo_after?: number | null;
  bahan_nama?: string;
  satuan?: string;
};

/* ================== Utils ================== */

async function fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-owner-id': OWNER_ID,
      ...(options.headers || {}),
    },
    cache: 'no-store',
  });

  const text = await res.text();

  // Kalau HTML, berarti error dari server (Cloudflare / Supabase / Nginx)
  if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
    throw new Error("Server API tidak bisa diakses (HTML error).");
  }

  let json: any = {};
  try {
    json = JSON.parse(text);
  } catch (e) {
    throw new Error("Response bukan JSON valid.");
  }

  if (!res.ok || (json && json.ok === false)) {
    throw new Error(json?.message || res.statusText || "Request failed");
  }

  return (json?.data ?? json) as T;
}

const cn = (...a: (string | false | null | undefined)[]) =>
  a.filter(Boolean).join(' ');

function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-lg bg-gray-100 dark:bg-slate-800',
        className,
      )}
    />
  );
}

function formatQty(n?: number | null, satuan?: string | null) {
  const v = typeof n === 'number' ? n : 0;
  return `${v.toLocaleString('id-ID')} ${satuan || ''}`.trim();
}

function parseNumberFromCurrency(input: string): number {
  const digits = input.replace(/[^0-9]/g, '');
  return digits ? parseInt(digits, 10) : 0;
}

/* ================== Component ================== */

export function InventoryWidget() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [summary, setSummary] = useState<SummaryItem[]>([]);
  const [history, setHistory] = useState<LogItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // modal edit
  const [editingItem, setEditingItem] = useState<SummaryItem | null>(null);
  const [editHarga, setEditHarga] = useState<string>('');
 const [editBatas, setEditBatas] = useState<string>('');  
const [savingEdit, setSavingEdit] = useState(false);

  // modal delete
  const [confirmDelete, setConfirmDelete] = useState<SummaryItem | null>(null);

  // modal tambah inventory (IN/OUT)
  const [showAddModal, setShowAddModal] = useState(false);
  const [addBahanId, setAddBahanId] = useState<string | null>(null);
  const [addType, setAddType] = useState<'in' | 'out'>('in');
  const [addHarga, setAddHarga] = useState<string>('');
  const [addQty, setAddQty] = useState<string>('');
  const [savingAdd, setSavingAdd] = useState(false);
  const [showStockDropdown, setShowStockDropdown] = useState(false);

  // toast
  const [toastMsg, setToastMsg] = useState<string>('');
  const [toastType, setToastType] = useState<'success' | 'error' | null>(null);
  const [showToast, setShowToast] = useState(false);

  const showToastMessage = (
    message: string,
    type: 'success' | 'error' = 'success',
  ) => {
    setToastMsg(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
  };

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      /* 1) Ambil semua bahan dari Setup (SSOT nama + harga + satuan) */
      const bahanRes = await apiGet<any>(`/setup/bahan?t=${Date.now()}`);
      const rawBahan = bahanRes as any;
      const bahanArr = Array.isArray(rawBahan?.data)
        ? rawBahan.data
        : Array.isArray(rawBahan)
        ? rawBahan
        : rawBahan?.items ?? [];

      const bahanList: Bahan[] = bahanArr
        .map((b: any) => ({
          id: b.id,
          nama: b.nama_bahan ?? b.nama ?? '',
          satuan: b.satuan ?? b.unit ?? null,
          harga:
            b.harga != null
              ? Number(b.harga)
              : b.harga_satuan != null
              ? Number(b.harga_satuan)
              : null,
        }))
        .filter((b: Bahan) => b.id && b.nama);

      /* 2) Ambil inventory summary (stok per bahan, optional) */
      let sArr: any[] = [];
      try {
        const sPayload = await fetchJson<any>(
          api(`/api/inventory/summary?t=${Date.now()}`),
        );
        sArr = Array.isArray(sPayload?.data)
          ? sPayload.data
          : Array.isArray(sPayload)
          ? sPayload
          : sPayload?.items ?? [];
      } catch {
        sArr = [];
      }

      const summaryMap: Record<string, any> = {};
      sArr.forEach((x: any) => {
        const key = x.bahan_id ?? x.id;
        if (key) summaryMap[key] = x;
      });

      // 3) COMBINED LIST: looping dari Setup Bahan, suntik stok dari summary
const combined: SummaryItem[] = bahanList.map((b) => {
  const s = summaryMap[b.id] || {};

  // cari batas dari summary (inventory)
  const batasFromSummary =
    s.ambang_batas ??
    s.ambang_batas_stok ??
    s.ambang_batas_stock ??
    s.batas_minimum ??
    s.batas_stok ??
    s.batas_stock ??
    s.min_stock ??
    s.min_stok ??
    s.min_qty ??
    s.stok_min ??
    s.stok_minimum ??
    s.threshold ??
    s.batas ??
    null;

  // fallback: kalau BE naro batas di tabel bahan (setup)
  const batasFromSetup =
    b.ambang_batas ??
    b.ambang_batas_stok ??
    b.batas_minimum ??
    b.batas_stok ??
    b.min_stock ??
    b.min_stok ??
    b.stok_min ??
    b.stok_minimum ??
    b.threshold ??
    b.batas ??
    null;

  const finalBatas = batasFromSummary ?? batasFromSetup ?? null;

  const hargaSummary =
    s.harga_per_unit ?? s.harga_satuan ?? s.harga ?? s.price ?? null;

  return {
    bahan_id: b.id,
    bahan_nama: b.nama,
    saldo: Number(s.saldo ?? s.stok_total ?? 0),
    satuan: b.satuan ?? s.satuan ?? s.unit ?? '-',
    status: s.status ?? undefined,
    harga:
      b.harga != null
        ? Number(b.harga)
        : hargaSummary != null
        ? Number(hargaSummary)
        : null,
    // BATAS sekarang keisi kalau salah satu field di atas ada
    batas: finalBatas != null ? Number(finalBatas) : null,
  };
});

      setSummary(combined);

      /* SELECTION BEHAVIOUR:
         - Tidak auto pilih baris pertama.
         - Kalau sebelumnya ada selectedId tapi itemnya sudah hilang, reset ke null.
      */
      if (selectedId) {
        const stillExists = combined.some((s) => s.bahan_id === selectedId);
        if (!stillExists) {
          setSelectedId(null);
        }
      }

      /* 4) History 7 hari (untuk grafik + riwayat) */
      try {
        const until = new Date();
        const since = new Date(Date.now() - 7 * 86400000);
        const q = new URLSearchParams({
          since: since.toISOString(),
          until: until.toISOString(),
          limit: '200',
        });

        const hPayload = await fetchJson<any>(
          api(`/api/inventory/history?${q.toString()}&t=${Date.now()}`),
        );
        const hArr = Array.isArray(hPayload?.data)
          ? hPayload.data
          : Array.isArray(hPayload)
          ? hPayload
          : hPayload?.items ?? [];
        setHistory(hArr);
      } catch {
        setHistory([]);
      }
    } catch (e: any) {
      setErr(e.message || 'Gagal memuat data inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Listener global reload
  useEffect(() => {
    const h = () => load();
    window.addEventListener('inv:summary-reload', h as any);
    return () => window.removeEventListener('inv:summary-reload', h as any);
  }, []);

  const filteredSummary = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return summary;
    return summary.filter((s) =>
      (s.bahan_nama || s.bahan_id).toLowerCase().includes(q),
    );
  }, [summary, search]);

  const selectedItem = useMemo(
    () => summary.find((s) => s.bahan_id === selectedId) || null,
    [summary, selectedId],
  );

  const selectedHistory = useMemo(() => {
    if (!selectedId) return [];
    return [...history]
      .filter((h) => h.bahan_id === selectedId && !h.is_void)
      .sort(
        (a, b) =>
          +new Date(a.created_at || '') - +new Date(b.created_at || ''),
      );
  }, [history, selectedId]);

  const chartData = useMemo(
    () =>
      selectedHistory.map((r) => ({
        t: new Date(r.created_at).toLocaleDateString('id-ID', {
          day: '2-digit',
          month: '2-digit',
        }),
        IN:
          r.tipe === 'in'
            ? r.qty
            : r.tipe === 'adjust' && r.qty > 0
            ? Math.abs(r.qty)
            : 0,
        OUT:
          r.tipe === 'out'
            ? Math.abs(r.qty)
            : r.tipe === 'adjust' && r.qty < 0
            ? Math.abs(r.qty)
            : 0,
      })),
    [selectedHistory],
  );

  const latest10 = useMemo(
    () =>
      [...selectedHistory]
        .sort(
          (a, b) =>
            +new Date(b.created_at || '') - +new Date(a.created_at || ''),
        )
        .slice(0, 10),
    [selectedHistory],
  );

  const isLowStock =
    selectedItem &&
    (selectedItem.status?.toLowerCase?.() === 'low' ||
      (selectedItem.batas != null &&
        selectedItem.batas > 0 &&
        selectedItem.saldo <= selectedItem.batas));

  const hasSelected = !!selectedItem;

  /* ================== Handlers Edit / Delete ================== */

  const openEditModal = (item: SummaryItem) => {
    setEditingItem(item);
    setEditHarga(item.harga != null ? String(item.harga) : '');
    setEditBatas(item.batas != null ? String(item.batas) : ''); // isi awal dari batas
  };

  const closeEditModal = () => {
    setEditingItem(null);
    setEditHarga('');
    setEditBatas('');
    setSavingEdit(false);
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;

    const hargaNumber = parseNumberFromCurrency(editHarga);
    const batasNumber =
      editBatas.trim() === '' ? null : parseNumberFromCurrency(editBatas);

    try {
      setSavingEdit(true);

      const payload: any = {
        nama_bahan: editingItem.bahan_nama,
        satuan: editingItem.satuan,
        harga: hargaNumber,
      };

      // kirim batas kalau diisi
      if (batasNumber != null) {
        payload.ambang_batas_stock = batasNumber; // kemungkinan nama field BE
        payload.batas_minimum = batasNumber;      // fallback lain
        payload.min_stock = batasNumber;          // fallback lain
      }

      await apiPut(`/setup/bahan/${editingItem.bahan_id}`, payload);

      await load();
      closeEditModal();
      showToastMessage('Data bahan berhasil diperbarui.', 'success');
    } catch (e: any) {
      showToastMessage(e?.message || 'Gagal menyimpan perubahan.', 'error');
      setSavingEdit(false);
    }
  };

  const openDeleteModal = (item: SummaryItem) => {
    setConfirmDelete(item);
  };

  const closeDeleteModal = () => {
    setConfirmDelete(null);
    setDeletingId(null);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      setDeletingId(confirmDelete.bahan_id);
      await apiDelete(`/setup/bahan/${confirmDelete.bahan_id}`);
      await load();
      closeDeleteModal();
      showToastMessage('Bahan berhasil dihapus.', 'success');
    } catch (e: any) {
      showToastMessage(e?.message || 'Gagal menghapus bahan.', 'error');
      setDeletingId(null);
    }
  };

  /* ================== Handlers Tambah Inventory (IN/OUT) ================== */

  const openAddModal = () => {
    setAddBahanId(selectedId || (summary[0]?.bahan_id ?? null));
    setAddType('in');
    setAddHarga('');
    setAddQty('');
    setShowAddModal(true);
    setShowStockDropdown(false);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setSavingAdd(false);
  };

  const addSelectedItem = useMemo(
    () => summary.find((s) => s.bahan_id === addBahanId) || null,
    [summary, addBahanId],
  );

  const handleSubmitAdd = async () => {
    if (!addBahanId) {
      showToastMessage('Pilih bahan terlebih dahulu.', 'error');
      return;
    }
    const qtyNum = parseNumberFromCurrency(addQty);
    if (!qtyNum || qtyNum <= 0) {
      showToastMessage('Jumlah harus lebih dari 0.', 'error');
      return;
    }
    const hargaNum =
      addHarga.trim() === '' ? null : parseNumberFromCurrency(addHarga);

    try {
      setSavingAdd(true);

      const endpoint =
        addType === 'in' ? '/api/inventory/in' : '/api/inventory/out';

      const payload: any = {
        bahan_id: addBahanId,
        qty: qtyNum,
      };
      if (addType === 'in' && hargaNum != null) {
        payload.harga_beli = hargaNum;
      }

      await fetchJson<any>(api(endpoint), {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      await load();
      setSelectedId(addBahanId);
      closeAddModal();
      showToastMessage('Inventory berhasil diperbarui.', 'success');

      try {
        window.dispatchEvent(new Event('inv:summary-reload'));
      } catch {}
    } catch (e: any) {
      showToastMessage(e?.message || 'Gagal menambah inventory.', 'error');
      setSavingAdd(false);
    }
  };

  /* ================== Render ================== */

  return (
    <>
      {/* grid: kalau belum ada yang kepilih, 1 kolom; kalau ada, 2 kolom */}
      <div
        className={cn(
          'mt-4 grid gap-4',
          hasSelected && 'md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]',
        )}
      >
        {/* LEFT: List Inventory */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 md:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg md:text-2xl font-semibold">Inventory</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full bg-red-700 hover:bg-red-800 text-white text-sm px-4 py-2"
                onClick={openAddModal}
              >
                <Plus className="h-4 w-4" />
                <span>Tambah +</span>
              </button>
              <div className="relative hidden sm:block">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari bahan..."
                  className="w-48 rounded-full border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-7 pr-3 py-1.5 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Search mobile */}
          <div className="relative mb-3 sm:hidden">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari bahan..."
              className="w-full rounded-full border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-7 pr-3 py-1.5 text-sm"
            />
          </div>

          {err && (
            <div className="mb-2 text-xs text-red-600 dark:text-rose-400">
              {err}
            </div>
          )}

          {loading ? (
            <Skeleton className="h-52" />
          ) : filteredSummary.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-500 dark:text-slate-400">
              Belum ada data inventory.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400">
                    <th className="py-2 pr-3 text-left font-medium">Nama</th>
                    <th className="py-2 px-3 text-left font-medium">Harga</th>
                    <th className="py-2 px-3 text-left font-medium">
                      Sisa Stock
                    </th>
                    <th className="py-2 px-3 text-left font-medium">Batas</th>
                    <th className="py-2 pl-3 text-center font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSummary.map((item) => {
                    const active = item.bahan_id === selectedId;
                    const batas =
                      item.batas != null && item.batas > 0 ? item.batas : null;
                    const low =
                      item.status?.toLowerCase?.() === 'low' ||
                      (batas && item.saldo <= batas);
                    const displayName = item.bahan_nama || item.bahan_id;

                    return (
                      <tr
                        key={item.bahan_id}
                        className={cn(
                          'cursor-pointer border-b last:border-b-0 transition-colors',
                          active
                            ? 'bg-red-50/70 dark:bg-red-900/20'
                            : 'hover:bg-gray-50 dark:hover:bg-slate-800',
                        )}
                        // TOGGLE: klik lagi bahan yg sama => hide panel
                        onClick={() =>
                          setSelectedId((prev) =>
                            prev === item.bahan_id ? null : item.bahan_id,
                          )
                        }
                      >
                        <td className="py-2 pr-3">
                          <button
                            type="button"
                            className="max-w-[200px] text-left text-sm font-medium text-blue-700 hover:underline truncate"
                            title={displayName}
                          >
                            {displayName}
                          </button>
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          {item.harga != null ? rupiah(item.harga) : '-'}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <span>{formatQty(item.saldo, item.satuan)}</span>
                            {low && (
                              <span className="h-2 w-2 rounded-full bg-red-500" />
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          {batas ? formatQty(batas, item.satuan) : '-'}
                        </td>
                        <td className="py-2 pl-3 text-center">
                          <div className="inline-flex items-center gap-2 text-gray-500">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditModal(item);
                              }}
                              className="hover:text-red-700"
                              aria-label="Edit"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openDeleteModal(item);
                              }}
                              className="hover:text-red-700"
                              aria-label="Hapus"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* RIGHT: Detail + Grafik + Riwayat – animasi muncul/hilang */}
        <AnimatePresence>
          {hasSelected && selectedItem && (
            <motion.section
              key={selectedItem.bahan_id}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 md:p-5"
            >
              {loading ? (
                <Skeleton className="h-64" />
              ) : (
                <>
                  {/* Header detail */}
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl md:text-2xl font-semibold break-words">
                          {selectedItem.bahan_nama || selectedItem.bahan_id}
                        </h3>
                        {isLowStock && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-xs font-medium">
                            <AlertCircle className="h-3 w-3" />
                            <span>Low Stock</span>
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                        Ambang batas stok:{' '}
                        {selectedItem.batas
                          ? formatQty(selectedItem.batas, selectedItem.satuan)
                          : 'Belum diatur'}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400">
                        Sisa Stok
                      </div>
                      <div className="text-2xl md:text-3xl font-bold">
                        {formatQty(selectedItem.saldo, selectedItem.satuan)}
                      </div>
                    </div>
                  </div>

                  {/* Grafik */}
                  <div className="mb-4 rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/40 px-3 py-3">
                    {chartData.length === 0 ? (
                      <div className="flex h-40 items-center justify-center text-xs text-gray-500 dark:text-slate-400">
                        Belum ada mutasi stok 7 hari terakhir untuk bahan ini.
                      </div>
                    ) : (
                      <div className="h-40">
                        <ResponsiveContainer>
                          <AreaChart
                            data={chartData}
                            margin={{ left: 8, right: 8, top: 10, bottom: 0 }}
                          >
                            <defs>
                              <linearGradient
                                id="invIN"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                              >
                                <stop
                                  offset="5%"
                                  stopColor="#16a34a"
                                  stopOpacity={0.6}
                                />
                                <stop
                                  offset="95%"
                                  stopColor="#16a34a"
                                  stopOpacity={0.05}
                                />
                              </linearGradient>
                              <linearGradient
                                id="invOUT"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                              >
                                <stop
                                  offset="5%"
                                  stopColor="#ef4444"
                                  stopOpacity={0.6}
                                />
                                <stop
                                  offset="95%"
                                  stopColor="#ef4444"
                                  stopOpacity={0.05}
                                />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="t" />
                            <YAxis />
                            <Tooltip />
                            <Area
                              type="monotone"
                              dataKey="IN"
                              name="IN"
                              stroke="#16a34a"
                              fill="url(#invIN)"
                            />
                            <Area
                              type="monotone"
                              dataKey="OUT"
                              name="OUT"
                              stroke="#ef4444"
                              fill="url(#invOUT)"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>

                  {/* Riwayat */}
                  <div>
                    <div className="mb-2 text-sm font-semibold">
                      Riwayat Transaksi Terakhir
                    </div>
                    {latest10.length === 0 ? (
                      <div className="text-xs text-gray-500 dark:text-slate-400">
                        Belum ada transaksi untuk bahan ini.
                      </div>
                    ) : (
                      <div className="max-h-56 overflow-y-auto">
                        <table className="min-w-full text-xs">
                          <tbody>
                            {latest10.map((r) => {
                              const isIn = r.tipe === 'in';
                              const isOut = r.tipe === 'out';
                              const isAdj = r.tipe === 'adjust';
                              const sign =
                                isOut || (isAdj && r.qty < 0) ? '-' : '+';
                              const color =
                                isIn || (isAdj && r.qty > 0)
                                  ? 'text-emerald-600'
                                  : isOut || (isAdj && r.qty < 0)
                                  ? 'text-red-600'
                                  : 'text-gray-700';

                              return (
                                <tr
                                  key={r.id}
                                  className="border-b last:border-b-0 border-gray-100 dark:border-slate-800"
                                >
                                  <td className="py-1 pr-2 align-top">
                                    <span
                                      className={cn(
                                        'inline-flex min-w-[34px] justify-center rounded-full px-2 py-0.5 text-[10px] font-semibold',
                                        isIn || (isAdj && r.qty > 0)
                                          ? 'bg-emerald-50 text-emerald-700'
                                          : isOut || (isAdj && r.qty < 0)
                                          ? 'bg-red-50 text-red-700'
                                          : 'bg-gray-100 text-gray-700',
                                      )}
                                    >
                                      {r.tipe.toUpperCase()}
                                    </span>
                                  </td>
                                  <td
                                    className={cn(
                                      'py-1 px-2 align-top',
                                      color,
                                    )}
                                  >
                                    {sign}
                                    {Math.abs(r.qty).toLocaleString('id-ID')}{' '}
                                    {r.satuan || selectedItem.satuan || ''}
                                  </td>
                                  <td className="py-1 px-2 align-top text-gray-500 dark:text-slate-400 whitespace-nowrap">
                                    {new Date(
                                      r.created_at,
                                    ).toLocaleDateString('id-ID', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: 'numeric',
                                    })}
                                  </td>
                                  <td className="py-1 px-2 align-top text-gray-500 dark:text-slate-400">
                                    {r.catatan || '-'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
            </motion.section>
          )}
        </AnimatePresence>
      </div>

      {/* MODAL2 & TOAST tetap sama seperti sebelumnya */}

      {/* ========== MODAL EDIT HARGA ========== */}
      {editingItem && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 shadow-lg border border-gray-200 dark:border-slate-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Ubah Data Bahan</h3>
        <button
          type="button"
          onClick={closeEditModal}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-2 text-xs text-gray-500 dark:text-slate-400">
        {editingItem.bahan_nama}
      </div>

      {/* Harga */}
      <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
        Harga Satuan
      </label>
      <input
        type="text"
        value={editHarga}
        onChange={(e) => setEditHarga(e.target.value)}
        placeholder="Masukkan harga (contoh: 5000)"
        className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
      />
      <p className="mt-1 text-[11px] text-gray-500 dark:text-slate-400 mb-3">
        Perubahan harga di sini akan otomatis mengubah harga di Setup Bahan.
      </p>

      {/* Batas / ambang stok */}
      <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
        Batas Minimal Stok (opsional)
      </label>
      <input
        type="text"
        value={editBatas}
        onChange={(e) => setEditBatas(e.target.value)}
        placeholder="Contoh: 1000"
        className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
      />
      <p className="mt-1 text-[11px] text-gray-500 dark:text-slate-400">
        Jika diisi, stok di bawah angka ini akan dianggap <b>Low Stock</b> di halaman Inventory.
      </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeEditModal}
                className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className={cn(
                  'px-3 py-1.5 text-xs rounded-lg bg-red-700 text-white hover:bg-red-800',
                  savingEdit && 'opacity-60 cursor-not-allowed',
                )}
              >
                {savingEdit ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== MODAL DELETE ========== */}
      {confirmDelete && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 shadow-lg border border-gray-200 dark:border-slate-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-red-700">
                Hapus Bahan
              </h3>
              <button
                type="button"
                onClick={closeDeleteModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-gray-700 dark:text-slate-200 mb-3">
              Yakin ingin menghapus bahan{' '}
              <span className="font-semibold">
                {confirmDelete.bahan_nama}
              </span>{' '}
              dari Setup? Data inventory yang terkait bahan ini juga akan
              terpengaruh.
            </p>
            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeDeleteModal}
                className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deletingId === confirmDelete.bahan_id}
                className={cn(
                  'px-3 py-1.5 text-xs rounded-lg bg-red-700 text-white hover:bg-red-800',
                  deletingId === confirmDelete.bahan_id &&
                    'opacity-60 cursor-not-allowed',
                )}
              >
                {deletingId === confirmDelete.bahan_id
                  ? 'Menghapus...'
                  : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== MODAL TAMBAH INVENTORY (IN/OUT) ========== */}
      {showAddModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 shadow-xl border border-gray-200 dark:border-slate-700 px-6 py-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg md:text-xl font-semibold">
                Update Inventory
              </h3>
              <button
                type="button"
                onClick={closeAddModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Pilih stock */}
            <label className="block text-xs font-semibold text-gray-700 dark:text-slate-200 mb-1">
              Pilih Stock
            </label>
            <div className="relative mb-4">
              <button
                type="button"
                onClick={() => setShowStockDropdown((v) => !v)}
                className="flex w-full items-center justify-between rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
              >
                <span className="truncate">
                  {addSelectedItem?.bahan_nama || 'Pilih bahan'}
                </span>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </button>
              {showStockDropdown && (
                <div className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg text-sm">
                  {summary.map((s) => (
                    <button
                      key={s.bahan_id}
                      type="button"
                      onClick={() => {
                        setAddBahanId(s.bahan_id);
                        setShowStockDropdown(false);
                      }}
                      className={cn(
                        'flex w-full items-center justify-between px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-slate-800',
                        addBahanId === s.bahan_id &&
                          'bg-red-50/80 dark:bg-red-900/30',
                      )}
                    >
                      <span className="truncate">{s.bahan_nama}</span>
                      <span className="ml-2 text-[11px] text-gray-400">
                        {s.satuan || ''}
                      </span>
                    </button>
                  ))}
                  {summary.length === 0 && (
                    <div className="px-3 py-2 text-xs text-gray-400">
                      Belum ada bahan.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* IN / OUT toggle */}
            <div className="mb-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setAddType('in');
                }}
                className={cn(
                  'w-1/2 rounded-full border px-3 py-2 text-xs font-semibold',
                  addType === 'in'
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                    : 'bg-white dark:bg-slate-900 text-gray-600 border-gray-200 dark:border-slate-700',
                )}
              >
                IN
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddType('out');
                  setAddHarga('');
                }}
                className={cn(
                  'w-1/2 rounded-full border px-3 py-2 text-xs font-semibold',
                  addType === 'out'
                    ? 'bg-red-100 text-red-700 border-red-300'
                    : 'bg-white dark:bg-slate-900 text-gray-600 border-gray-200 dark:border-slate-700',
                )}
              >
                OUT
              </button>
            </div>

            {/* Harga Beli hanya untuk IN */}
            {addType === 'in' && (
              <>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-200 mb-1">
                  Harga Beli
                </label>
                <input
                  type="text"
                  value={addHarga}
                  onChange={(e) => setAddHarga(e.target.value)}
                  placeholder="Optional, contoh: 50000"
                  className="mb-4 w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                />
              </>
            )}

            {/* Jumlah */}
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-xs font-semibold text-gray-700 dark:text-slate-200">
                Jumlah
              </label>
              <span className="text-xs text-gray-500 dark:text-slate-400">
                Satuan: {addSelectedItem?.satuan || '-'}
              </span>
            </div>
            <div className="mb-5 flex items-center gap-2">
              <input
                type="text"
                value={addQty}
                onChange={(e) => setAddQty(e.target.value)}
                placeholder="Masukkan jumlah"
                className="flex-1 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
              />
              <div className="w-16 text-center text-sm font-semibold text-gray-700 dark:text-slate-200">
                {addSelectedItem?.satuan || ''}
              </div>
            </div>

            <button
              type="button"
              onClick={handleSubmitAdd}
              disabled={savingAdd}
              className={cn(
                'mt-1 w-full rounded-full bg-red-700 py-2.5 text-sm font-semibold text-white hover:bg-red-800',
                savingAdd && 'opacity-60 cursor-not-allowed',
              )}
            >
              {savingAdd ? 'Menyimpan...' : 'Tambah Inventory'}
            </button>
          </div>
        </div>
      )}

      {/* ========== TOAST ========== */}
      {showToast && toastType && (
        <div className="fixed top-20 right-6 z-50">
          <div
            className={cn(
              'rounded-2xl px-4 py-3 text-sm shadow-lg border flex items-center gap-2 bg-white dark:bg-slate-900',
              toastType === 'success'
                ? 'border-emerald-200 text-emerald-700'
                : 'border-red-200 text-red-700',
            )}
          >
            <span className="font-medium">
              {toastType === 'success' ? 'Berhasil' : 'Gagal'}
            </span>
            <span className="text-xs">{toastMsg}</span>
          </div>
        </div>
      )}
    </>
  );
}

export default InventoryWidget;

