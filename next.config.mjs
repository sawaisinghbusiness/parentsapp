/**
 * Built as plain static files (`out/`) for a Render Static Site: it never sleeps and uses no
 * instance hours. On Render, a rewrite rule sends /api/* to the backend, so the sign-in cookie
 * stays on this site's own domain. In development `next dev` does the same with the rewrite below.
 */
const BACKEND = process.env.BACKEND_URL || "http://localhost:4000";
const isDev = process.env.NODE_ENV !== "production";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  ...(isDev
    ? { rewrites: async () => [{ source: "/api/:path*", destination: `${BACKEND}/api/:path*` }] }
    : { output: "export", trailingSlash: true }),
  images: { unoptimized: true },
};

export default nextConfig;
