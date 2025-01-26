import {defineConfig} from 'vite'
import dts from 'vite-plugin-dts'

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  build: {
    outDir: './dist',
    emptyOutDir: false,
    minify: true,
    lib: {
      entry: './papaparse.ts',
      name: 'papaparse',
      fileName: 'papaparse.min',
      formats: ['umd']
    },
  },
  plugins: [
    dts({
      exclude: ['tests/**/*', 'vite.config.*']
    })
  ],
  define: {
  }
})
