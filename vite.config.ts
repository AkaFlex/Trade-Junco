import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // AQUI ESTÁ O SEGREDO DO GITHUB PAGES:
  base: '/Trade-Junco/', 
})