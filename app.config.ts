import { defineConfig } from "@solidjs/start/config"
import tailwindcss from "@tailwindcss/vite"
import type { PluginOption } from "vite"

export default defineConfig({
  vite: {
    plugins: [tailwindcss() as PluginOption],
    resolve: {
      dedupe: ["solid-js", "solid-js/web"],
    },
  },
  server: {
    // eslint-disable-next-line no-undef
    preset: process.env["VERCEL"] ? "vercel" : "node-server",
  },
})
