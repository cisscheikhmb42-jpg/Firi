import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Inclut les prompts (dossier prompts/) dans le déploiement Vercel.
  outputFileTracingIncludes: {
    "/api/analyser": ["./prompts/**/*"],
    "/api/conversation": ["./prompts/**/*"],
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
