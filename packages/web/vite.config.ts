import { fileURLToPath } from 'node:url';
import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';
import { compression } from 'vite-plugin-compression2';

export default defineConfig({
  root: 'src',
  publicDir: '../public',
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
    compression({ algorithms: ['brotliCompress'] }),
    visualizer({
      filename: fileURLToPath(new URL('../../.report-web-bundle/bundle.html', import.meta.url)),
      gzipSize: true,
    }),
  ],
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
  build: { outDir: '../dist', emptyOutDir: true },
});
