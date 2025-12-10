import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // IMPORTANTE: O nome entre as barras deve ser IGUAL ao nome do seu repositório no GitHub
  base: '/Trade-Junco/', 
})
