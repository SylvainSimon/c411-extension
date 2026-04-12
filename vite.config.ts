import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';

export default defineConfig({
  plugins: [
    crx({ manifest }),
    {
      name: 'fix-crxjs-platform',
      configResolved(config) {
        // Nettoyage de l'option 'platform' qui cause des avertissements dans Vite 8
        const build = config.build as any;
        if (build.rollupOptions && build.rollupOptions.platform) {
          delete build.rollupOptions.platform;
        }
        if (build.rolldownOptions && build.rolldownOptions.platform) {
          // Si on veut vraiment la plateforme browser pour Rolldown
          // build.rolldownOptions.platform = 'browser'; 
          // Mais pour l'instant on supprime pour voir si l'erreur disparaît
          delete build.rolldownOptions.platform;
        }
      }
    }
  ],
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      port: 5173,
    },
    cors: true
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rolldownOptions: {
      external: ['path'],
      output: {
        manualChunks: undefined
      }
    }
  } as any,
});
