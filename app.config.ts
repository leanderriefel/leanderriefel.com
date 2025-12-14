import { defineConfig } from "@solidjs/start/config"
import tailwindcss from "@tailwindcss/vite"
import type { PluginOption } from "vite"

export default defineConfig({
  vite: {
    plugins: [tailwindcss() as PluginOption],
  },
  ssr: false,
  server: {
    preset: "vercel",
  },
})
