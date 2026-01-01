import { createSignal, Show } from "solid-js"
import { motion, AnimatePresence } from "motion-solid"
import { cn } from "~/os/utils"
import { Volume2Icon, WifiIcon } from "lucide-solid"
import { Button } from "~/components/core"

export const TaskbarControls = () => {
  const [expanded, setExpanded] = createSignal<"volume" | "wifi" | null>(null)

  return (
    <div class="flex w-full items-center justify-start">
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
              onClick={() => setExpanded(expanded() === "volume" ? null : "volume")}
            >
              <Volume2Icon class="size-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => setExpanded(expanded() === "wifi" ? null : "wifi")}>
              <WifiIcon class="size-4" />
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
                <input type="range" class="mr-2 w-full" />
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
                <div class="grid w-full grid-cols-2 text-sm">
                  <Button variant="ghost" class="w-full">
                    WiFi On
                  </Button>
                  <Button variant="ghost" class="w-full">
                    WiFi Off
                  </Button>
                </div>
              </motion.div>
            </Show>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
