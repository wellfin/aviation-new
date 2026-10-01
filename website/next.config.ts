import type { NextConfig } from "next";

// Uploaded images are served by the API at {NEXT_PUBLIC_API_BASE_URL}/api/v1/files/...
const apiUrl = new URL(process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000");

// Optional extra hosts that may also serve uploads (comma separated, e.g. a previous server IP
// still stored in older records, or the live server when developing against its database).
const extraHosts = (process.env.IMAGE_REMOTE_HOSTS ?? "")
  .split(",")
  .map((h) => h.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: apiUrl.protocol.replace(":", "") as "http" | "https",
        hostname: apiUrl.hostname,
        port: apiUrl.port,
        pathname: "/api/v1/files/**",
      },
      ...extraHosts.flatMap((hostname) =>
        (["http", "https"] as const).map((protocol) => ({ protocol, hostname, pathname: "/api/v1/files/**" })),
      ),
    ],
  },
};

export default nextConfig;
