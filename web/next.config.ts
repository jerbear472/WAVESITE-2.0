import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the workspace root to this app so Next doesn't infer a parent directory
  // when multiple lockfiles exist on the machine.
  turbopack: {
    root: path.join(__dirname),
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      // Real trend media from the corpus — YouTube thumbnails, Reddit images.
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "i.redd.it" },
      { protocol: "https", hostname: "preview.redd.it" },
    ],
  },
  // Old IA → consolidated four-screen IA (Today · Radar · Your Board · Track record).
  async redirects() {
    return [
      { source: "/dashboard", destination: "/board", permanent: false },
      { source: "/saved", destination: "/board", permanent: false },
      { source: "/waves", destination: "/radar", permanent: false },
      { source: "/pulse", destination: "/radar", permanent: false },
      { source: "/timeline", destination: "/radar", permanent: false },
      { source: "/daily", destination: "/today", permanent: false },
      { source: "/admin", destination: "/internal/import", permanent: false },
    ];
  },
};

export default nextConfig;
