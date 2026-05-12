/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options',    value: 'nosniff' },
  { key: 'X-Frame-Options',           value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
  { key: 'X-DNS-Prefetch-Control',    value: 'on' },
]

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // CSP plus stricte sur les routes prospection (pas d'inline scripts arbitraires)
      { source: '/linkedin-prospection/:path*', headers: [
          { key: 'Content-Security-Policy', value:
            "default-src 'self'; " +
            "script-src 'self' 'unsafe-inline'; " +
            "style-src 'self' 'unsafe-inline' fonts.googleapis.com; " +
            "img-src 'self' data: https:; " +
            "font-src 'self' fonts.gstatic.com; " +
            "connect-src 'self' https://*.supabase.co https://api.resend.com; " +
            "frame-ancestors 'self'; base-uri 'self'; form-action 'self';"
          },
        ]},
    ]
  },
}
module.exports = nextConfig
