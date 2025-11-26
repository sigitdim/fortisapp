'use client';

export const runtime = 'nodejs';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { api } from '@/app/lib/api';

/* ========= Types ========= */

type MarginRow = {
  nama_produk: string;
  hpp: number;
  harga_jual: number;
  margin_pct: number;
};

type LowStockRow = {
  bahan_nama: string;
  saldo_stok: number;
  satuan_dasar: string;
};

type StockLog = {
  bahan_nama: string;
  qty: number;
  type: 'in' | 'out';
  satuan_dasar?: string;
  saldo_after?: number;
  saldo_setelah?: number;
  created_at?: string;
};

type PromoRec = {
  nama_produk: string;
  rekomendasi: string;
  alasan?: string;
};

type OverviewMeta = {
  low_stock_threshold?: number;
  recent_days?: number;
  generated_at?: string;
  total_produk?: number;
  avg_margin_pct?: number;
};

type Overview = {
  margin_top: MarginRow[];
  margin_bottom: MarginRow[];
  low_stock: LowStockRow[];
  recent_stock_in: StockLog[];
  recent_stock_out: StockLog[];
  promo_recommendations: PromoRec[];
  meta?: OverviewMeta;
};

type MenuItem = {
  id: string;
  nama_menu: string;
  total_hpp: number;
  harga_jual: number;
  biaya_overhead_per_unit?: number;
  margin_pct?: number;
};

type PromoItem = {
  id: string;
  nama?: string;
  type?: string; // diskon | b1g1 | tebus | bundling | ...
  tipe?: string; // percent | nominal (subtype diskon)
  nilai?: number;
  produk_id?: string;
  produk_ids?: string[];
  aktif?: boolean;
  created_at?: string;
};

type PromoRowUI = {
  nama: string;
  rekomendasi: string;
  alasan: string;
};

/* ========= Component ========= */

