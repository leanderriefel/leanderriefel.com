import { WindowManager } from "~/os/windows/window-manager"
import { appRegistry } from "~/os"
import { For } from "solid-js"
import { TaskbarButton, TaskbarButtons } from "~/components/taskbar/taskbar-button"

export default function Home() {
  return (
    <div class="relative h-screen w-screen overflow-hidden bg-background selection:bg-primary/20">
      {/* Subtle grid pattern */}
      <div class="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] mask-[radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] bg-size-[4rem_4rem] opacity-20" />

      {/* Layered gradients add depth without glow orbs */}
      <div class="pointer-events-none absolute inset-0">
        <div class="absolute inset-0 bg-linear-to-b from-background/60 via-background/80 to-background/90 opacity-90" />
        <div class="from-background/95/40 to-background/95/40 absolute inset-0 bg-linear-to-r via-transparent opacity-70 mix-blend-soft-light" />
      </div>

      <WindowManager />

      {/* Taskbar */}
      <div class="absolute bottom-6 left-1/2 z-50 -translate-x-1/2">
        <div class="flex h-10 w-[95vw] items-center justify-center gap-x-3 rounded-xl border border-border/50 bg-background/10 px-4 shadow-2xl backdrop-blur-xl transition-all sm:w-[60vw]">
          <TaskbarButtons>
            <For each={appRegistry}>{(appClass) => <TaskbarButton appClass={appClass} />}</For>
          </TaskbarButtons>
        </div>
      </div>
    </div>
  )
}
