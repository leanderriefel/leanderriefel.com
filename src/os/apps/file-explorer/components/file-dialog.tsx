import { createEffect, createMemo, createSignal, For, Show, type Accessor, type Setter } from "solid-js"
import {
  type FsPath,
  type FsEntry,
  type FileEntry,
  stat,
  createFsListResource,
  parentPath as fsParentPath,
  entryName as fsEntryName,
} from "~/os/fs"
import { cn, fuzzyMatch } from "~/os/utils"
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  Input,
  Separator,
  Tooltip,
} from "~/components/core"
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  ChevronRightIcon,
  RefreshCwIcon,
  LayoutGridIcon,
  LayoutListIcon,
  SearchIcon,
  FolderIcon,
  AlertTriangleIcon,
} from "lucide-solid"
import type { FileDialogOptions, FileDialogResult, SortBy, SortOrder, ViewMode } from "../types"
import { formatDate, formatFileSize, getFileIcon, getPathSegments, joinPath } from "../utils"
import { QUICK_ACCESS } from "../constants"

type FileDialogProps = {
  open: Accessor<boolean>
  onOpenChange: Setter<boolean>
  options: FileDialogOptions
  onResult: (result: FileDialogResult) => void
}

export const FileDialog = (props: FileDialogProps) => {
  const [currentPath, setCurrentPath] = createSignal<FsPath>("/")
  const [history, setHistory] = createSignal<FsPath[]>(["/"])
  const [historyIndex, setHistoryIndex] = createSignal(0)
  const [viewMode, setViewMode] = createSignal<ViewMode>("grid")
  const [sortBy, setSortBy] = createSignal<SortBy>("name")
  const [sortOrder, setSortOrder] = createSignal<SortOrder>("asc")
  const [searchQuery, setSearchQuery] = createSignal("")
  const [selectedPaths, setSelectedPaths] = createSignal<FsPath[]>([])
  const [fileName, setFileName] = createSignal("")
  const [showOverwriteConfirm, setShowOverwriteConfirm] = createSignal(false)
  const [overwriteTarget, setOverwriteTarget] = createSignal<FsPath | null>(null)

  const isSaveMode = () => props.options.mode === "save"
  const isMultiSelect = () => props.options.multiSelect ?? false
  const selectionType = () => props.options.selectionType ?? "file"
  const allowedExtensions = () => props.options.allowedExtensions

  createEffect(() => {
    if (props.open()) {
      const startPath = props.options.initialPath ?? "/"
      setCurrentPath(startPath)
      setHistory([startPath])
    }
  })

  createEffect(() => {
    if (props.open()) {
      setFileName(props.options.defaultFileName ?? "")
    }
  })

  const shouldFetch = () => props.open() && currentPath()
  const [rawEntries, { refetch }] = createFsListResource(() => (shouldFetch() ? currentPath() : ("/" as FsPath)), {
    initialValue: [],
  })
  const isLoadingEntries = () => props.open() && rawEntries.loading

  const entries = createMemo(() => {
    let items = rawEntries() ?? []
    const query = searchQuery().trim()
    const extFilter = allowedExtensions()
    const selType = selectionType()
    const sortKey = sortBy()
    const order = sortOrder()

    if (query) {
      items = items.filter((e) => fuzzyMatch(query, fsEntryName(e.path)))
    }

    if (selType === "file") {
      items = items.filter((e) => {
        if (e.type === "dir") return true
        if (extFilter && extFilter.length > 0) {
          const ext = getExtension(e.path)
          return ext ? extFilter.includes(ext) : false
        }
        return true
      })
    } else if (selType === "folder") {
      items = items.filter((e) => e.type === "dir")
    }

    const sorted = [...items].sort((a, b) => {
      if (a.type === "dir" && b.type !== "dir") return -1
      if (a.type !== "dir" && b.type === "dir") return 1

      let comparison = 0
      switch (sortKey) {
        case "name":
          comparison = fsEntryName(a.path).localeCompare(fsEntryName(b.path))
          break
        case "size": {
          const sizeA = a.type === "file" ? (a as FileEntry).size : 0
          const sizeB = b.type === "file" ? (b as FileEntry).size : 0
          comparison = sizeA - sizeB
          break
        }
        case "modified": {
          const modA = a.type === "file" ? (a as FileEntry).modified : a.created
          const modB = b.type === "file" ? (b as FileEntry).modified : b.created
          comparison = modA - modB
          break
        }
        case "type":
          comparison = a.type.localeCompare(b.type)
          break
      }

      return order === "asc" ? comparison : -comparison
    })

    return sorted
  })

  const pathSegments = createMemo(() => getPathSegments(currentPath()))

  const navigate = (newPath: FsPath) => {
    const currentHistory = history()
    const currentIndex = historyIndex()
    const newHistory = [...currentHistory.slice(0, currentIndex + 1), newPath]
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
    setCurrentPath(newPath)
    setSelectedPaths([])
  }

  const canGoBack = () => historyIndex() > 0
  const canGoForward = () => historyIndex() < history().length - 1

  const goBack = () => {
    if (canGoBack()) {
      const newIndex = historyIndex() - 1
      setHistoryIndex(newIndex)
      setCurrentPath(history()[newIndex])
      setSelectedPaths([])
    }
  }

  const goForward = () => {
    if (canGoForward()) {
      const newIndex = historyIndex() + 1
      setHistoryIndex(newIndex)
      setCurrentPath(history()[newIndex])
      setSelectedPaths([])
    }
  }

  const goUp = () => {
    const parent = fsParentPath(currentPath())
    if (parent !== currentPath()) {
      navigate(parent)
    }
  }

  const handleSelect = (entry: FsEntry, e: MouseEvent) => {
    const canSelectEntry = () => {
      const selType = selectionType()
      if (selType === "both") return true
      if (selType === "file" && entry.type === "file") return true
      if (selType === "folder" && entry.type === "dir") return true
      return false
    }

    if (!canSelectEntry() && entry.type !== "dir") return

    if (isMultiSelect() && (e.ctrlKey || e.metaKey)) {
      setSelectedPaths((prev) => {
        if (prev.includes(entry.path)) {
          return prev.filter((p) => p !== entry.path)
        }
        return [...prev, entry.path]
      })
    } else if (isMultiSelect() && e.shiftKey && selectedPaths().length > 0) {
      const allEntries = entries()
      const lastSelected = selectedPaths()[selectedPaths().length - 1]
      const lastIndex = allEntries.findIndex((e) => e.path === lastSelected)
      const currentIndex = allEntries.findIndex((e) => e.path === entry.path)
      const start = Math.min(lastIndex, currentIndex)
      const end = Math.max(lastIndex, currentIndex)
      const range = allEntries.slice(start, end + 1).map((e) => e.path)
      setSelectedPaths(range)
    } else {
      setSelectedPaths([entry.path])
      if (isSaveMode() && entry.type === "file") {
        setFileName(fsEntryName(entry.path))
      }
    }
  }

  const handleDoubleClick = (entry: FsEntry) => {
    if (entry.type === "dir") {
      navigate(entry.path)
      return
    }

    const selType = selectionType()
    if (selType === "file" || selType === "both") {
      if (isSaveMode()) {
        setFileName(fsEntryName(entry.path))
      } else {
        props.onResult({ cancelled: false, paths: [entry.path] })
        props.onOpenChange(false)
      }
    }
  }

  const toggleSort = (newSortBy: SortBy) => {
    if (sortBy() === newSortBy) {
      setSortOrder(sortOrder() === "asc" ? "desc" : "asc")
    } else {
      setSortBy(newSortBy)
      setSortOrder("asc")
    }
  }

  const sortIndicator = (column: SortBy) => {
    if (sortBy() !== column) return ""
    return sortOrder() === "asc" ? "↑" : "↓"
  }

  const handleConfirm = async () => {
    if (isSaveMode()) {
      const name = fileName().trim()
      if (!name) return

      const targetPath = joinPath(currentPath(), name) as FsPath
      const existing = await stat(targetPath)

      if (existing) {
        setOverwriteTarget(targetPath)
        setShowOverwriteConfirm(true)
        return
      }

      props.onResult({ cancelled: false, paths: [targetPath] })
      props.onOpenChange(false)
    } else {
      if (selectedPaths().length === 0) return
      props.onResult({ cancelled: false, paths: selectedPaths() })
      props.onOpenChange(false)
    }
  }

  const confirmOverwrite = () => {
    const target = overwriteTarget()
    if (target) {
      props.onResult({ cancelled: false, paths: [target] })
      props.onOpenChange(false)
    }
    setShowOverwriteConfirm(false)
    setOverwriteTarget(null)
  }

  const handleCancel = () => {
    props.onResult({ cancelled: true })
    props.onOpenChange(false)
  }

  const getDialogTitle = () => {
    if (props.options.title) return props.options.title
    return isSaveMode() ? "Save File" : "Open File"
  }

  const getConfirmText = () => {
    return isSaveMode() ? "Save" : "Open"
  }

  const canConfirm = () => {
    if (isSaveMode()) {
      return fileName().trim().length > 0
    }
    return selectedPaths().length > 0
  }

  return (
    <>
      <Dialog open={props.open()} onOpenChange={props.onOpenChange}>
        <DialogContent size="lg" class="flex h-[500px] max-h-[80vh] w-[50vw] min-w-[500px] flex-col">
          <DialogHeader>
            <DialogTitle>{getDialogTitle()}</DialogTitle>
          </DialogHeader>
          <DialogBody class="flex min-h-0 flex-1 flex-col gap-0 p-0">
            {/* Toolbar */}
            <div class="flex items-center gap-1 border-b border-border px-2 py-1.5">
              <div class="flex items-center gap-0.5">
                <Tooltip content="Go back">
                  <Button variant="ghost" size="icon-sm" onClick={goBack} disabled={!canGoBack()}>
                    <ArrowLeftIcon class="size-4" />
                  </Button>
                </Tooltip>
                <Tooltip content="Go forward">
                  <Button variant="ghost" size="icon-sm" onClick={goForward} disabled={!canGoForward()}>
                    <ArrowRightIcon class="size-4" />
                  </Button>
                </Tooltip>
                <Tooltip content="Go up">
                  <Button variant="ghost" size="icon-sm" onClick={goUp} disabled={currentPath() === "/"}>
                    <ArrowUpIcon class="size-4" />
                  </Button>
                </Tooltip>
                <Tooltip content="Refresh">
                  <Button variant="ghost" size="icon-sm" onClick={() => void refetch()}>
                    <RefreshCwIcon class="size-4" />
                  </Button>
                </Tooltip>
              </div>

              <Separator orientation="vertical" class="mx-1 h-6" />

              <div class="flex min-w-0 flex-1 items-center gap-0.5 rounded-md bg-secondary/50 px-2 py-1">
                <For each={pathSegments()}>
                  {(segment, index) => (
                    <>
                      <Show when={index() > 0}>
                        <ChevronRightIcon class="size-3 shrink-0 text-muted-foreground" />
                      </Show>
                      <button
                        class={cn(
                          "shrink-0 rounded px-1.5 py-0.5 text-xs transition-colors hover:bg-accent",
                          index() === pathSegments().length - 1
                            ? "font-medium text-foreground"
                            : "text-muted-foreground",
                        )}
                        onClick={() => navigate(segment.path)}
                      >
                        {segment.name}
                      </button>
                    </>
                  )}
                </For>
              </div>

              <Separator orientation="vertical" class="mx-1 h-6" />

              <div class="relative w-36">
                <SearchIcon class="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search..."
                  class="h-7 pl-7 text-xs"
                  value={searchQuery()}
                  onInput={(e) => setSearchQuery(e.currentTarget.value)}
                />
              </div>

              <Separator orientation="vertical" class="mx-1 h-6" />

              <div class="flex items-center gap-0.5">
                <Tooltip content="Grid view">
                  <Button
                    variant={viewMode() === "grid" ? "default" : "ghost"}
                    size="icon-sm"
                    onClick={() => setViewMode("grid")}
                  >
                    <LayoutGridIcon class="size-4" />
                  </Button>
                </Tooltip>
                <Tooltip content="List view">
                  <Button
                    variant={viewMode() === "list" ? "default" : "ghost"}
                    size="icon-sm"
                    onClick={() => setViewMode("list")}
                  >
                    <LayoutListIcon class="size-4" />
                  </Button>
                </Tooltip>
              </div>
            </div>

            {/* Main content */}
            <div class="flex min-h-0 flex-1">
              {/* Sidebar */}
              <div class="flex w-40 shrink-0 flex-col border-r border-border">
                <div class="p-2">
                  <p class="mb-1.5 px-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Quick Access
                  </p>
                  <div class="space-y-0.5">
                    <For each={QUICK_ACCESS}>
                      {(item) => (
                        <button
                          class={cn(
                            "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-accent",
                            currentPath() === item.path && "bg-accent text-accent-foreground",
                          )}
                          onClick={() => navigate(item.path)}
                        >
                          <item.icon class="size-4 text-muted-foreground" />
                          <span>{item.name}</span>
                        </button>
                      )}
                    </For>
                  </div>
                </div>
              </div>

              {/* File list */}
              <div class="relative flex min-h-0 flex-1 flex-col">
                <Show when={isLoadingEntries()}>
                  <div class="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-sm">
                    <div class="flex items-center gap-2 text-sm text-muted-foreground">
                      <RefreshCwIcon class="size-4 animate-spin" />
                      <span>Loading...</span>
                    </div>
                  </div>
                </Show>
                <Show when={viewMode() === "list"}>
                  <div class="flex items-center gap-2 border-b border-border bg-secondary/30 px-3 py-1.5 text-[11px] font-medium text-muted-foreground">
                    <button class="flex-1 text-left hover:text-foreground" onClick={() => toggleSort("name")}>
                      Name {sortIndicator("name")}
                    </button>
                    <button class="w-24 text-right hover:text-foreground" onClick={() => toggleSort("modified")}>
                      Modified {sortIndicator("modified")}
                    </button>
                    <button class="w-20 text-right hover:text-foreground" onClick={() => toggleSort("type")}>
                      Type {sortIndicator("type")}
                    </button>
                    <button class="w-16 text-right hover:text-foreground" onClick={() => toggleSort("size")}>
                      Size {sortIndicator("size")}
                    </button>
                  </div>
                  <div class="flex-1 space-y-0.5 overflow-auto p-2">
                    <For each={entries()}>
                      {(entry) => (
                        <button
                          class={cn(
                            "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent",
                            selectedPaths().includes(entry.path) && "bg-accent",
                          )}
                          onClick={(e) => handleSelect(entry, e)}
                          onDblClick={() => handleDoubleClick(entry)}
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
                      )}
                    </For>
                  </div>
                </Show>

                <Show when={viewMode() === "grid"}>
                  <div class="flex-1 overflow-auto p-2">
                    <Show
                      when={entries().length > 0}
                      fallback={
                        <div class="flex h-full items-center justify-center text-sm text-muted-foreground">
                          No items to display
                        </div>
                      }
                    >
                      <div class="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] place-items-center gap-2">
                        <For each={entries()}>
                          {(entry) => (
                            <button
                              class={cn(
                                "group flex size-[80px] flex-col items-center gap-1 rounded-lg p-2 text-ellipsis transition-colors hover:bg-accent",
                                selectedPaths().includes(entry.path) && "bg-accent",
                              )}
                              onClick={(e) => handleSelect(entry, e)}
                              onDblClick={() => handleDoubleClick(entry)}
                            >
                              <div class="flex size-10 items-center justify-center">
                                <Show
                                  when={entry.type === "dir"}
                                  fallback={
                                    <div class="flex size-8 items-center justify-center rounded-lg bg-secondary">
                                      {getFileIcon(entry)}
                                    </div>
                                  }
                                >
                                  <FolderIcon class="size-8 text-warning" />
                                </Show>
                              </div>
                              <span class="w-full truncate text-center text-[11px]">{fsEntryName(entry.path)}</span>
                            </button>
                          )}
                        </For>
                      </div>
                    </Show>
                  </div>
                </Show>
              </div>
            </div>

            {/* Save mode filename input */}
            <Show when={isSaveMode()}>
              <div class="flex items-center gap-2 border-t border-border px-3 py-2">
                <span class="text-sm text-muted-foreground">File name:</span>
                <Input
                  type="text"
                  class="h-8 flex-1 text-sm"
                  value={fileName()}
                  onInput={(e) => setFileName(e.currentTarget.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleConfirm()
                  }}
                  placeholder="Enter file name..."
                />
              </div>
            </Show>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={handleCancel}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => void handleConfirm()} disabled={!canConfirm()}>
              {getConfirmText()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Overwrite confirmation dialog */}
      <Dialog open={showOverwriteConfirm()} onOpenChange={setShowOverwriteConfirm}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle class="flex items-center gap-2">
              <AlertTriangleIcon class="size-5 text-warning" />
              Confirm Overwrite
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p class="text-sm text-muted-foreground">
              A file named <span class="font-medium text-foreground">{fileName()}</span> already exists in this
              location. Do you want to replace it?
            </p>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setShowOverwriteConfirm(false)
                setOverwriteTarget(null)
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmOverwrite}>
              Replace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

const getExtension = (path: FsPath): string | null => {
  const name = fsEntryName(path)
  const lastDot = name.lastIndexOf(".")
  if (lastDot === -1 || lastDot === 0) return null
  return name.slice(lastDot)
}
