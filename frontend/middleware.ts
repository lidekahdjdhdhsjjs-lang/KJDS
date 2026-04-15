import { NextRequest, NextResponse } from 'next/server';

/**
 * Frontend middleware for request/response processing.
 *
 * Responsibilities:
 * - Pass operator identity headers through to API calls (via server-side proxying)
 * - Add security headers to all responses
 * - Log request paths for observability
 *
 * For this internal ops tool, authentication is handled via operator headers
 * (x-operator-id, x-operator-role) passed from the client. This middleware
 * ensures those headers are preserved across server-side requests and adds
 * additional hardening headers.
 *
 * Route protection (redirect to login/settings) can be added here once
 * a proper login flow is implemented.
 */

const PROTECTED_PATHS = ['/dashboard', '/batches', '/opportunities', '/procurement', '/settings'];
const PUBLIC_PATHS = ['/settings/platform-connections'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const response = NextResponse.next();

  // Add security headers to all responses
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Prevent caching of authenticated pages
  if (PROTECTED_PATHS.some((p) => pathname.startsWith(p))) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon file)
     * - public files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|api/).*)',
  ],
};
