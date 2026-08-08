/** @type {import('next').NextConfig} */
const nextConfig = {
  /* Every image this app renders is either bundled from assets/ or served by
     our own /api/members/<id>/photo route, so there is no remote host to allow.
     The scaffold this project grew out of listed Cloudinary and Unsplash; both
     are gone, and an empty list is one fewer origin the optimiser will fetch
     from on someone else's say-so. */
  images: {
    remotePatterns: [],
  },

  /* The register is not a public document. These are belt-and-braces on top of
     the per-route `robots` metadata: a crawler that ignores the meta tag still
     sees the header, and the frame rules stop a signed-in coordinator's
     dashboard being embedded in somebody else's page. */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
      {
        // Nothing behind a sign-in should ever sit in a shared cache.
        source: "/(admin|portal)/:path*",
        headers: [{ key: "Cache-Control", value: "private, no-store" }],
      },
    ];
  },
};

export default nextConfig;
