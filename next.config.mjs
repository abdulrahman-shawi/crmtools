/** @type {import('next').NextConfig} */
const nextConfig = {
  headers: async () => {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate"
          }
        ]
      },
      {
        source: "/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable"
          }
        ]
      },
      {
        source: "/_next/image(|s)?/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=60, must-revalidate"
          }
        ]
      }
    ];
  }
};

export default nextConfig;
