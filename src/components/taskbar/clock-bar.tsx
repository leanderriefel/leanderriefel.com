import { createSignal, onCleanup, onMount } from "solid-js"

export const ClockBar = () => {
  const [now, setNow] = createSignal(new Date())

  onMount(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    onCleanup(() => clearInterval(timer))
  })

  const timeString = () => now().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  const dateString = () => now().toLocaleDateString([], { weekday: "short", month: "short", day: "2-digit" })

  return (
    <div class="soft-chip flex h-10 w-fit items-center gap-2 rounded-xl px-3">
      <div class="flex flex-col text-center leading-tight whitespace-nowrap">
        <span class="text-xxs">{timeString()}</span>
        <span class="text-xxs text-muted-foreground">{dateString()}</span>
      </div>
    </div>
  )
}
