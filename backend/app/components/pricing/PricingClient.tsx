const router = useRouter();
const sp = useSearchParams();
const qProdukId = sp.get("produk_id") || "";

// 👉 kalau produk_id kosong, ambil 1 produk paling awal lalu redirect
useEffect(() => {
  if (qProdukId) return; // sudah ada → skip

  (async () => {
    // ambil owner_id dari session Supabase (atau dari localStorage kalau kamu pakai itu)
    let ownerId: string | null = null;
    try {
      const { data } = await supabase.auth.getUser();
      ownerId = data?.user?.id ?? null;
    } catch {}

    // query ke tabel 'produk' langsung (lebih pasti daripada nunggu endpoint BE list)
    const { data: first, error } = await supabase
      .from("produk")
      .select("id")
      .match(ownerId ? { owner_id: ownerId } : {})
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn("get first produk error:", error.message);
      return;
    }
    if (first?.id) {
      router.replace(`/pricing?produk_id=${encodeURIComponent(first.id)}`);
    }
  })();
}, [qProdukId, router]);
