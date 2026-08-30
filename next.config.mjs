/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Keep these out of the server bundle so their native/binary parts resolve
    // correctly in Vercel's serverless runtime.
    serverComponentsExternalPackages: [
      "@prisma/client",
      "@libsql/client",
      "@react-pdf/renderer",
    ],
    // The client router caches dynamic pages for 30s by default; zero it so
    // navigation after a mutation always re-fetches fresh data.
    staleTimes: { dynamic: 0 },
  },
};

export default nextConfig;
