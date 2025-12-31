import { createSignal, onCleanup, onMount } from "solid-js"
import { cn } from "~/os/utils"

export const ClockBar = () => {
  const [now, setNow] = createSignal(new Date())

  onMount(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    onCleanup(() => clearInterval(timer))
  })

  const timeString = () => now().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  const dateString = () => now().toLocaleDateString([], { weekday: "short", month: "short", day: "2-digit" })

  return (
    <div class={cn("flex h-12 w-fit items-center gap-2 rounded-2xl bg-background/50 px-4")}>
      <div class="flex flex-col items-center justify-center text-center leading-tight whitespace-nowrap">
        <span class="text-xs">{timeString()}</span>
        <span class="text-xs text-muted-foreground">{dateString()}</span>
      </div>
    </div>
  )
}
