import { createSignal } from "solid-js"
import { TestApp } from "~/os/apps/test"
import { WindowManager } from "~/os/windows/window-manager"
import { openApps, setOpenApps } from "~/os/windows/open-windows"

export default function Home() {
  return (
    <div class="relative h-screen w-screen bg-neutral-900">
      <WindowManager />
      <div class="absolute right-0 bottom-2 left-0 mx-auto flex h-12 w-fit min-w-2xl items-center gap-x-2 rounded-xl bg-white/25 px-2 backdrop-blur-xl">
        <button
          onClick={() => {
            // eslint-disable-next-line solid/reactivity
            const display = createSignal<"default" | "minimized" | "maximized" | "fullscreen">("default")
            // eslint-disable-next-line solid/reactivity
            const position = createSignal({ x: 100, y: 100 })
            // eslint-disable-next-line solid/reactivity
            const size = createSignal({ width: 500, height: 500 })

            setOpenApps("apps", openApps.apps.length, {
              app: new TestApp(display),
              display,
              position,
              size,
            })
          }}
          class="size-8 origin-bottom rounded-lg border border-black bg-sky-600 transition-all duration-500 hover:z-40 hover:scale-125"
        />
      </div>
    </div>
  )
}
