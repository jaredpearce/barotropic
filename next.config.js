/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Enable image optimization
  images: {
    remotePatterns: [],
  },
  webpack(config) {
    // Grab the existing rule that handles SVG imports
    const fileLoaderRule = config.module.rules.find((rule) =>
      rule.test?.test?.('.svg'),
    );

    if (fileLoaderRule) {
      config.module.rules.push(
        // Reapply the existing rule, but only for svg imports ending in ?url
        {
          ...fileLoaderRule,
          test: /\.svg$/i,
          resourceQuery: /url/, // *.svg?url
        },
        // Convert all other *.svg imports to React components
        {
          test: /\.svg$/i,
          issuer: fileLoaderRule.issuer,
          resourceQuery: {
            not: [
              ...(Array.isArray(fileLoaderRule.resourceQuery?.not)
                ? fileLoaderRule.resourceQuery.not
                : fileLoaderRule.resourceQuery?.not
                  ? [fileLoaderRule.resourceQuery.not]
                  : []),
              /url/,
            ],
          },
          use: ['@svgr/webpack'],
        },
      );

      // Modify the file loader rule to ignore *.svg, since we have it handled now.
      fileLoaderRule.exclude = /\.svg$/i;
    } else {
      config.module.rules.push({
        test: /\.svg$/i,
        use: ['@svgr/webpack'],
      });
    }

    return config;
  },
  // // Logging configuration
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};

export default nextConfig;
