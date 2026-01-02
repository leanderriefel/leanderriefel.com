import { Show } from "solid-js"
import { WifiIcon, WifiOffIcon } from "lucide-solid"
import { Switch } from "~/components/core"
import { useNetwork } from "~/os/api"

export const NetworkSettings = () => {
  const { enabled, setEnabled } = useNetwork()

  return (
    <div class="space-y-4">
      <h3 class="text-base font-semibold text-foreground">Network</h3>

      {/* WiFi Toggle */}
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <Show when={enabled()} fallback={<WifiOffIcon class="size-5 text-muted-foreground" />}>
            <WifiIcon class="size-5 text-muted-foreground" />
          </Show>
          <label class="text-sm text-muted-foreground">WiFi</label>
        </div>
        <Switch checked={enabled()} onCheckedChange={(checked) => setEnabled(checked)} size="sm" />
      </div>

      {/* Status Display */}
      <div class="rounded-lg bg-muted/50 p-3">
        <p class="text-sm text-muted-foreground">
          <Show when={enabled()} fallback="WiFi is turned off">
            WiFi is enabled
          </Show>
        </p>
      </div>
    </div>
  )
}
