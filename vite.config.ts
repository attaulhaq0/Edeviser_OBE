/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'path';

const isAnalyze = process.env.ANALYZE === 'true';

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    isAnalyze &&
      visualizer({
        filename: 'dist/bundle-report.html',
        open: true,
        gzipSize: true,
        brotliSize: true,
      }),
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-query': ['@tanstack/react-query', '@tanstack/react-table'],
          'vendor-charts': ['recharts'],
          'vendor-motion': ['framer-motion'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.{test,property.test}.ts', 'src/**/*.{test,property.test}.tsx'],
    pool: 'forks',
    css: false,
    testTimeout: 15000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/__tests__/**',
        'src/types/**',
        'src/components/ui/**',
        'src/**/*.d.ts',
      ],
      thresholds: {
        statements: 60,
        branches: 50,
        functions: 55,
        lines: 60,
      },
    },
  },
});
