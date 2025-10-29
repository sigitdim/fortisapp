import { NextRequest, NextResponse } from 'next/server'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.fortislab.id'
const FORWARDED_HEADERS = ['content-type','x-owner-id','authorization']

async function handler(req: NextRequest, ctx: { params: { parts: string[] } }) {
  const { parts } = ctx.params
  const qs = req.nextUrl.search ? req.nextUrl.search : ''
  const url = `${BASE_URL}/${parts.join('/')}${qs}`
  const method = req.method

  const headers: Record<string,string> = {}
  FORWARDED_HEADERS.forEach(h => {
    const v = req.headers.get(h)
    if (v) headers[h] = v
  })
  if (!headers['x-owner-id'] && process.env.NEXT_PUBLIC_OWNER_ID) {
    headers['x-owner-id'] = process.env.NEXT_PUBLIC_OWNER_ID
  }

  // Preflight fast-path
  if (method === 'OPTIONS') {
    const h = new Headers()
    h.set('access-control-allow-origin', '*')
    h.set('access-control-allow-methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
    h.set('access-control-allow-headers', 'content-type,x-owner-id,authorization')
    return new NextResponse(null, { status: 204, headers: h })
  }

  let body: BodyInit | undefined
  if (!['GET','HEAD'].includes(method)) {
    const text = await req.text()
    body = text || undefined
  }

  try {
    const res = await fetch(url, { method, headers, body, cache: 'no-store' })
    const buf = Buffer.from(await res.arrayBuffer())
    const nextHeaders = new Headers()
    nextHeaders.set('content-type', res.headers.get('content-type') || 'application/json; charset=utf-8')
    return new NextResponse(buf, { status: res.status, headers: nextHeaders })
  } catch (e: any) {
    console.error('[proxy error]', e)
    return NextResponse.json({ ok: false, error: e?.message || 'Proxy error' }, { status: 500 })
  }
}

export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE, handler as OPTIONS, handler as HEAD }
