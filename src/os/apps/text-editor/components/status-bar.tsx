import { Show, type Accessor } from "solid-js"
import { FileTextIcon, AlertCircleIcon } from "lucide-solid"
import type { EditorStatus } from "../types"

type StatusBarProps = {
  status: Accessor<EditorStatus>
  errorMessage: Accessor<string>
  fileName: Accessor<string>
  hasUnsavedChanges: Accessor<boolean>
}

export const StatusBar = (props: StatusBarProps) => {
  return (
    <div class="flex items-center gap-2 border-b border-border bg-secondary/30 px-3 py-1.5">
      <Show
        when={props.status() !== "error"}
        fallback={
          <div class="flex items-center gap-2 text-destructive">
            <AlertCircleIcon class="size-4" />
            <span class="text-xs">{props.errorMessage()}</span>
          </div>
        }
      >
        <FileTextIcon class="size-4 text-muted-foreground" />
        <span class="text-xs text-foreground">{props.fileName()}</span>
        <Show when={props.hasUnsavedChanges()}>
          <span class="text-xs text-warning">• Unsaved changes</span>
        </Show>
        <Show when={props.status() === "loading"}>
          <span class="text-xs text-muted-foreground">Loading...</span>
        </Show>
        <Show when={props.status() === "saving"}>
          <span class="text-xs text-muted-foreground">Saving...</span>
        </Show>
      </Show>
    </div>
  )
}
