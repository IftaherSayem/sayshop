import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: {
    staticIndicator: false,
    buildActivity: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // SPA rewrites: serve index page for all client-side routes
  // These work on both Vercel and Netlify
  async rewrites() {
    return [
      { source: "/product/:slug", destination: "/" },
      { source: "/category/:slug", destination: "/" },
      { source: "/products", destination: "/" },
      { source: "/cart", destination: "/" },
      { source: "/checkout", destination: "/" },
      { source: "/orders", destination: "/" },
      { source: "/order/:id", destination: "/" },
      { source: "/wishlist", destination: "/" },
      { source: "/compare", destination: "/" },
      { source: "/admin", destination: "/" },
      { source: "/manager", destination: "/" },
      { source: "/auth/:path*", destination: "/" },
      { source: "/profile", destination: "/" },
    ];
  },
  // Security headers are handled in middleware.ts to avoid duplication.
  // CORS for API routes should be configured per-route, not globally.
  
  // Resolve cross-origin warning when accessing from local IP
  allowedDevOrigins: ["192.168.0.140"],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'zknhitqgjoyggibahbqh.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'i.ibb.co',
      },
      {
        protocol: 'https',
        hostname: 'i.ibb.co.com',
      },
      {
        protocol: 'https',
        hostname: '**.ibb.co',
      },
      {
        protocol: 'https',
        hostname: '**.ibb.co.com',
      },
    ],
  },
} as any;

export default nextConfig;
