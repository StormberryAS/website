import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'logo.webp', 'robots.txt'],
      manifest: {
        name: 'Stormberry A.S.',
        short_name: 'Stormberry',
        description: 'Elite consulting and training in Sales, Strategy, Cross-cultural Communications, and AI',
        theme_color: '#0a0a0c',
        icons: [
          {
            src: '/logo.webp',
            sizes: '192x192',
            type: 'image/webp'
          },
          {
            src: '/logo.webp',
            sizes: '512x512',
            type: 'image/webp'
          }
        ]
      }
    })
  ],
})
