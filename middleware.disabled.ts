import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login', '/reset', '/auth', '/health', '/version', '/_next', '/favicon.ico'];
const isPublic = (p: string) => p === '/' || PUBLIC_PATHS.some((x) => p === x || p.startsWith(x + '/'));

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const ownerId = req.cookies.get('owner_id')?.value || '';
  const isLoggedIn = req.cookies.get('is_logged_in')?.value === '1';

  const requestHeaders = new Headers(req.headers);
  if (isLoggedIn && ownerId) requestHeaders.set('x-owner-id', ownerId);
  else requestHeaders.delete('x-owner-id');

  if (!isPublic(pathname) && !isLoggedIn) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  if (!isLoggedIn && req.cookies.get('owner_id')) {
    res.cookies.set('owner_id', '', { path: '/', expires: new Date(0) });
  }
  return res;
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
