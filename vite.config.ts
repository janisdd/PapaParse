import {defineConfig} from 'vite'
import dts from 'vite-plugin-dts'

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  build: {
    outDir: './dist',
    minify: false,
    commonjsOptions: {
      //https://github.com/vitejs/vite/issues/5759
      //@ts-ignore
      ignoreTryCatch: false
    },
    lib: {
      entry: './papaparse.ts',
      name: 'papaparse',
      fileName: 'papaparse',
      formats: ['umd']
    }
  },
  plugins: [
    dts()
  ],
  define: {
  }
})
