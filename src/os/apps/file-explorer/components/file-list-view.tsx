import { For, Show, type Accessor, type JSX, type Signal } from "solid-js"
import type { FsPath, FsEntry, FileEntry } from "~/os/fs"
import { entryName as fsEntryName } from "~/os/fs"
import { cn } from "~/os/utils"
import { ContextMenu, ContextMenuTrigger } from "~/components/core"
import { getFileIcon, formatFileSize, formatDate } from "../utils"
import type { SortBy, SortOrder } from "../types"
import { useMarqueeSelection, type MarqueeRect } from "./marquee-selection"

type FileListViewProps = {
  entries: Accessor<FsEntry[]>
  isSelected: (path: FsPath) => boolean
  sortBy: Accessor<SortBy>
  sortOrder: Accessor<SortOrder>
  onSelect: (entry: FsEntry, event: MouseEvent) => void
  onDoubleClick: (entry: FsEntry) => void
  onToggleSort: (sortBy: SortBy) => void
  renderContextMenu: (entry: FsEntry) => JSX.Element
  containerRef: Signal<HTMLElement | undefined>
  onMarqueeSelection: (rect: MarqueeRect) => void
  onMarqueeEnd: (rect: MarqueeRect) => void
  onClearSelection: () => void
}

export const FileListView = (props: FileListViewProps) => {
  let containerEl: HTMLDivElement | undefined

  const marquee = useMarqueeSelection(() => containerEl, {
    onSelectionChange: props.onMarqueeSelection,
    onSelectionEnd: props.onMarqueeEnd,
    onClear: props.onClearSelection,
  })

  const sortIndicator = (column: SortBy) => {
    if (props.sortBy() !== column) return ""
    return props.sortOrder() === "asc" ? "\u2191" : "\u2193"
  }

  return (
    <>
      <div class="flex items-center gap-2 border-b border-border bg-secondary/30 px-3 py-1.5 text-[11px] font-medium text-muted-foreground">
        <button class="flex-1 text-left hover:text-foreground" onClick={() => props.onToggleSort("name")}>
          Name {sortIndicator("name")}
        </button>
        <button class="w-24 text-right hover:text-foreground" onClick={() => props.onToggleSort("modified")}>
          Modified {sortIndicator("modified")}
        </button>
        <button class="w-20 text-right hover:text-foreground" onClick={() => props.onToggleSort("type")}>
          Type {sortIndicator("type")}
        </button>
        <button class="w-16 text-right hover:text-foreground" onClick={() => props.onToggleSort("size")}>
          Size {sortIndicator("size")}
        </button>
      </div>
      <div
        ref={(el) => {
          containerEl = el
          props.containerRef[1](el)
        }}
        class="relative flex-1 space-y-0.5 overflow-auto p-2"
        tabIndex={0}
      >
        <For each={props.entries()}>
          {(entry) => (
            <ContextMenu>
              <ContextMenuTrigger>
                <button
                  data-file-entry
                  data-file-path={entry.path}
                  class={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent",
                    props.isSelected(entry.path) && "bg-accent",
                  )}
                  onClick={(e) => props.onSelect(entry, e)}
                  onDblClick={() => props.onDoubleClick(entry)}
                >
                  {getFileIcon(entry)}
                  <span class="flex-1 truncate text-sm">{fsEntryName(entry.path)}</span>
                  <span class="w-24 text-right text-xs text-muted-foreground">
                    {formatDate(entry.type === "file" ? (entry as FileEntry).modified : entry.created)}
                  </span>
                  <span class="w-20 text-right text-xs text-muted-foreground">
                    {entry.type === "dir" ? "Folder" : fsEntryName(entry.path).split(".").pop()}
                  </span>
                  <span class="w-16 text-right text-xs text-muted-foreground">
                    {entry.type === "file" ? formatFileSize((entry as FileEntry).size) : "-"}
                  </span>
                </button>
              </ContextMenuTrigger>
              {props.renderContextMenu(entry)}
            </ContextMenu>
          )}
        </For>
        <Show when={marquee.isSelecting() && marquee.hasDragged()}>
          <div
            class="pointer-events-none absolute z-50 border border-primary/50 bg-primary/10"
            style={marquee.selectionStyle()}
          />
        </Show>
      </div>
    </>
  )
}
