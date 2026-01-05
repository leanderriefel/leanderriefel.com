import { Volume2Icon, Volume1Icon, VolumeXIcon, VolumeIcon } from "lucide-solid"
import { Show, type Accessor } from "solid-js"
import { Switch } from "~/components/core"
import { useAudio } from "~/os/api"

const VolumeIconDynamic = (props: { volume: Accessor<number>; muted: Accessor<boolean>; class?: string }) => {
  return (
    <Show when={!props.muted()} fallback={<VolumeXIcon class={props.class} />}>
      <Show when={props.volume() > 0} fallback={<VolumeIcon class={props.class} />}>
        <Show when={props.volume() > 50} fallback={<Volume1Icon class={props.class} />}>
          <Volume2Icon class={props.class} />
        </Show>
      </Show>
    </Show>
  )
}

export const AudioSettings = () => {
  const { volume, setVolume, muted, setMuted } = useAudio()

  return (
    <div class="space-y-4">
      <h3 class="text-base font-semibold text-foreground">Audio</h3>

      {/* Volume Control */}
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <label class="text-sm text-muted-foreground">Volume</label>
          <span class="text-sm text-muted-foreground">{volume()}%</span>
        </div>
        <div class="flex items-center gap-3">
          <VolumeIconDynamic volume={volume} muted={muted} class="size-5 text-muted-foreground" />
          <input
            type="range"
            min="0"
            max="100"
            value={volume()}
            onInput={(e) => setVolume(parseInt(e.currentTarget.value))}
            class="w-full"
          />
        </div>
      </div>

      {/* Mute Toggle */}
      <div class="flex items-center justify-between">
        <label class="text-sm text-muted-foreground">Mute audio</label>
        <Switch checked={muted()} onCheckedChange={(checked) => setMuted(checked)} size="sm" />
      </div>
    </div>
  )
}
