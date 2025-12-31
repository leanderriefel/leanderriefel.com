import { For, type Accessor, type JSX } from "solid-js"
import type { FsPath, FsEntry, FileEntry } from "~/os/fs"
import { entryName as fsEntryName } from "~/os/fs"
import { cn } from "~/os/utils"
import { ContextMenu, ContextMenuTrigger } from "~/components/core"
import { getFileIcon, formatFileSize, formatDate } from "../utils"
import type { SortBy, SortOrder } from "../types"

type FileListViewProps = {
  entries: Accessor<FsEntry[]>
  selectedEntry: Accessor<FsPath | null>
  sortBy: Accessor<SortBy>
  sortOrder: Accessor<SortOrder>
  onSelect: (path: FsPath) => void
  onDoubleClick: (entry: FsEntry) => void
  onToggleSort: (sortBy: SortBy) => void
  renderContextMenu: (entry: FsEntry) => JSX.Element
}

export const FileListView = (props: FileListViewProps) => {
  const sortIndicator = (column: SortBy) => {
    if (props.sortBy() !== column) return ""
    return props.sortOrder() === "asc" ? "↑" : "↓"
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
      <div class="flex-1 space-y-0.5 overflow-auto p-2">
        <For each={props.entries()}>
          {(entry) => (
            <ContextMenu>
              <ContextMenuTrigger>
                <button
                  class={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent",
                    props.selectedEntry() === entry.path && "bg-accent",
                  )}
                  onClick={() => props.onSelect(entry.path)}
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
      </div>
    </>
  )
}
