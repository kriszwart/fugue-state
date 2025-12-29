/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable static HTML exports
  async rewrites() {
    return [
      // Rewrite /studio/workspace to /studio/workspace.html
      {
        source: '/studio/workspace',
        destination: '/studio/workspace.html',
      },
      {
        source: '/studio/chat',
        destination: '/studio/chat.html',
      },
      {
        source: '/studio/calendar',
        destination: '/studio/calendar.html',
      },
      {
        source: '/studio/archive',
        destination: '/studio/archive.html',
      },
      {
        source: '/studio/gallery',
        destination: '/studio/gallery.html',
      },
      {
        source: '/studio/privacy',
        destination: '/studio/privacy.html',
      },
      {
        source: '/about',
        destination: '/about.html',
      },
      {
        source: '/guide',
        destination: '/guide.html',
      },
      {
        source: '/dameris',
        destination: '/dameris.html',
      },
      // Add more rewrites as needed
    ];
  },
};

export default nextConfig;
