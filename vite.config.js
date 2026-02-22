import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false,
      includeAssets: [
        "icons/favicon.svg",
        "icons/favicon-16.png",
        "icons/favicon-32.png",
        "icons/apple-touch-icon.png",
      ],
      manifest: {
        id: "/",
        name: "DoozeCoofe - Warung Kopi Banda Aceh",
        short_name: "DoozeCoofe",
        description:
          "Pesan kopi dari meja, lihat menu digital, dan kirim struk otomatis ke WhatsApp.",
        lang: "id-ID",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        theme_color: "#5c341f",
        background_color: "#f8f3ed",
        categories: ["food", "drink", "business"],
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        shortcuts: [
          {
            name: "Lihat Menu",
            short_name: "Menu",
            description: "Buka menu andalan DoozeCoofe",
            url: "/#menu",
            icons: [
              {
                src: "/icons/icon-192.png",
                sizes: "192x192",
                type: "image/png",
              },
            ],
          },
          {
            name: "Kirim Pesanan",
            short_name: "Pesan",
            description: "Buka keranjang pesanan dan kirim ke WhatsApp",
            url: "/#orderCartPanel",
            icons: [
              {
                src: "/icons/icon-192.png",
                sizes: "192x192",
                type: "image/png",
              },
            ],
          },
          {
            name: "Buka Lokasi",
            short_name: "Lokasi",
            description: "Lihat lokasi DoozeCoofe di Banda Aceh",
            url: "/#lokasi",
            icons: [
              {
                src: "/icons/icon-192.png",
                sizes: "192x192",
                type: "image/png",
              },
            ],
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,jpg,jpeg,json,woff2}"],
        navigateFallback: "index.html",
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/images\.unsplash\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "unsplash-images",
              expiration: {
                maxEntries: 80,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.(gstatic|googleapis)\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "google-fonts",
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ request, sameOrigin }) =>
              sameOrigin &&
              (request.destination === "style" ||
                request.destination === "script" ||
                request.destination === "worker"),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "app-static-assets",
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: "module",
      },
    }),
  ],
});
