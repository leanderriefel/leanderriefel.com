import { Show, type Accessor } from "solid-js"
import { Textarea } from "~/components/core"
import { FileTextIcon } from "lucide-solid"
import type { FsPath } from "~/os/fs"
import type { EditorStatus } from "../types"

type EditorAreaProps = {
  currentPath: Accessor<FsPath | null>
  content: Accessor<string>
  status: Accessor<EditorStatus>
  onContentChange: (value: string) => void
}

export const EditorArea = (props: EditorAreaProps) => {
  return (
    <div class="relative flex min-h-0 flex-1 flex-col p-2">
      <Show when={props.status() === "loading"}>
        <div class="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div class="flex items-center gap-2 text-sm text-muted-foreground">
            <FileTextIcon class="size-4 animate-pulse" />
            <span>Loading file...</span>
          </div>
        </div>
      </Show>
      <Show
        when={props.currentPath()}
        fallback={
          <div class="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
            <FileTextIcon class="size-16 opacity-30" />
            <p class="text-sm">No file open</p>
            <p class="text-xs">Enter a file path above and click Open to edit a text file</p>
          </div>
        }
      >
        <Textarea
          class="h-full min-h-0 flex-1 resize-none font-mono text-sm"
          placeholder="Start typing..."
          value={props.content()}
          onInput={(e) => props.onContentChange(e.currentTarget.value)}
          disabled={props.status() === "loading"}
        />
      </Show>
    </div>
  )
}
