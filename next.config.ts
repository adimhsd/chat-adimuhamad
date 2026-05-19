import type { NextConfig } from "next";
// @ts-ignore - next-pwa doesn't have official TS types
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  /* config options here */
};

const withPWAConfig = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

export default withPWAConfig(nextConfig);
