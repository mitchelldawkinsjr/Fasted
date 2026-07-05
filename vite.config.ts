import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

function injectGoogleAnalytics(): Plugin {
  return {
    name: 'inject-google-analytics',
    transformIndexHtml(html) {
      const gaId = process.env.VITE_GA_MEASUREMENT_ID;
      if (!gaId) return html;

      const snippet = `<!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=${gaId}"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${gaId}', { send_page_view: false });
    </script>`;

      return html.replace('</head>', `${snippet}\n  </head>`);
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    injectGoogleAnalytics(),
    VitePWA({
      registerType: 'prompt',
      includeManifestIcons: false,
      // Icons ship with the app shell but PNGs are not precached (runtime / browser cache only).
      includeAssets: ['favicon.ico'],
      manifest: {
        name: 'Fasted',
        short_name: 'Fasted',
        description: 'A spiritual fasting companion for June 13 – December 19, 2026',
        theme_color: '#fbf9f8',
        background_color: '#fbf9f8',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
    }),
  ],
});
