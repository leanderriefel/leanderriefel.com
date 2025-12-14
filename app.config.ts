import { defineConfig } from "@solidjs/start/config"
import tailwindcss from "@tailwindcss/vite"
import type { PluginOption } from "vite"

export default defineConfig({
  vite: {
    plugins: [tailwindcss() as PluginOption],
  },
  server: {
    // eslint-disable-next-line no-undef
    preset: process.env["VERCEL"] ? "vercel" : "node-server",
  },
})
