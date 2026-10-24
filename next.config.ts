import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Inclut le prompt système (prompts/firi.md) dans le déploiement Vercel.
  outputFileTracingIncludes: {
    "/api/analyser": ["./prompts/**/*"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
