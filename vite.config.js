import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // servir desde la raíz del proyecto
  plugins: [react()],
  server: { port: 5173 },
  build: { outDir: 'dist' }
})