export default function DashboardPage() {
  const supabase = createClientComponentClient();

  const [ov, setOv] = useState<Overview | null>(null);
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [promos, setPromos] = useState<PromoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ownerId, setOwnerId] = useState<string | undefined>(undefined);
  const [userName, setUserName] = useState<string>('User');

  const LOW_STOCK_PARAM = 20;

  /* ===== Ambil user + owner_id dari Supabase (SSOT multi user v2) ===== */
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const user = data?.user;

        const nm =
          (user?.user_metadata as any)?.full_name ||
          user?.email ||
          'User';
        setUserName(nm.split('@')[0]);

        const oid =
          (user?.user_metadata as any)?.owner_id ||
          (user?.user_metadata as any)?.owner ||
          '';

        setOwnerId(oid || '');
      } catch {
        setUserName('User');
        setOwnerId('');
      }
    })();
  }, [supabase]);

  /* ===== Loader utama dashboard ===== */
  async function load() {
    // tunggu sampai ownerId kebaca (undefined = belum siap)
    if (ownerId === undefined) return;

    try {
      setLoading(true);
      setErr(null);

      const headers: Record<string, string> = {};
      if (ownerId) headers['x-owner-id'] = ownerId;

      const [overviewRes, menuRes, promoRes] = await Promise.all([
        api(`/dashboard/overview?low_stock=${LOW_STOCK_PARAM}`, { headers }),
        api('/menu', { headers }),
        api('/promo', { headers }),
      ]);

      // overview dari BE
      const d: Overview = overviewRes?.data ?? overviewRes ?? ({} as any);
      const normalized: Overview = {
        margin_top: Array.isArray(d?.margin_top) ? d.margin_top : [],
        margin_bottom: Array.isArray(d?.margin_bottom)
          ? d.margin_bottom
          : [],
        low_stock: Array.isArray(d?.low_stock) ? d.low_stock : [],
        recent_stock_in: Array.isArray(d?.recent_stock_in)
          ? d.recent_stock_in
          : [],
        recent_stock_out: Array.isArray(d?.recent_stock_out)
          ? d.recent_stock_out
          : [],
        promo_recommendations: Array.isArray(d?.promo_recommendations)
          ? d.promo_recommendations
          : [],
        meta: d?.meta ?? {},
      };
      setOv(normalized);

      // menu: sumber HPP + overhead + margin (harus match /menu & promo)
      const menuData: any = menuRes?.data ?? menuRes ?? [];
      const list: MenuItem[] = Array.isArray(menuData) ? menuData : [];
      setMenus(list);

      // promo: ambil langsung dari kalkulator promo (diskon/bundling/b1g1/tebus)
      const promoData: any = promoRes?.data ?? promoRes ?? [];
      const promoList: PromoItem[] = Array.isArray(promoData)
        ? promoData
        : [];
      setPromos(promoList);
    } catch (e: any) {
      console.error('[Dashboard] load error', e);
      setErr(e?.message || 'Gagal memuat dashboard');
      setOv(null);
      setMenus([]);
      setPromos([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (ownerId !== undefined) {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerId]);

  /* ===== KPI dari MENU (harus sama dengan Daftar Menu & Promo) ===== */

  const totalProduk = useMemo(() => {
    if (ov?.meta?.total_produk != null) return ov.meta.total_produk;
    if (menus.length) return menus.length;

    const marginAll: MarginRow[] = (ov?.margin_top || []).concat(
      ov?.margin_bottom || [],
    );
    return marginAll.length;
  }, [ov?.meta?.total_produk, menus, ov?.margin_top, ov?.margin_bottom]);

  const avgMarginPct = useMemo(() => {
    if (ov?.meta?.avg_margin_pct != null) {
      return Math.round(ov.meta.avg_margin_pct * 10) / 10;
    }

    if (menus.length) {
      const total = menus.reduce((sum, m) => {
        const cost =
          (m.total_hpp || 0) + (m.biaya_overhead_per_unit || 0);
        const pct =
          m.margin_pct ?? calcProfitPercent(cost, m.harga_jual || 0);
        return sum + pct;
      }, 0);
      return Math.round((total / menus.length) * 10) / 10;
    }

    const marginAll: MarginRow[] = (ov?.margin_top || []).concat(
      ov?.margin_bottom || [],
    );
    if (!marginAll.length) return 0;
    const total = marginAll.reduce(
      (s, r) => s + (+r.margin_pct || 0),
      0,
    );
    return Math.round((total / marginAll.length) * 10) / 10;
  }, [ov?.meta?.avg_margin_pct, menus, ov?.margin_top, ov?.margin_bottom]);

  /* ===== Hitung ranking margin dari MENU (TOP & BOTTOM) ===== */

  const marginRowsFromMenu: MarginRow[] = useMemo(() => {
    if (!menus.length) return [];
    return menus.map((m) => {
      const cost =
        (m.total_hpp || 0) + (m.biaya_overhead_per_unit || 0);
      const margin_pct =
        m.margin_pct ?? calcProfitPercent(cost, m.harga_jual || 0);
      return {
        nama_produk: m.nama_menu,
        hpp: cost,
        harga_jual: m.harga_jual || 0,
        margin_pct,
      };
    });
  }, [menus]);

  const marginTopFromMenu: MarginRow[] = useMemo(() => {
    if (!marginRowsFromMenu.length) return [];
    return [...marginRowsFromMenu]
      .sort((a, b) => (b.margin_pct || 0) - (a.margin_pct || 0))
      .slice(0, 3);
  }, [marginRowsFromMenu]);

  const marginBottomFromMenu: MarginRow[] = useMemo(() => {
    if (!marginRowsFromMenu.length) return [];
    return [...marginRowsFromMenu]
      .sort((a, b) => (a.margin_pct || 0) - (b.margin_pct || 0))
      .slice(0, 3);
  }, [marginRowsFromMenu]);

  const marginTopToShow = marginTopFromMenu.length
    ? marginTopFromMenu
    : ov?.margin_top || [];

  const marginBottomToShow = marginBottomFromMenu.length
    ? marginBottomFromMenu
    : ov?.margin_bottom || [];

  /* ===== Rekomendasi promo: ambil yang terbaru dari /promo ===== */

  const promoRowsToShow: PromoRowUI[] = useMemo(() => {
    if (promos.length) {
      const sorted = [...promos].sort((a, b) => {
        const da = a.created_at ? new Date(a.created_at).getTime() : 0;
        const db = b.created_at ? new Date(b.created_at).getTime() : 0;
        return db - da;
      });

      const sliced = sorted.slice(0, 5); // 5 promo terbaru

      return sliced.map((p) => {
        const rawType = (p.type || '').toLowerCase();
        const subtype = (p.tipe || '').toLowerCase();
        const nilai = p.nilai ?? 0;

        let rekom = '';

        if (rawType === 'diskon') {
          if (subtype === 'percent' || subtype === 'persen') {
            rekom = `Diskon ${nilai}%`;
          } else if (nilai) {
            rekom = `Diskon ${rupiah(nilai)}`;
          } else {
            rekom = 'Diskon';
          }
        } else if (
          rawType === 'b1g1' ||
          rawType === 'bogo' ||
          rawType === 'buy1get1'
        ) {
          rekom = 'Buy 1 Get 1';
        } else if (rawType === 'tebus' || rawType === 'tebus_murah') {
          rekom = 'Tebus Murah';
        } else if (rawType === 'bundling') {
          rekom = 'Bundling';
        } else {
          rekom = p.nama || 'Promo';
        }

        return {
          nama: p.nama || '-',
          rekomendasi: rekom,
          // nanti kalau BE kirim alasan spesifik bisa diganti
          alasan: 'Promo terbaru dari kalkulator promo.',
        };
      });
    }

    // Fallback: pakai rekomendasi dari overview lama kalau ada
    if (ov?.promo_recommendations?.length) {
      return ov.promo_recommendations.map((p) => ({
        nama: p.nama_produk,
        rekomendasi: p.rekomendasi,
        alasan: p.alasan || '-',
      }));
    }

    return [];
  }, [promos, ov?.promo_recommendations]);

  /* ========= Render ========= */

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 space-y-6 bg-[#f5f5f5]">
      {/* HEADER */}
      <h1 className="mt-2 text-2xl md:text-3xl font-extrabold tracking-tight">
        Welcome Back{' '}
        <span className="underline decoration-4 decoration-[#b91c1c]">
          {userName}
        </span>{' '}
        👋
      </h1>

      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <KpiCard
          title={totalProduk.toLocaleString('id-ID')}
          subtitle="Total Product"
          icon="box"
        />
        <KpiCard
          title={`${avgMarginPct.toLocaleString('id-ID')}%`}
          subtitle="Rata Rata Margin (%)"
          icon="gauge"
        />
      </div>

      {loading && (
        <div className="text-xs text-gray-500">
          Memuat data dashboard...
        </div>
      )}
      {err && (
        <div className="text-red-600 text-sm">
          {err}
        </div>
      )}

      {/* MARGIN TABLES */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Section title="Produk Margin Tertinggi">
          {marginTopToShow.length ? (
            <MiniTable
              cols={['Nama', 'HPP', 'Harga Jual', 'Margin']}
              rows={marginTopToShow.map((m) => [
                m.nama_produk,
                rupiah(m.hpp),
                rupiah(m.harga_jual),
                `${fmtPct(m.margin_pct)}%`,
              ])}
              marginIndex={3}
              top
            />
          ) : (
            <Empty text="Belum ada data margin tertinggi." />
          )}
        </Section>
        <Section title="Produk Margin Terendah">
          {marginBottomToShow.length ? (
            <MiniTable
              cols={['Nama', 'HPP', 'Harga Jual', 'Margin']}
              rows={marginBottomToShow.map((m) => [
                m.nama_produk,
                rupiah(m.hpp),
                rupiah(m.harga_jual),
                `${fmtPct(m.margin_pct)}%`,
              ])}
              marginIndex={3}
              low
            />
          ) : (
            <Empty text="Belum ada data margin terendah." />
          )}
        </Section>
      </div>

      {/* PROMO */}
      <Section title="Rekomendasi Promo">
        {promoRowsToShow.length ? (
          <MiniTable
            cols={['Nama', 'Rekomendasi', 'Alasan']}
            rows={promoRowsToShow.map((p) => [
              p.nama,
              p.rekomendasi,
              p.alasan,
            ])}
          />
        ) : (
          <Empty text="Belum ada rekomendasi promo." />
        )}
      </Section>

      {/* STOCK & MUTASI */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Section title="Stok Rendah">
          {(ov?.low_stock?.length || 0) ? (
            <MiniTable
              cols={['Nama', 'Sisa Stock']}
              rows={(ov?.low_stock || []).map((s) => [
                s.bahan_nama,
                `${num(s.saldo_stok)} ${s.satuan_dasar}`,
              ])}
            />
          ) : (
            <Empty text="Tidak ada bahan di bawah ambang batas." />
          )}
        </Section>

        <Section title="Mutasi Stok Terakhir">
          {((ov?.recent_stock_in?.length || 0) +
            (ov?.recent_stock_out?.length || 0)) ? (
            <MiniTable
              cols={['Nama', 'Mutasi', 'Sisa Stock', 'Tanggal']}
              rows={[
                ...(ov?.recent_stock_in || []).map((l) => {
                  const saldo =
                    l.saldo_after ?? l.saldo_setelah ?? null;
                  return [
                    l.bahan_nama,
                    badge(
                      'IN',
                      `${num(l.qty)} ${l.satuan_dasar || ''} IN ↑`,
                      'up',
                    ),
                    saldo != null
                      ? `${num(saldo)} ${l.satuan_dasar || ''}`
                      : '-',
                    formatDateOnly(l.created_at),
                  ];
                }),
                ...(ov?.recent_stock_out || []).map((l) => {
                  const saldo =
                    l.saldo_after ?? l.saldo_setelah ?? null;
                  return [
                    l.bahan_nama,
                    badge(
                      'OUT',
                      `${num(l.qty)} ${l.satuan_dasar || ''} OUT ↓`,
                      'down',
                    ),
                    saldo != null
                      ? `${num(saldo)} ${l.satuan_dasar || ''}`
                      : '-',
                    formatDateOnly(l.created_at),
                  ];
                }),
              ]}
            />
          ) : (
            <Empty text="Belum ada mutasi stok di periode terbaru." />
          )}
        </Section>
      </div>
    </div>
  );
}

/* ===== UI PRIMITIVES ===== */

function KpiCard({
  title,
  subtitle,
  icon,
}: {
  title: string;
  subtitle: string;
  icon: 'box' | 'gauge';
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white px-6 py-5 shadow-sm flex items-center justify-between">
      <div>
        <div className="text-3xl font-extrabold leading-tight">
          {title}
        </div>
        <div className="mt-1 text-xs md:text-sm text-[#b91c1c] font-semibold">
          {subtitle}
        </div>
      </div>
      <div className="w-11 h-11 rounded-xl border border-neutral-200 flex items-center justify-center bg-[#fafafa]">
        {icon === 'box' ? (
          <svg viewBox="0 0 24 24" className="w-5 h-5">
            <path d="M3 7l9-4 9 4-9 4-9-4zm0 4l9 4 9-4v6l-9 4-9-4v-6z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="w-5 h-5">
            <path d="M12 4a8 8 0 100 16 8 8 0 000-16zm0 7a1 1 0 011 1v5h-2v-5a1 1 0 011-1z" />
          </svg>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-neutral-200 bg-white px-5 py-4 shadow-sm ${
        className || ''
      }`}
    >
      <div className="mb-3 text-base md:text-lg font-semibold">
        {title}
      </div>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="text-sm text-gray-500">{text}</div>;
}

function MiniTable({
  cols,
  rows,
  marginIndex,
  top,
  low,
}: {
  cols: string[];
  rows: (string | number | ReactNode)[][];
  marginIndex?: number;
  top?: boolean;
  low?: boolean;
}) {
  return (
    <div className="overflow-auto">
      <table className="w-full text-xs md:text-sm">
        <thead>
          <tr className="text-left text-[#b91c1c] border-b border-neutral-200">
            {cols.map((c, i) => (
              <th key={i} className="py-2 pr-4 font-semibold">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={i}
              className="border-b last:border-0 border-neutral-100"
            >
              {r.map((c, j) => {
                const isMargin = marginIndex === j;
                const color =
                  isMargin && top
                    ? 'text-green-600 font-semibold'
                    : isMargin && low
                    ? 'text-red-600 font-semibold'
                    : '';
                return (
                  <td key={j} className={`py-2.5 pr-4 ${color}`}>
                    {c as any}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ===== helpers format & calc ===== */

function rupiah(n?: number | null) {
  if (n == null || Number.isNaN(n)) return '-';
  return 'Rp ' + new Intl.NumberFormat('id-ID').format(Math.round(n));
}

function num(n?: number | null) {
  if (n == null || Number.isNaN(n)) return '0';
  return new Intl.NumberFormat('id-ID').format(n);
}

function fmtPct(n?: number | null) {
  if (n == null || Number.isNaN(n)) return 0;
  return Math.round(n);
}

function formatDateOnly(input?: string) {
  if (!input) return '-';
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return '-';
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function badge(
  _label: 'IN' | 'OUT',
  text: string,
  dir: 'up' | 'down',
) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${
        dir === 'up'
          ? 'border-green-500 text-green-700'
          : 'border-red-500 text-red-700'
      }`}
    >
      {text}
    </span>
  );
}

function calcProfitPercent(cost: number, price: number) {
  if (!price) return 0;
  return ((price - cost) / price) * 100;
}
