import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware to add security headers to all responses
 * This includes Content Security Policy (CSP) to mitigate XSS attacks
 */
export function middleware(_request: NextRequest) {
  // Get the response
  const response = NextResponse.next();

  // For development, we'll use a more permissive CSP
  // In production, you should use nonces or hashes for inline scripts/styles
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Generate nonce for inline scripts (more secure than unsafe-inline)
  const nonce = crypto.randomUUID();
  
  // Add security headers with CSP
  const cspHeader = isDevelopment
    ? `
      default-src 'self';
      script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://www.googletagmanager.com;
      style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://rsms.me;
      img-src 'self' data: https: blob:;
      font-src 'self' https://fonts.gstatic.com https://rsms.me;
      connect-src 'self' ${process.env.NEXT_PUBLIC_SUPABASE_URL} ${process.env.NEXT_PUBLIC_API_URL} http://localhost:3001 ws://localhost:3000 wss://localhost:3000 https://pagead2.googlesyndication.com https://ep1.adtrafficquality.google;
      frame-ancestors 'none';
      frame-src https://googleads.g.doubleclick.net https://tpc.googlesyndication.com;
      form-action 'self';
      base-uri 'self';
      object-src 'none';
      media-src 'self';
      worker-src 'self' blob:;
      child-src 'self' blob:;
    `.replace(/\s+/g, ' ').trim()
    : `
      default-src 'self';
      script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://www.googletagmanager.com;
      style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://rsms.me;
      img-src 'self' data: https: blob:;
      font-src 'self' https://fonts.gstatic.com https://rsms.me;
      connect-src 'self' ${process.env.NEXT_PUBLIC_SUPABASE_URL} ${process.env.NEXT_PUBLIC_API_URL} https://pagead2.googlesyndication.com https://ep1.adtrafficquality.google;
      frame-ancestors 'none';
      frame-src https://googleads.g.doubleclick.net https://tpc.googlesyndication.com;
      form-action 'self';
      base-uri 'self';
      object-src 'none';
      media-src 'self';
      worker-src 'self' blob:;
      child-src 'self' blob:;
      upgrade-insecure-requests;
      block-all-mixed-content;
    `.replace(/\s+/g, ' ').trim();

  // Add security headers
  response.headers.set('Content-Security-Policy', cspHeader);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()');
  
  // HTTPS enforcement headers
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    response.headers.set('Expect-CT', 'max-age=86400, enforce');
  }

  return response;
}

/**
 * Configure which paths this middleware will run on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};