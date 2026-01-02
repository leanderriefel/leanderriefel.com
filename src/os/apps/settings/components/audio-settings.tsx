import { Volume2Icon, Volume1Icon, VolumeXIcon, VolumeIcon } from "lucide-solid"
import { Switch } from "~/components/core"
import { useAudio } from "~/os/api"

const VolumeIconDynamic = (props: { volume: number; muted: boolean; class?: string }) => {
  if (props.muted) return <VolumeXIcon class={props.class} />
  if (props.volume === 0) return <VolumeIcon class={props.class} />
  if (props.volume <= 50) return <Volume1Icon class={props.class} />
  return <Volume2Icon class={props.class} />
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
          <VolumeIconDynamic volume={volume()} muted={muted()} class="size-5 text-muted-foreground" />
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
