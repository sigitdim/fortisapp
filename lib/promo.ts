// /apps/fortisapp-frontend/lib/promos.ts
export async function listPromos() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/promo`, {
      headers: {
        "x-owner-id": localStorage.getItem("owner_id") ?? "",
      },
    });
    if (!res.ok) throw new Error(`BE_GET_NOT_FOUND`);
    return await res.json();
  } catch (err: any) {
    // fallback ke Supabase langsung
    console.warn("Fallback ke Supabase (listPromos)", err.message);
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/promo?select=*`;
    const res2 = await fetch(url, {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
      },
    });
    return await res2.json();
  }
}

export async function createPromo(body: any) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/promo`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-owner-id": localStorage.getItem("owner_id") ?? "",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`BE_POST_NOT_FOUND`);
    return await res.json();
  } catch (err: any) {
    console.warn("Fallback ke Supabase (createPromo)", err.message);
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/promo`;
    const res2 = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        Prefer: "return=representation",
      },
      body: JSON.stringify(body),
    });
    return await res2.json();
  }
}
