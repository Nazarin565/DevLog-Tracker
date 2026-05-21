/** @type {import('next').NextConfig} */
const nextConfig = {
  // @devlog/shared is consumed as TypeScript source, so Next must transpile it.
  transpilePackages: ['@devlog/shared'],
};

export default nextConfig;
