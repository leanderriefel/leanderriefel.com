import { For, type Accessor } from "solid-js"
import type { FsPath } from "~/os/fs"
import { cn } from "~/os/utils"
import { QUICK_ACCESS } from "../constants"

type SidebarProps = {
  currentPath: Accessor<FsPath>
  onNavigate: (path: FsPath) => void
}

export const Sidebar = (props: SidebarProps) => {
  return (
    <div class="flex w-48 shrink-0 flex-col border-r border-border">
      <div class="p-2">
        <p class="mb-1.5 px-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Quick Access</p>
        <div class="space-y-0.5">
          <For each={QUICK_ACCESS}>
            {(item) => (
              <button
                class={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-accent",
                  props.currentPath() === item.path && "bg-accent text-accent-foreground",
                )}
                onClick={() => props.onNavigate(item.path)}
              >
                <item.icon class="size-4 text-muted-foreground" />
                <span>{item.name}</span>
              </button>
            )}
          </For>
        </div>
      </div>
    </div>
  )
}

