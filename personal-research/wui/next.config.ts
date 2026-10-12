import os from "node:os";
import type { NextConfig } from "next";

const addresses = Object.values(os.networkInterfaces())
  .flat()
  .filter((address) => address && address.family === "IPv4" && !address.internal)
  .map((address) => address!.address);

const config: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["127.0.0.1", os.hostname(), "*.local", ...addresses],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  rewrites: async () => [
    { source: "/api/:path*", destination: `${process.env.API_URL || "http://127.0.0.1:8768"}/api/:path*` },
  ],
};

export default config;
