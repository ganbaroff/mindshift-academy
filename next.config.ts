import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    // Order matters: when several entries match the same path, later ones override earlier
    // ones for the same header key. The activation rule therefore has to come last.
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
      {
        // The parent activation link carries a one-time token in the query string. With no
        // explicit policy the browser may put that whole URL into the Referer of an outbound
        // request, handing a third party the ability to record consent for that family.
        source: "/activate",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      },
    ];
  },
};

export default nextConfig;
