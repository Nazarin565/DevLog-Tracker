import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

config({ path: join(dirname(fileURLToPath(import.meta.url)), '../../.env') });

/** @type {import('next').NextConfig} */
const nextConfig = {
  // @devlog/shared is consumed as TypeScript source, so Next must transpile it.
  transpilePackages: ['@devlog/shared'],
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
  },
};

export default nextConfig;
