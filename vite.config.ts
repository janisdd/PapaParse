/// <reference types="vitest/config" />
import {defineConfig} from 'vite'
import dts from 'vite-plugin-dts'

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  build: {
    outDir: './dist',
    minify: false,
    lib: {
      entry: './papaparse.ts',
      name: 'papaparse',
      fileName: 'papaparse',
      formats: ['umd']
    },
  },
  test: {
    include: ['tests/**/*'],
    coverage: {
      reporter: ['text', 'json', 'html'],
    },
  },
  plugins: [
    dts({
      exclude: ['tests/**/*', 'vite.config.*']
    })
  ],
  define: {}
})
