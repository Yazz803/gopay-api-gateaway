import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_PREFIXES = ['/transaksi', '/qris', '/logs', '/profile'];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Root redirect or protected routes
  const isRoot = pathname === '/';
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (isRoot || isProtected) {
    const sessionCookie = req.cookies.get('gopay_auth_session')?.value;

    if (!sessionCookie) {
      const loginUrl = new URL('/login', req.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (assets, etc.)
     * - api routes
     * - login and register
     */
    '/((?!_next/static|_next/image|favicon.ico|login|register|api).*)',
  ],
};
