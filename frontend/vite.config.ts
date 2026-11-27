import path from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

function toPublicUrl(raw?: string): string {
  if (!raw || raw === '.') {
    return '/';
  }
  const normalized = raw.startsWith('/') ? raw : `/${raw}`;
  return normalized.endsWith('/') ? normalized : `${normalized}/`;
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // Fail closed: mock auth bypasses BC Gov SSO (Keycloak) and grants a SYS_ADMIN user, so it must never be
  // compiled into anything but the local dev server. Refuse the build rather than ship a bypass.
  if (mode !== 'development' && env.VITE_MOCK_USER === 'true') {
    throw new Error(
      `VITE_MOCK_USER=true is not allowed for a non-development build (mode="${mode}"). ` +
        'Mock auth disables real authentication and must only run on the local dev server.',
    );
  }

  const publicUrl = mode === 'development' ? '/' : toPublicUrl(env.PUBLIC_URL);

  return {
    base: publicUrl,
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon.svg'],
        manifest: {
          name: 'SCS',
          short_name: 'SCS',
          description: 'SCS application.',
          theme_color: '#ffffff',
          icons: [
            {
              src: 'icons/android-chrome-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'icons/android-chrome-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
          ],
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
          // config.js is rewritten at container start (Keycloak issuer/client id); precaching it
          // would serve a stale copy after a redeploy changes those values.
          globIgnores: ['**/config.js'],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    build: {
      outDir: 'build',
    },
    css: {
      preprocessorOptions: {
        scss: { quietDeps: true },
      },
    },
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: 'http://localhost:8080',
          changeOrigin: true,
        },
      },
    },
  };
});
