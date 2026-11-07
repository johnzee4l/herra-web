import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The dev overlay badge sits over the app root and is not part of the
  // product; keep it out of the way while comparing against the mockup.
  devIndicators: false,
};

export default nextConfig;
