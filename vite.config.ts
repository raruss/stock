/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Деплой іде на gh-pages у підкаталог /stock, тож base має збігатися з ним,
// інакше всі ассети шукатимуться в корені домену й отримають 404.
export default defineConfig({
  base: '/stock/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'robots.txt', 'logo192.png', 'logo512.png'],
      manifest: {
        name: 'Запаси — облік продуктів удома',
        short_name: 'Запаси',
        description:
          'Облік домашніх запасів зі скануванням штрихкодів, контролем термінів придатності та списком покупок. Працює офлайн.',
        lang: 'uk',
        start_url: '/stock/',
        scope: '/stock/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#2e7d32',
        background_color: '#ffffff',
        icons: [
          { src: 'logo192.png', sizes: '192x192', type: 'image/png' },
          { src: 'logo512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'logo512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // zxing тягне за собою wasm-бінарник — без цього він не потрапить у precache
        // і сканер перестане працювати офлайн.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,wasm}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        runtimeCaching: [
          {
            // Фото товарів з OpenFoodFacts — кешуємо, щоб список був повноцінним офлайн.
            urlPattern: /^https:\/\/images\.openfoodfacts\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'off-images',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Відповіді API кешуємо ненадовго: назва товару за UPC майже не змінюється.
            urlPattern: /^https:\/\/world\.openfoodfacts\.org\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'off-api',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
