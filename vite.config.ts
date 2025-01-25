import {defineConfig} from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  build: {
    outDir: './dist',
    commonjsOptions: {
      //https://github.com/vitejs/vite/issues/5759
      //@ts-ignore
      ignoreTryCatch: false
    },
  },
  plugins: [
  ],
  define: {
  }
})
