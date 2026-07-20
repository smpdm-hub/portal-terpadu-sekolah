import { defineConfig } from 'vite'
import react from '@vitejs.plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // 💡 PENTING: Menggunakan jalur relatif agar aset CSS/JS dibaca sempurna oleh GitHub Pages
})
