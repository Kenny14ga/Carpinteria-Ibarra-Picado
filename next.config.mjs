import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: false,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
    navigateFallback: "/",
    runtimeCaching: [
      {
        urlPattern: /^https?.*/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "http-runtime-cache",
          networkTimeoutSeconds: 5,
          expiration: {
            maxEntries: 80,
            maxAgeSeconds: 60 * 60 * 24 * 7
          },
          cacheableResponse: {
            statuses: [0, 200]
          }
        }
      }
    ]
  }
});

/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co"
      }
    ]
  }
};

export default withPWA(nextConfig);
