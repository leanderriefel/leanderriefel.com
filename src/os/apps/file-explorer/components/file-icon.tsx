import { FsEntry } from "~/os/fs"
import { getFileIcon } from "../utils"
import { FolderIcon } from "lucide-solid"
import { entryName } from "~/os/fs"
import { Show } from "solid-js"

export const FileIcon = (props: { entry: FsEntry }) => {
  return (
    <>
      <div class="flex flex-1 items-center justify-center">
        <Show
          when={props.entry.type === "dir"}
          fallback={
            <div class="flex size-10 items-center justify-center rounded-lg bg-secondary">
              {getFileIcon(props.entry)}
            </div>
          }
        >
          <FolderIcon class="size-10 text-warning" />
        </Show>
      </div>
      <span class="max-w-full shrink-0 cursor-default truncate text-center text-xs select-none">
        {entryName(props.entry.path)}
      </span>
    </>
  )
}
