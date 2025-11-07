import { WindowManager } from "~/os/windows/window-manager"
import { openApp } from "~/os/windows/open-windows"
import { appRegistry, createAppInstance } from "~/os"
import { For } from "solid-js"

export default function Home() {
  return (
    <div class="relative h-screen w-screen bg-neutral-900">
      <WindowManager />
      <div class="absolute right-0 bottom-2 left-0 mx-auto flex h-12 w-fit min-w-2xl items-center gap-x-2 rounded-xl bg-white/25 px-2 backdrop-blur-xl">
        <For each={appRegistry}>
          {(AppClass) => (
            <button
              onClick={() => {
                openApp(createAppInstance(AppClass))
              }}
              style={{
                "background-color": AppClass.getMetadata().color,
              }}
              class="size-8 origin-bottom rounded-lg border border-black transition-all duration-500 hover:z-40 hover:scale-125"
            />
          )}
        </For>
      </div>
    </div>
  )
}
