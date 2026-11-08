import type { NextConfig } from "next";

const extraOrigins =
  process.env.ALLOWED_DEV_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? [];

const nextConfig: NextConfig = {
  allowedDevOrigins: extraOrigins,
};

export default nextConfig;
