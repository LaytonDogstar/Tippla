/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Database drivers run on the Node server only; keep them out of the bundler.
  experimental: { serverComponentsExternalPackages: ["pg", "@electric-sql/pglite"] },
};
export default nextConfig;
