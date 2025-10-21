export async function GET(req: Request) {
  const API = process.env.NEXT_PUBLIC_API_URL || 'https://api.fortislab.id';
  const { searchParams } = new URL(req.url);
  const ownerFromQuery = searchParams.get('owner_id') || '';

  const ownerHeader =
    req.headers.get('x-owner-id') ||
    ownerFromQuery ||
    process.env.NEXT_PUBLIC_OWNER_ID ||
    '';

  if (!ownerHeader) {
    return new Response(JSON.stringify({ ok:false, error:'owner_id missing' }), { status: 400 });
  }

  const r = await fetch(`${API}/pricing/final`, {
    headers: { 'x-owner-id': ownerHeader, 'Content-Type':'application/json' },
    cache: 'no-store',
  });

  const txt = await r.text();
  return new Response(txt, {
    status: r.status,
    headers: { 'Content-Type': r.headers.get('content-type') || 'application/json' }
  });
}
