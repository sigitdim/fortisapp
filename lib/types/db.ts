export type UUID = string;

export type Bahan = {
  id: UUID;
  name: string;
  purchase_price: number;
  purchase_qty: number;
  purchase_unit: string;
  created_at: string;
};

export type Produk = {
  id: UUID;
  created_at: string;
  nama: string;
  porsi: number;
  target_margin: number | null;
  harga_jual: number | null;
  owner_id: UUID | null;
};

export type Komposisi = {
  id: UUID;
  created_at: string;
  produk_id: UUID;
  bahan_id: UUID;
  qty: number;
  unit: string;
  owner_id: UUID | null;
};

export type KomposisiWithBahan = Komposisi & { bahan: Bahan };
export type ProdukWithKomposisi = Produk & { komposisi: KomposisiWithBahan[] };
