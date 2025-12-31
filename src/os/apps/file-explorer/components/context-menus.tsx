import { Show } from "solid-js"
import type { FsEntry } from "~/os/fs"
import { ContextMenuContent, ContextMenuItem, ContextMenuSeparator } from "~/components/core"
import {
  FolderOpenIcon,
  AppWindowIcon,
  CopyIcon,
  ScissorsIcon,
  PencilIcon,
  Trash2Icon,
  FolderPlusIcon,
  FilePlusIcon,
  ClipboardIcon,
  RefreshCwIcon,
} from "lucide-solid"

type EntryContextMenuProps = {
  entry: FsEntry
  onOpen: () => void
  onOpenWith: () => void
  onCopy: () => void
  onCut: () => void
  onRename: () => void
  onDelete: () => void
}

export const EntryContextMenu = (props: EntryContextMenuProps) => {
  return (
    <ContextMenuContent>
      <ContextMenuItem onSelect={props.onOpen}>
        <FolderOpenIcon class="mr-2 size-4" />
        Open
      </ContextMenuItem>
      <Show when={props.entry.type === "file"}>
        <ContextMenuItem onSelect={props.onOpenWith}>
          <AppWindowIcon class="mr-2 size-4" />
          Open with...
        </ContextMenuItem>
      </Show>
      <ContextMenuSeparator />
      <ContextMenuItem onSelect={props.onCopy}>
        <CopyIcon class="mr-2 size-4" />
        Copy
      </ContextMenuItem>
      <ContextMenuItem onSelect={props.onCut}>
        <ScissorsIcon class="mr-2 size-4" />
        Cut
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onSelect={props.onRename}>
        <PencilIcon class="mr-2 size-4" />
        Rename
      </ContextMenuItem>
      <ContextMenuItem variant="destructive" onSelect={props.onDelete}>
        <Trash2Icon class="mr-2 size-4" />
        Delete
      </ContextMenuItem>
    </ContextMenuContent>
  )
}

type BackgroundContextMenuProps = {
  hasClipboard: boolean
  onNewFolder: () => void
  onNewFile: () => void
  onPaste: () => void
  onRefresh: () => void
}

export const BackgroundContextMenu = (props: BackgroundContextMenuProps) => {
  return (
    <ContextMenuContent>
      <ContextMenuItem onSelect={props.onNewFolder}>
        <FolderPlusIcon class="mr-2 size-4" />
        New Folder
      </ContextMenuItem>
      <ContextMenuItem onSelect={props.onNewFile}>
        <FilePlusIcon class="mr-2 size-4" />
        New File
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onSelect={props.onPaste} disabled={!props.hasClipboard}>
        <ClipboardIcon class="mr-2 size-4" />
        Paste
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onSelect={props.onRefresh}>
        <RefreshCwIcon class="mr-2 size-4" />
        Refresh
      </ContextMenuItem>
    </ContextMenuContent>
  )
}
