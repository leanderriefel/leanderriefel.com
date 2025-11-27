import { WindowManager } from "~/os/windows/window-manager"
import { appRegistry } from "~/os"
import { For } from "solid-js"
import { TaskbarButton } from "~/components/taskbar/taskbar-button"

export default function Home() {
  return (
    <div class="relative h-screen w-screen overflow-hidden bg-neutral-950 selection:bg-white/20">
      {/* Subtle grid pattern */}
      <div class="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)] mask-[radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] bg-size-[4rem_4rem]" />

      {/* Ambient glow */}
      <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_800px_at_50%_-30%,#333333,transparent)]" />

      <WindowManager />

      {/* Taskbar */}
      <div class="absolute bottom-6 left-1/2 z-50 -translate-x-1/2">
        <div class="flex h-10 w-[95vw] items-center justify-center gap-x-3 rounded-xl border border-white/5 bg-white/2 px-4 shadow-2xl backdrop-blur-2xl transition-all sm:w-[60vw]">
          <For each={appRegistry}>{(appClass) => <TaskbarButton appClass={appClass} />}</For>
        </div>
      </div>
    </div>
  )
}
