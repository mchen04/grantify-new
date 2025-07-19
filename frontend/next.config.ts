import { NextConfig } from 'next';

// Bundle analyzer for development
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  // CDN configuration for production
  assetPrefix: process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_CDN_DOMAIN
    ? `https://${process.env.NEXT_PUBLIC_CDN_DOMAIN}`
    : undefined,

  // Enable React strict mode for better development experience
  reactStrictMode: true,
  
  // Enable ESLint during build for production
  eslint: {
    ignoreDuringBuilds: true, // Temporarily disable for production build
  },
  
  // Enable standalone output for Docker deployment
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  
  // TypeScript configuration
  typescript: {
    // Disable type checking during build in development
    ignoreBuildErrors: process.env.NODE_ENV === 'development',
  },
  
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 7, // Cache images for 1 week
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // Use default loader (CDN support removed)
    loader: 'default',
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: process.env.NEXT_PUBLIC_DOMAIN || 'localhost',
      },
      // Add CDN domain if configured
      ...(process.env.NEXT_PUBLIC_CDN_DOMAIN ? [{
        protocol: 'https' as const,
        hostname: process.env.NEXT_PUBLIC_CDN_DOMAIN,
      }] : []),
    ],
  },
  
  // Experimental features for better performance
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js', 'class-variance-authority'],
    optimizeCss: process.env.NODE_ENV === 'production',
    webpackBuildWorker: process.env.NODE_ENV === 'production',
    typedRoutes: false, // Disabled due to type issues
  },
  
  // Compiler options
  compiler: {
    // Remove console logs in production - temporarily disabled for debugging
    removeConsole: false, // process.env.NODE_ENV === 'production' ? {
      // exclude: ['error', 'warn'],
    // } : false,
  },
  
  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // Production optimizations only
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
            },
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 5,
            },
          },
        },
      };
    }
    
    return config;
  },
  
  // Configure headers for better security and performance
  async headers() {
    const securityHeaders = [
      {
        key: 'X-DNS-Prefetch-Control',
        value: 'on'
      },
      {
        key: 'X-XSS-Protection',
        value: '1; mode=block'
      },
      {
        key: 'X-Frame-Options',
        value: 'SAMEORIGIN'
      },
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff'
      },
      {
        key: 'Referrer-Policy',
        value: 'origin-when-cross-origin'
      },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=()'
      }
    ];

    // Add CSP in production
    if (process.env.NODE_ENV === 'production') {
      securityHeaders.push({
        key: 'Content-Security-Policy',
        value: `
          default-src 'self';
          script-src 'self' 'unsafe-eval' 'unsafe-inline' *.googletagmanager.com *.google-analytics.com;
          style-src 'self' 'unsafe-inline' *.googleapis.com;
          img-src 'self' data: blob: *.supabase.co *.googleusercontent.com;
          font-src 'self' *.googleapis.com *.gstatic.com;
          connect-src 'self' *.supabase.co *.google-analytics.com
        `.replace(/\s+/g, ' ').trim()
      });
    }

    return [
      {
        source: '/:path*',
        headers: securityHeaders
      },
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      },
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400'
          }
        ]
      },
    ];
  },
  
  // Redirects for better SEO
  async redirects() {
    return [
      // Redirect www to non-www (or vice versa based on your preference)
      {
        source: '/(.*)',
        has: [
          {
            type: 'host',
            value: 'www.grantify.ai',
          },
        ],
        destination: 'https://grantify.ai/:path*',
        permanent: true,
      },
    ];
  },
  
  // Disable powered by header
  poweredByHeader: false,
  
  // Compress responses
  compress: true,
  
  // Generate ETags for better caching
  generateEtags: true,
  
  // Environment variable configuration
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
};

export default withBundleAnalyzer(nextConfig);