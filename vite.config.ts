import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true,
      },
      includeAssets: ['icons/icon.svg'],
      manifest: {
        name: 'Plank Tracker',
        short_name: 'PlankCoach',
        description:
          'Offline-ready plank tracker that uses MediaPipe Pose to coach your form.',
        theme_color: '#0f172a',
        background_color: '#020617',
        start_url: '/',
        display: 'standalone',
        icons: [
          {
            src: '/icons/icon.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: '/icons/icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'maskable any',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,webmanifest}'],
        runtimeCaching: [
          {
            urlPattern:
              /^https:\/\/storage\.googleapis\.com\/mediapipe-models\/pose_landmarker\/pose_landmarker_lite\/.*\/pose_landmarker_lite\.task$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'mediapipe-models',
              expiration: {
                maxEntries: 2,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
          {
            urlPattern:
              /^https:\/\/cdn\.jsdelivr\.net\/npm\/@mediapipe\/tasks-vision@.*\/wasm\/.*$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'mediapipe-wasm',
              expiration: {
                maxEntries: 4,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
        ],
      },
    }),
  ],
})
