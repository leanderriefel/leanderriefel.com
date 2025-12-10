import { Show, type Accessor } from "solid-js"
import type { FsPath } from "~/os/fs"
import { entryName as fsEntryName } from "~/os/fs"

type StatusBarProps = {
  itemCount: Accessor<number>
  selectedEntry: Accessor<FsPath | null>
}

export const StatusBar = (props: StatusBarProps) => {
  return (
    <div class="flex items-center justify-between border-t border-border bg-secondary/30 px-3 py-1">
      <span class="text-[11px] text-muted-foreground">{props.itemCount()} items</span>
      <Show when={props.selectedEntry()}>
        <span class="text-[11px] text-muted-foreground">Selected: {fsEntryName(props.selectedEntry()!)}</span>
      </Show>
    </div>
  )
}

