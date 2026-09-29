import type { NextConfig } from "next";

// Uploaded images are served by the API at {NEXT_PUBLIC_API_BASE_URL}/api/v1/files/...
const apiUrl = new URL(process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: apiUrl.protocol.replace(":", "") as "http" | "https",
        hostname: apiUrl.hostname,
        port: apiUrl.port,
        pathname: "/api/v1/files/**",
      },
    ],
  },
};

export default nextConfig;
