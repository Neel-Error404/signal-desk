/** @type {import('next').NextConfig} */
const nextConfig = {
  agentRules: false,
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  generateBuildId: async () => {
    const buildId = process.env.SIGNALDESK_RELEASE_COMMIT ?? process.env.GITHUB_SHA;
    if (buildId !== undefined) {
      if (!/^[0-9a-f]{40}$/.test(buildId)) {
        throw new Error(
          "SIGNALDESK_RELEASE_COMMIT or GITHUB_SHA must be an exact lowercase 40-character Git commit."
        );
      }
      return buildId;
    }
    if (process.env.CI === "true") {
      throw new Error("Hosted builds require an exact Git commit for the Next.js build ID.");
    }
    return "local-development";
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Frame-Options", value: "DENY" }
        ]
      }
    ];
  }
};

export default nextConfig;
