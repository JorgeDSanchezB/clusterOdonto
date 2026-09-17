import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // @react-pdf/renderer usa WASM (yoga-layout): mantenerlo externo evita
  // problemas de empaquetado en las API Routes con Turbopack.
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
