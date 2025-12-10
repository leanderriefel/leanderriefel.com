import { For, Show, type Accessor, type Setter } from "solid-js"
import type { FsPath } from "~/os/fs"
import { cn } from "~/os/utils"
import { Button, Separator, Tooltip, Input } from "~/components/core"
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  ChevronRightIcon,
  RefreshCwIcon,
  LayoutGridIcon,
  LayoutListIcon,
  SearchIcon,
} from "lucide-solid"
import type { ViewMode } from "../types"

type ToolbarProps = {
  pathSegments: Accessor<{ name: string; path: FsPath }[]>
  searchQuery: Accessor<string>
  setSearchQuery: Setter<string>
  viewMode: Accessor<ViewMode>
  setViewMode: Setter<ViewMode>
  currentPath: Accessor<FsPath>
  canGoBack: () => boolean
  canGoForward: () => boolean
  onGoBack: () => void
  onGoForward: () => void
  onGoUp: () => void
  onRefresh: () => void
  onNavigate: (path: FsPath) => void
}

export const Toolbar = (props: ToolbarProps) => {
  return (
    <div class="flex items-center gap-1 border-b border-border px-2 py-1.5">
      <div class="flex items-center gap-0.5">
        <Tooltip content="Go back">
          <Button variant="ghost" size="icon-sm" onClick={props.onGoBack} disabled={!props.canGoBack()}>
            <ArrowLeftIcon class="size-4" />
          </Button>
        </Tooltip>
        <Tooltip content="Go forward">
          <Button variant="ghost" size="icon-sm" onClick={props.onGoForward} disabled={!props.canGoForward()}>
            <ArrowRightIcon class="size-4" />
          </Button>
        </Tooltip>
        <Tooltip content="Go up">
          <Button variant="ghost" size="icon-sm" onClick={props.onGoUp} disabled={props.currentPath() === "/"}>
            <ArrowUpIcon class="size-4" />
          </Button>
        </Tooltip>
        <Tooltip content="Refresh">
          <Button variant="ghost" size="icon-sm" onClick={props.onRefresh}>
            <RefreshCwIcon class="size-4" />
          </Button>
        </Tooltip>
      </div>

      <Separator orientation="vertical" class="mx-1 h-6" />

      <div class="flex min-w-0 flex-1 items-center gap-0.5 rounded-md bg-secondary/50 px-2 py-1">
        <For each={props.pathSegments()}>
          {(segment, index) => (
            <>
              <Show when={index() > 0}>
                <ChevronRightIcon class="size-3 shrink-0 text-muted-foreground" />
              </Show>
              <button
                class={cn(
                  "shrink-0 rounded px-1.5 py-0.5 text-xs transition-colors hover:bg-accent",
                  index() === props.pathSegments().length - 1 ? "font-medium text-foreground" : "text-muted-foreground",
                )}
                onClick={() => props.onNavigate(segment.path)}
              >
                {segment.name}
              </button>
            </>
          )}
        </For>
      </div>

      <Separator orientation="vertical" class="mx-1 h-6" />

      <div class="relative w-48">
        <SearchIcon class="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search..."
          class="h-7 pl-7 text-xs"
          value={props.searchQuery()}
          onInput={(e) => props.setSearchQuery(e.currentTarget.value)}
        />
      </div>

      <Separator orientation="vertical" class="mx-1 h-6" />

      <div class="flex items-center gap-0.5">
        <Tooltip content="Grid view">
          <Button
            variant={props.viewMode() === "grid" ? "default" : "ghost"}
            size="icon-sm"
            onClick={() => props.setViewMode("grid")}
          >
            <LayoutGridIcon class="size-4" />
          </Button>
        </Tooltip>
        <Tooltip content="List view">
          <Button
            variant={props.viewMode() === "list" ? "default" : "ghost"}
            size="icon-sm"
            onClick={() => props.setViewMode("list")}
          >
            <LayoutListIcon class="size-4" />
          </Button>
        </Tooltip>
      </div>
    </div>
  )
}

