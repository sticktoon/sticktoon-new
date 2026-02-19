import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        strictPort: false,
        host: '0.0.0.0'
      },
      plugins: [react()],
        base: "/",
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        assetsInlineLimit: 4096,
        rollupOptions: {
          output: {
            assetFileNames: (assetInfo) => {
              const info = assetInfo.name.split('.')
              const ext = info[info.length - 1]
              if (/png|jpe?g|gif|svg|webp/i.test(ext)) {
                return `images/[name]-[hash][extname]`
              }
              return `assets/[name]-[hash][extname]`
            }
          }
        }
      }
    };
});
