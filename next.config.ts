import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
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
      { source: "/auth", destination: "/" },
      { source: "/profile", destination: "/" },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // CORS for dev/preview
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, OPTIONS, POST, PUT, DELETE" },
          { key: "Access-Control-Allow-Headers", value: "*" },
          // Security headers
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
