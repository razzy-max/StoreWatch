import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            devOptions: {
                enabled: false
            },
            includeAssets: ['pwa-192.svg', 'pwa-512.svg'],
            manifest: {
                name: 'StoreWatch',
                short_name: 'StoreWatch',
                theme_color: '#0F172A',
                background_color: '#0F172A',
                display: 'standalone',
                start_url: '/',
                icons: [
                    {
                        src: '/pwa-192.svg',
                        sizes: '192x192',
                        type: 'image/svg+xml',
                        purpose: 'any'
                    },
                    {
                        src: '/pwa-512.svg',
                        sizes: '512x512',
                        type: 'image/svg+xml',
                        purpose: 'any'
                    }
                ]
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,svg,ico,woff2}']
            }
        })
    ],
    resolve: {
        alias: {
            '@': '/src'
        }
    }
});
