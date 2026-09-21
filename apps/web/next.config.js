const path = require('path');

/*
 * Security headers.
 *
 * Nothing in this estate set any of these — four public Next.js apps shipping
 * browser defaults. These are the cheap, unambiguous ones.
 */
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  productionBrowserSourceMaps: true,
  experimental: {
    clientTraceMetadata: ['traceparent'],
  },
  // design-system ships raw .jsx rather than a build output, so Next has to
  // transpile it like first-party source instead of skipping node_modules.
  transpilePackages: ['design-system'],
  serverExternalPackages: [
    '@opentelemetry/auto-instrumentations-node',
    '@opentelemetry/exporter-trace-otlp-http',
    '@opentelemetry/sdk-node',
    'kafkajs',
  ],
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../..'),
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

module.exports = nextConfig;
