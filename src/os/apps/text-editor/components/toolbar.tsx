import type { Accessor } from "solid-js"
import { Button, Separator } from "~/components/core"
import { FolderOpenIcon, SaveIcon, FilePlusIcon } from "lucide-solid"
import type { FsPath } from "~/os/fs"
import type { EditorStatus } from "../types"

type ToolbarProps = {
  status: Accessor<EditorStatus>
  currentPath: Accessor<FsPath | null>
  onOpen: () => void
  onSave: () => void
  onSaveAs: () => void
}

export const Toolbar = (props: ToolbarProps) => {
  return (
    <div class="flex items-center gap-2 border-b border-border px-3 py-2">
      <Button variant="ghost" size="sm" onClick={props.onOpen} disabled={props.status() === "loading"}>
        <FolderOpenIcon class="mr-1.5 size-4" />
        Open
      </Button>

      <Separator orientation="vertical" class="h-6" />

      <Button
        variant="ghost"
        size="sm"
        onClick={props.onSave}
        disabled={props.status() === "saving"}
      >
        <SaveIcon class="mr-1.5 size-4" />
        Save
      </Button>

      <Button variant="ghost" size="sm" onClick={props.onSaveAs} disabled={props.status() === "saving"}>
        <FilePlusIcon class="mr-1.5 size-4" />
        Save As
      </Button>
    </div>
  )
}

