import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { nitro } from 'nitro/vite'
import tailwindcss from '@tailwindcss/vite'
import viteReact from '@vitejs/plugin-react'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  // e2e đóng browser context giữa chừng → ECONNRESET thoáng qua, không đáng
  // phủ overlay toàn màn chặn mọi click của test đang chạy (e2e chia sẻ
  // server 3100).
  server: { hmr: { overlay: false } },
  plugins: [
    devtools(),
    tailwindcss(),
    tanstackStart(),
    nitro({ preset: 'vercel' }),
    viteReact(),
  ],
})

export default config
