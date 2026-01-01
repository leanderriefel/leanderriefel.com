import { Show, type Accessor } from "solid-js"
import type { FsPath } from "~/os/fs"
import { entryName as fsEntryName } from "~/os/fs"

type StatusBarProps = {
  itemCount: Accessor<number>
  selectedCount: Accessor<number>
  selectedEntries: Accessor<Set<FsPath>>
}

export const StatusBar = (props: StatusBarProps) => {
  const getSelectedText = () => {
    const count = props.selectedCount()
    if (count === 0) return null
    if (count === 1) {
      const paths = [...props.selectedEntries()]
      return `Selected: ${fsEntryName(paths[0])}`
    }
    return `${count} items selected`
  }

  return (
    <div class="flex items-center justify-between border-t border-border bg-secondary/30 px-3 py-1">
      <span class="text-[11px] text-muted-foreground">{props.itemCount()} items</span>
      <Show when={getSelectedText()}>
        <span class="text-[11px] text-muted-foreground">{getSelectedText()}</span>
      </Show>
    </div>
  )
}
