import { createSignal, onCleanup, Show } from "solid-js"
import { motion, AnimatePresence } from "motion-solid"
import { cn } from "~/os/utils"
import { Volume2Icon, Volume1Icon, VolumeXIcon, VolumeIcon, WifiIcon, WifiOffIcon } from "lucide-solid"
import { Button } from "~/components/core"
import { useAudio, useNetwork } from "~/os/api"

const VolumeIconDynamic = (props: { volume: number; muted: boolean }) => {
  if (props.muted) return <VolumeXIcon class="size-4" />
  if (props.volume === 0) return <VolumeIcon class="size-4" />
  if (props.volume <= 50) return <Volume1Icon class="size-4" />
  return <Volume2Icon class="size-4" />
}

export const TaskbarControls = () => {
  const [expanded, setExpanded] = createSignal<"volume" | "wifi" | null>(null)
  const { volume, setVolume, muted } = useAudio()
  const { enabled: wifiEnabled, toggleWifi } = useNetwork()

  const handleClickOutside = (e: MouseEvent) => {
    const target = e.target as HTMLElement
    const controls = target.closest("[data-taskbar-controls]")
    if (!controls && expanded() !== null) {
      setExpanded(null)
    }
  }

  if (typeof document !== "undefined") {
    document.addEventListener("click", handleClickOutside)
    onCleanup(() => document.removeEventListener("click", handleClickOutside))
  }

  return (
    <div class="flex w-full items-center justify-start" data-taskbar-controls>
      <motion.div
        layout
        layoutDependencies={[expanded]}
        class={cn("flex h-12 origin-left items-center justify-start gap-x-2 bg-background/50 pr-2 pl-4")}
        style={{
          "border-radius": "16px",
        }}
      >
        <div class="relative flex items-center justify-start overflow-hidden">
          <motion.div layout class="flex items-center pr-2">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={(e) => {
                e.stopPropagation()
                setExpanded(expanded() === "volume" ? null : "volume")
              }}
            >
              <VolumeIconDynamic volume={volume()} muted={muted()} />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={(e) => {
                e.stopPropagation()
                setExpanded(expanded() === "wifi" ? null : "wifi")
              }}
            >
              <Show when={wifiEnabled()} fallback={<WifiOffIcon class="size-4" />}>
                <WifiIcon class="size-4" />
              </Show>
            </Button>
          </motion.div>
          <AnimatePresence>
            <Show when={expanded() === "volume"}>
              <motion.div
                layout
                initial={{ width: 0, opacity: 0, filter: "blur(4px)", "margin-left": 0 }}
                animate={{ width: "auto", opacity: 1, filter: "blur(0px)", "margin-left": 8 }}
                exit={{ width: 0, opacity: 0, filter: "blur(4px)", "margin-left": 0 }}
                class="flex items-center justify-center overflow-hidden"
              >
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume()}
                  onInput={(e) => setVolume(parseInt(e.currentTarget.value))}
                  class="mr-2 w-full"
                  onClick={(e) => e.stopPropagation()}
                />
              </motion.div>
            </Show>
            <Show when={expanded() === "wifi"}>
              <motion.div
                layout
                initial={{ width: 0, opacity: 0, "margin-left": 0 }}
                animate={{ width: "auto", opacity: 1, "margin-left": 4 }}
                exit={{ width: 0, opacity: 0, "margin-left": 0 }}
                class="flex items-center justify-center overflow-hidden"
              >
                <Button
                  variant="ghost"
                  class="w-full"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleWifi()
                  }}
                >
                  <Show when={wifiEnabled()} fallback={"WiFi Off"}>
                    WiFi On
                  </Show>
                </Button>
              </motion.div>
            </Show>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
