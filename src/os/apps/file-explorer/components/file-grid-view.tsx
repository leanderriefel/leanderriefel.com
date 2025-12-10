import { For, Show, type Accessor, type JSX } from "solid-js"
import type { FsPath, FsEntry } from "~/os/fs"
import { entryName as fsEntryName } from "~/os/fs"
import { cn } from "~/os/utils"
import { ContextMenu, ContextMenuTrigger } from "~/components/core"
import { FolderIcon } from "lucide-solid"
import { getFileIcon } from "../utils"

type FileGridViewProps = {
  entries: Accessor<FsEntry[]>
  selectedEntry: Accessor<FsPath | null>
  onSelect: (path: FsPath) => void
  onDoubleClick: (entry: FsEntry) => void
  renderContextMenu: (entry: FsEntry) => JSX.Element
}

export const FileGridView = (props: FileGridViewProps) => {
  return (
    <div class="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] place-items-center gap-2">
      <For each={props.entries()}>
        {(entry) => (
          <ContextMenu>
            <ContextMenuTrigger>
              <button
                class={cn(
                  "group flex size-[90px] flex-col items-center gap-1.5 rounded-lg p-2 text-ellipsis transition-colors hover:bg-accent",
                  props.selectedEntry() === entry.path && "bg-accent",
                )}
                onClick={() => props.onSelect(entry.path)}
                onDblClick={() => props.onDoubleClick(entry)}
              >
                <div class="flex size-12 items-center justify-center">
                  <Show
                    when={entry.type === "dir"}
                    fallback={
                      <div class="flex size-10 items-center justify-center rounded-lg bg-secondary">
                        {getFileIcon(entry)}
                      </div>
                    }
                  >
                    <FolderIcon class="size-10 text-warning" />
                  </Show>
                </div>
                <span class="w-full truncate text-center text-xs">{fsEntryName(entry.path)}</span>
              </button>
            </ContextMenuTrigger>
            {props.renderContextMenu(entry)}
          </ContextMenu>
        )}
      </For>
    </div>
  )
}

