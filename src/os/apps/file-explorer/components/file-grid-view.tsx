import { For, Show, type Accessor, type JSX, type Signal } from "solid-js"
import type { FsPath, FsEntry } from "~/os/fs"
import { cn } from "~/os/utils"
import { ContextMenu, ContextMenuTrigger } from "~/components/core"
import { FileIcon } from "./file-icon"
import { useMarqueeSelection, type MarqueeRect } from "./marquee-selection"

type FileGridViewProps = {
  entries: Accessor<FsEntry[]>
  isSelected: (path: FsPath) => boolean
  onSelect: (entry: FsEntry, event: MouseEvent) => void
  onDoubleClick: (entry: FsEntry) => void
  renderContextMenu: (entry: FsEntry) => JSX.Element
  containerRef: Signal<HTMLElement | undefined>
  onMarqueeSelection: (rect: MarqueeRect) => void
  onMarqueeEnd: (rect: MarqueeRect) => void
  onClearSelection: () => void
}

export const FileGridView = (props: FileGridViewProps) => {
  let containerEl: HTMLDivElement | undefined

  const marquee = useMarqueeSelection(() => containerEl, {
    onSelectionChange: props.onMarqueeSelection,
    onSelectionEnd: props.onMarqueeEnd,
    onClear: props.onClearSelection,
  })

  return (
    <div
      ref={(el) => {
        containerEl = el
        props.containerRef[1](el)
      }}
      class="relative min-h-full"
      tabIndex={0}
    >
      <div class="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] place-items-center content-start gap-1">
        <For each={props.entries()}>
          {(entry) => (
            <ContextMenu>
              <ContextMenuTrigger>
                <button
                  data-file-entry
                  data-file-path={entry.path}
                  class={cn(
                    "group flex size-[90px] flex-col items-center gap-1.5 rounded-lg p-2 text-ellipsis transition-colors hover:bg-accent",
                    props.isSelected(entry.path) && "bg-accent",
                  )}
                  onClick={(e) => props.onSelect(entry, e)}
                  onDblClick={() => props.onDoubleClick(entry)}
                >
                  <FileIcon entry={entry} />
                </button>
              </ContextMenuTrigger>
              {props.renderContextMenu(entry)}
            </ContextMenu>
          )}
        </For>
      </div>
      <Show when={marquee.isSelecting() && marquee.hasDragged()}>
        <div
          class="pointer-events-none absolute z-50 border border-primary/50 bg-primary/10"
          style={marquee.selectionStyle()}
        />
      </Show>
    </div>
  )
}
