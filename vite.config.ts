import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Publicado em https://rgvduarte.github.io/hell160/
export default defineConfig({
  base: '/hell160/',
  plugins: [react()],
})
