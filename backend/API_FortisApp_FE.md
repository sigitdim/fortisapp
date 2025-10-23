# FortisApp API — Staging (15 Okt)

**Base URL**  
`https://api.fortislab.id`

**Headers wajib**
- `x-owner-id: <OWNER_ID>` ← pakai UUID owner masing-masing user
- `Content-Type: application/json`

**CORS**  
Allowed: `http://localhost:3000`, `https://app.fortislab.id`

---

## 0) Health Check
**GET** `/health`  
Cek koneksi server.

**Response (200)**
```json
{ "ok": true }
```

---

## 1) Setup — Bahan
### GET `/setup/bahan`
List bahan milik owner.

**Headers:** `x-owner-id`

**Response (200)**
```json
{
  "ok": true,
  "data": [
    {
      "id": "uuid-bahan",
      "nama": "Gula Aren",
      "satuan": "gram",
      "harga_per_satuan": 120,
      "owner_id": "<OWNER_ID>"
    }
  ]
}
```

### POST `/setup/bahan`
Create/update bahan (upsert by id optional).

**Headers:** `x-owner-id`  
**Body**
```json
{
  "nama": "Gula Aren",
  "satuan": "gram",
  "harga_per_satuan": 120
}
```

**Response (200)**
```json
{ "ok": true, "id": "uuid-bahan" }
```

---

## 2) Setup — Overhead
### GET `/setup/overhead`
**Response**
```json
{
  "ok": true,
  "data": [
    { "id":"uuid-oh", "nama":"Listrik", "biaya":250000, "periode":"bulanan" }
  ]
}
```

### POST `/setup/overhead`
**Body**
```json
{ "nama":"Listrik", "biaya":250000, "periode":"bulanan" }
```

**Response**
```json
{ "ok": true, "id": "uuid-oh" }
```

---

## 3) Setup — Tenaga Kerja
### GET `/setup/tenaga_kerja`
**Response**
```json
{
  "ok": true,
  "data": [
    {
      "id":"uuid-tk",
      "nama":"Barista A",
      "jam_kerja_per_hari":8,
      "hari_kerja_per_bulan":26,
      "gaji_bulanan":2500000,
      "rate_per_menit": 160.26
    }
  ]
}
```

### POST `/setup/tenaga_kerja`
Field auto (rate) dihitung backend.

**Body**
```json
{
  "nama":"Barista A",
  "jam_kerja_per_hari":8,
  "hari_kerja_per_bulan":26,
  "gaji_bulanan":2500000
}
```

**Response**
```json
{ "ok": true, "id": "uuid-tk" }
```

---

## 4) Promo — Kalkulasi
### POST `/promo`
Support: `diskon`, `b1g1`, `tebus`, `bundling`

**Body (contoh diskon)**
```json
{
  "produk_id": "uuid-produk",
  "type": "diskon",
  "options": {
    "persen": 25
  }
}
```

**Response (contoh sukses)**
```json
{
  "ok": true,
  "type": "diskon",
  "produk_id": "uuid-produk",
  "calc": {
    "harga_awal": 20000,
    "harga_promo": 15000,
    "potongan": 5000,
    "margin_delta": 0.75,
    "flag": "aman",
    "notes": "Margin aman di atas 25%"
  }
}
```

> Catatan: struktur `options` beda tiap tipe promo.  
> - `diskon`: `{ persen: number }` atau `{ nominal: number }`  
> - `b1g1`: `{ buy: 1, get: 1 }` (default)  
> - `tebus`: `{ min_qty: number, harga_tebus: number }`  
> - `bundling`: `{ items: [{ produk_id, qty }], harga_bundle: number }`

---

## 5) Logs — Promo
### GET `/logs/promo?limit=50&offset=0`
**Response**
```json
{
  "ok": true,
  "data": [
    {
      "id":"uuid-log",
      "produk_id":"uuid-produk",
      "type":"diskon",
      "request":{"persen":25},
      "result":{"harga_awal":20000,"harga_promo":15000},
      "created_at":"2025-10-15T04:10:00Z"
    }
  ]
}
```

---

## Contoh `curl`
```bash
# health
curl -s https://api.fortislab.id/health

# list bahan
curl -s -H "x-owner-id: <OWNER_ID>" https://api.fortislab.id/setup/bahan

# create bahan
curl -s -X POST https://api.fortislab.id/setup/bahan \
  -H "x-owner-id: <OWNER_ID>" -H "Content-Type: application/json" \
  -d '{ "nama":"Gula Aren","satuan":"gram","harga_per_satuan":120 }'

# promo diskon 25%
curl -s -X POST https://api.fortislab.id/promo \
  -H "x-owner-id: <OWNER_ID>" -H "Content-Type: application/json" \
  -d '{ "produk_id":"uuid-produk","type":"diskon","options":{"persen":25} }'
```

---

## Contoh `fetch` (FE)
```ts
const BASE = "https://api.fortislab.id";
const OWNER_ID = "<OWNER_ID>";

async function getBahan() {
  const r = await fetch(`${BASE}/setup/bahan`, {
    headers: { "x-owner-id": OWNER_ID }
  });
  return r.json();
}

async function createBahan(payload) {
  const r = await fetch(`${BASE}/setup/bahan`, {
    method: "POST",
    headers: {
      "x-owner-id": OWNER_ID,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  return r.json();
}

async function hitungPromoDiskon(produkId, persen) {
  const r = await fetch(`${BASE}/promo`, {
    method: "POST",
    headers: {
      "x-owner-id": OWNER_ID,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      produk_id: produkId,
      type: "diskon",
      options: { persen }
    })
  });
  return r.json();
}
```

---

## Error umum
- `401/403`: header `x-owner-id` kosong/salah atau RLS block.
- `400`: body kurang field wajib.
- `500`: laporin request + timestamp ke BE (cek PM2 logs).
