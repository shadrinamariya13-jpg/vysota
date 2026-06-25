import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { writeFileSync } from 'fs'
import { resolve } from 'path'

// Плагин: записывает version.json в dist/ при каждой сборке.
// Это позволяет клиенту обнаружить что вышла новая версия.
function versionPlugin() {
  return {
    name: 'write-version',
    closeBundle() {
      const v = new Date().toISOString()
      writeFileSync(resolve('dist/version.json'), JSON.stringify({ v }))
    }
  }
}

// На GitHub Pages приложение живёт под /kofe-tracker/ — это передаётся
// в build через VITE_BASE env (см. workflow). В деве работаем из корня.
const base = process.env.VITE_BASE || '/'

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(new Date().toISOString().slice(0, 16).replace('T', ' ')),
  },
  plugins: [
    react(),
    versionPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Высота — таск-трекер',
        short_name: 'Высота',
        description: 'Личные и рабочие задачи. Взгляд на жизнь с высоты.',
        theme_color: '#FAF4ED',
        background_color: '#FAF4ED',
        display: 'standalone',
        orientation: 'portrait',
        lang: 'ru',
        start_url: base,
        scope: base,
        icons: [
          {
            src: `${base}icons/icon-192.png`.replace('//', '/'),
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: `${base}icons/icon-512.png`.replace('//', '/'),
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: `${base}icons/icon-maskable-512.png`.replace('//', '/'),
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        // HTML не кешируем — всегда грузим свежий с сервера.
        // Это исключает проблему "белый экран после обновления" на iOS Safari.
        navigateFallback: null,
        globPatterns: ['**/*.{js,css,svg,png,ico,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-css',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
})
