import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Don't advertise the framework to reduce attack surface
  poweredByHeader: false,

  // Allow next/image to serve external images
  images: {
    domains: [
      "community.n8n.io", // your current image
      // Add more later if needed (e.g., Transloadit, S3)
    ],
  },

  // Security headers applied to every response
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Prevents clickjacking by disallowing the page in iframes
          { key: "X-Frame-Options", value: "DENY" },

          // Stops MIME-type sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },

          // Forces HTTPS for 1 year, including subdomains
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },

          // Restricts referrer information
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },

          // Disables sensitive browser features
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;