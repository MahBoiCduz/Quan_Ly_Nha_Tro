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
  },
};

export default nextConfig;
