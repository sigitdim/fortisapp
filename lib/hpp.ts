import { apiPut, apiPost } from "./api";

/**
 * Update harga jual produk.
 * Bisa dipanggil dua cara:
 *   updateHargaJual(produkId, val)
 *   updateHargaJual({ produk_id, harga_jual })
 */
export async function updateHargaJual(a: any, b?: any) {
  let payload: any;

  if (b !== undefined) {
    // dipanggil sebagai updateHargaJual(id, val)
    payload = { produk_id: a, harga_jual: b };
  } else if (typeof a === "object") {
    // dipanggil sebagai updateHargaJual({ produk_id, harga_jual })
    payload = a;
  } else {
    throw new Error("updateHargaJual: invalid arguments");
  }

  try {
    return await apiPut("/pricing/update-harga", payload);
  } catch {
    return await apiPost("/pricing/update-harga", payload);
  }
}

export default { updateHargaJual };
