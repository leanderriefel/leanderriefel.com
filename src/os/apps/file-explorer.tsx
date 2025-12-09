import { createSignal, createResource, createMemo, For, Show, Signal, JSX, Accessor, Resource } from "solid-js"
import { App } from "~/os"
import { cn, fuzzyMatch } from "~/os/utils"
import {
  Button,
  Separator,
  Tooltip,
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from "~/components/core"
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  ChevronRightIcon,
  FolderIcon,
  FileIcon,
  FileTextIcon,
  ImageIcon,
  Music2Icon,
  VideoIcon,
  FileCodeIcon,
  FileArchiveIcon,
  RefreshCwIcon,
  LayoutGridIcon,
  LayoutListIcon,
  SearchIcon,
  HomeIcon,
  DownloadIcon,
  FolderOpenIcon,
  Trash2Icon,
  CopyIcon,
  ScissorsIcon,
  ClipboardIcon,
  PencilIcon,
  FileJsonIcon,
  FolderPlusIcon,
  FilePlusIcon,
} from "lucide-solid"
import {
  type FsPath,
  type FsEntry,
  type FileEntry,
  list,
  mkdir,
  writeFile,
  remove,
  rename,
  parentPath as fsParentPath,
  entryName as fsEntryName,
} from "~/os/fs"
import { isProtectedAppId } from "~/os/apps/programs"

const QUICK_ACCESS: { name: string; path: FsPath; icon: typeof HomeIcon }[] = [
  { name: "Home", path: "/", icon: HomeIcon },
  { name: "Desktop", path: "/Desktop", icon: FolderIcon },
  { name: "Documents", path: "/Documents", icon: FileTextIcon },
  { name: "Pictures", path: "/Pictures", icon: ImageIcon },
  { name: "Music", path: "/Music", icon: Music2Icon },
  { name: "Videos", path: "/Videos", icon: VideoIcon },
  { name: "Downloads", path: "/Downloads", icon: DownloadIcon },
]

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

const getFileIcon = (entry: FsEntry): JSX.Element => {
  if (entry.type === "dir") {
    return <FolderIcon class="size-5 text-warning" />
  }

  if (entry.type === "link") {
    return <FolderIcon class="size-5 text-primary" />
  }

  const fileEntry = entry as FileEntry
  const mime = fileEntry.mimeType ?? ""
  const name = fsEntryName(entry.path).toLowerCase()

  if (mime.startsWith("image/")) return <ImageIcon class="size-5 text-primary" />
  if (mime.startsWith("audio/")) return <Music2Icon class="size-5 text-success" />
  if (mime.startsWith("video/")) return <VideoIcon class="size-5 text-destructive" />
  if (mime.includes("zip") || mime.includes("gzip") || mime.includes("tar"))
    return <FileArchiveIcon class="size-5 text-warning" />
  if (mime.includes("json")) return <FileJsonIcon class="size-5 text-warning" />
  if (
    name.endsWith(".tsx") ||
    name.endsWith(".ts") ||
    name.endsWith(".js") ||
    name.endsWith(".jsx") ||
    name.endsWith(".py") ||
    name.endsWith(".css")
  )
    return <FileCodeIcon class="size-5 text-primary" />
  if (mime.startsWith("text/") || name.endsWith(".md") || name.endsWith(".txt"))
    return <FileTextIcon class="size-5 text-muted-foreground" />

  return <FileIcon class="size-5 text-muted-foreground" />
}

const joinPath = (base: FsPath, name: string): FsPath => {
  if (base === "/") return `/${name}` as FsPath
  return `${base}/${name}` as FsPath
}

const getPathSegments = (path: FsPath): { name: string; path: FsPath }[] => {
  if (path === "/") return [{ name: "Root", path: "/" }]

  const parts = path.split("/").filter(Boolean)
  const segments: { name: string; path: FsPath }[] = [{ name: "Root", path: "/" }]

  let current = ""
  for (const part of parts) {
    current += `/${part}`
    segments.push({ name: part, path: current as FsPath })
  }

  return segments
}

type ViewMode = "grid" | "list"
type SortBy = "name" | "size" | "modified" | "type"
type SortOrder = "asc" | "desc"

type ClipboardItem = {
  path: FsPath
  operation: "copy" | "cut"
}

export class FileExplorerApp extends App {
  static appId = "file-explorer"
  static appName = "File Explorer"
  static appIcon = "file-explorer"
  static appDescription = "Browse files, manage folders, and perform basic file operations."
  static appColor = "yellow"
  static appProtected = true

  id = FileExplorerApp.appId
  name = FileExplorerApp.appName
  icon = FileExplorerApp.appIcon
  description = FileExplorerApp.appDescription
  color = FileExplorerApp.appColor

  defaultSize = { width: 900, height: 600 }

  private path: Signal<FsPath>
  private history: Signal<FsPath[]>
  private historyIndex: Signal<number>
  private viewMode: Signal<ViewMode>
  private sortBy: Signal<SortBy>
  private sortOrder: Signal<SortOrder>
  private searchQuery: Signal<string>
  private selectedEntry: Signal<FsPath | null>
  private sidebarCollapsed: Signal<boolean>
  private refreshTrigger: Signal<number>
  private clipboard: Signal<ClipboardItem | null>
  private newFolderDialogOpen: Signal<boolean>
  private newFileDialogOpen: Signal<boolean>
  private renameDialogOpen: Signal<boolean>
  private newItemName: Signal<string>
  private renameTarget: Signal<FsEntry | null>
  private deleteConfirmOpen: Signal<boolean>
  private deleteTarget: Signal<FsEntry | null>
  private deleteMessage: Signal<string>

  private rawEntries: Resource<FsEntry[]>
  private refetchEntries: () => void
  private entries: Accessor<FsEntry[]>
  private pathSegments: Accessor<{ name: string; path: FsPath }[]>

  constructor() {
    super()

    this.path = createSignal<FsPath>("/")
    this.history = createSignal<FsPath[]>(["/"])
    this.historyIndex = createSignal(0)
    this.viewMode = createSignal<ViewMode>("grid")
    this.sortBy = createSignal<SortBy>("name")
    this.sortOrder = createSignal<SortOrder>("asc")
    this.searchQuery = createSignal("")
    this.selectedEntry = createSignal<FsPath | null>(null)
    this.sidebarCollapsed = createSignal(false)
    this.refreshTrigger = createSignal(0)
    this.clipboard = createSignal<ClipboardItem | null>(null)
    this.newFolderDialogOpen = createSignal(false)
    this.newFileDialogOpen = createSignal(false)
    this.renameDialogOpen = createSignal(false)
    this.newItemName = createSignal("")
    this.renameTarget = createSignal<FsEntry | null>(null)
    this.deleteConfirmOpen = createSignal(false)
    this.deleteTarget = createSignal<FsEntry | null>(null)
    this.deleteMessage = createSignal("")

    const [rawEntries, { refetch }] = createResource(
      () => ({ path: this.path[0](), trigger: this.refreshTrigger[0]() }),
      async ({ path: p }) => {
        try {
          return await list(p)
        } catch {
          return []
        }
      },
    )
    // eslint-disable-next-line solid/reactivity
    this.rawEntries = rawEntries
    this.refetchEntries = () => void refetch()

    this.entries = createMemo(() => {
      let items = this.rawEntries() ?? []
      const query = this.searchQuery[0]().trim()

      if (query) {
        items = items.filter((e) => fuzzyMatch(query, fsEntryName(e.path)))
      }

      const sorted = [...items].sort((a, b) => {
        if (a.type === "dir" && b.type !== "dir") return -1
        if (a.type !== "dir" && b.type === "dir") return 1

        let comparison = 0
        switch (this.sortBy[0]()) {
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

        return this.sortOrder[0]() === "asc" ? comparison : -comparison
      })

      return sorted
    })

    this.pathSegments = createMemo(() => getPathSegments(this.path[0]()))
  }

  private refresh = () => this.refreshTrigger[1]((t) => t + 1)

  private navigate = (newPath: FsPath) => {
    const currentHistory = this.history[0]()
    const currentIndex = this.historyIndex[0]()
    const newHistory = [...currentHistory.slice(0, currentIndex + 1), newPath]
    this.history[1](newHistory)
    this.historyIndex[1](newHistory.length - 1)
    this.path[1](newPath)
    this.selectedEntry[1](null)
  }

  private canGoBack = () => this.historyIndex[0]() > 0
  private canGoForward = () => this.historyIndex[0]() < this.history[0]().length - 1

  private goBack = () => {
    if (this.canGoBack()) {
      const newIndex = this.historyIndex[0]() - 1
      this.historyIndex[1](newIndex)
      this.path[1](this.history[0]()[newIndex])
      this.selectedEntry[1](null)
    }
  }

  private goForward = () => {
    if (this.canGoForward()) {
      const newIndex = this.historyIndex[0]() + 1
      this.historyIndex[1](newIndex)
      this.path[1](this.history[0]()[newIndex])
      this.selectedEntry[1](null)
    }
  }

  private goUp = () => {
    const parent = fsParentPath(this.path[0]())
    if (parent !== this.path[0]()) {
      this.navigate(parent)
    }
  }

  private handleEntryClick = (entry: FsEntry) => {
    if (entry.type === "dir") {
      this.navigate(entry.path)
    } else {
      this.selectedEntry[1](entry.path)
    }
  }

  private handleEntryDoubleClick = (entry: FsEntry) => {
    if (entry.type === "dir") {
      this.navigate(entry.path)
    }
  }

  private toggleSort = (newSortBy: SortBy) => {
    if (this.sortBy[0]() === newSortBy) {
      this.sortOrder[1](this.sortOrder[0]() === "asc" ? "desc" : "asc")
    } else {
      this.sortBy[1](newSortBy)
      this.sortOrder[1]("asc")
    }
  }

  private handleCreateFolder = async () => {
    const name = this.newItemName[0]().trim()
    if (!name) return

    try {
      const newPath = joinPath(this.path[0](), name)
      await mkdir(newPath, { parents: true })
      this.newFolderDialogOpen[1](false)
      this.newItemName[1]("")
      this.refresh()
    } catch (err) {
      console.error("Failed to create folder:", err)
    }
  }

  private handleCreateFile = async () => {
    const name = this.newItemName[0]().trim()
    if (!name) return

    try {
      const newPath = joinPath(this.path[0](), name)
      await writeFile(newPath, "", { parents: true })
      this.newFileDialogOpen[1](false)
      this.newItemName[1]("")
      this.refresh()
    } catch (err) {
      console.error("Failed to create file:", err)
    }
  }

  private handleRename = async () => {
    const target = this.renameTarget[0]()
    const name = this.newItemName[0]().trim()
    if (!target || !name) return

    try {
      await rename(target.path, name)
      this.renameDialogOpen[1](false)
      this.newItemName[1]("")
      this.renameTarget[1](null)
      this.refresh()
    } catch (err) {
      console.error("Failed to rename:", err)
    }
  }

  private isProgramAppFile = (entry: FsEntry) =>
    entry.type === "file" &&
    entry.path.startsWith("/Programs/") &&
    fsEntryName(entry.path).toLowerCase().endsWith(".app")

  private isProtectedProgramApp = (entry: FsEntry) => {
    if (!this.isProgramAppFile(entry)) return false
    const name = fsEntryName(entry.path).toLowerCase()
    const appId = name.replace(/\.app$/, "")
    return isProtectedAppId(appId)
  }

  private performDelete = async (entry: FsEntry) => {
    try {
      await remove(entry.path, { recursive: true })
      this.selectedEntry[1](null)
      this.refresh()
    } catch (err) {
      console.error("Failed to delete:", err)
    }
  }

  private handleDelete = (entry: FsEntry) => {
    if (this.isProgramAppFile(entry)) {
      if (this.isProtectedProgramApp(entry)) {
        this.deleteTarget[1](null)
        this.deleteMessage[1]("This app is protected and cannot be uninstalled.")
        this.deleteConfirmOpen[1](true)
        return
      }

      this.deleteTarget[1](entry)
      this.deleteMessage[1](
        `Uninstall ${fsEntryName(entry.path)}? This removes the app until you reinstall its .app file.`,
      )
      this.deleteConfirmOpen[1](true)
      return
    }

    void this.performDelete(entry)
  }

  private confirmDelete = async () => {
    const target = this.deleteTarget[0]()
    this.deleteConfirmOpen[1](false)
    if (!target) return
    await this.performDelete(target)
    this.deleteTarget[1](null)
  }

  private closeDeleteDialog = () => {
    this.deleteConfirmOpen[1](false)
    this.deleteTarget[1](null)
  }

  private handleCopy = (entry: FsEntry) => {
    this.clipboard[1]({ path: entry.path, operation: "copy" })
  }

  private handleCut = (entry: FsEntry) => {
    this.clipboard[1]({ path: entry.path, operation: "cut" })
  }

  private openRenameDialog = (entry: FsEntry) => {
    this.renameTarget[1](entry)
    this.newItemName[1](fsEntryName(entry.path))
    this.renameDialogOpen[1](true)
  }

  private renderEntryContextMenu = (entry: FsEntry) => (
    <ContextMenuContent>
      <ContextMenuItem onSelect={() => this.handleEntryClick(entry)}>
        <FolderOpenIcon class="mr-2 size-4" />
        Open
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onSelect={() => this.handleCopy(entry)}>
        <CopyIcon class="mr-2 size-4" />
        Copy
      </ContextMenuItem>
      <ContextMenuItem onSelect={() => this.handleCut(entry)}>
        <ScissorsIcon class="mr-2 size-4" />
        Cut
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onSelect={() => this.openRenameDialog(entry)}>
        <PencilIcon class="mr-2 size-4" />
        Rename
      </ContextMenuItem>
      <ContextMenuItem variant="destructive" onSelect={() => this.handleDelete(entry)}>
        <Trash2Icon class="mr-2 size-4" />
        Delete
      </ContextMenuItem>
    </ContextMenuContent>
  )

  private renderBackgroundContextMenu = () => (
    <ContextMenuContent>
      <ContextMenuItem
        onSelect={() => {
          this.newItemName[1]("")
          this.newFolderDialogOpen[1](true)
        }}
      >
        <FolderPlusIcon class="mr-2 size-4" />
        New Folder
      </ContextMenuItem>
      <ContextMenuItem
        onSelect={() => {
          this.newItemName[1]("")
          this.newFileDialogOpen[1](true)
        }}
      >
        <FilePlusIcon class="mr-2 size-4" />
        New File
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onSelect={() => void this.refetchEntries()} disabled={this.clipboard[0]() === null}>
        <ClipboardIcon class="mr-2 size-4" />
        Paste
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onSelect={() => void this.refetchEntries()}>
        <RefreshCwIcon class="mr-2 size-4" />
        Refresh
      </ContextMenuItem>
    </ContextMenuContent>
  )

  render = () => {
    return (
      <div class="flex h-full flex-col bg-background">
        {/* New Folder Dialog */}
        <Dialog open={this.newFolderDialogOpen[0]()} onOpenChange={this.newFolderDialogOpen[1]}>
          <DialogContent size="sm">
            <DialogHeader>
              <DialogTitle>Create New Folder</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <Input
                placeholder="Folder name"
                value={this.newItemName[0]()}
                onInput={(e) => this.newItemName[1](e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void this.handleCreateFolder()
                }}
              />
            </DialogBody>
            <DialogFooter>
              <Button variant="ghost" onClick={() => this.newFolderDialogOpen[1](false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => void this.handleCreateFolder()}>
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* New File Dialog */}
        <Dialog open={this.newFileDialogOpen[0]()} onOpenChange={this.newFileDialogOpen[1]}>
          <DialogContent size="sm">
            <DialogHeader>
              <DialogTitle>Create New File</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <Input
                placeholder="File name"
                value={this.newItemName[0]()}
                onInput={(e) => this.newItemName[1](e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void this.handleCreateFile()
                }}
              />
            </DialogBody>
            <DialogFooter>
              <Button variant="ghost" onClick={() => this.newFileDialogOpen[1](false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => void this.handleCreateFile()}>
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <Dialog
          open={this.deleteConfirmOpen[0]()}
          onOpenChange={(open) => {
            this.deleteConfirmOpen[1](open)
            if (!open) this.deleteTarget[1](null)
          }}
        >
          <DialogContent size="sm">
            <DialogHeader>
              <DialogTitle>{this.deleteTarget[0]() ? "Uninstall app" : "Cannot uninstall app"}</DialogTitle>
            </DialogHeader>
            <DialogBody>{this.deleteMessage[0]()}</DialogBody>
            <DialogFooter>
              <Show
                when={this.deleteTarget[0]()}
                fallback={
                  <Button variant="primary" onClick={this.closeDeleteDialog}>
                    Close
                  </Button>
                }
              >
                <Button variant="ghost" onClick={this.closeDeleteDialog}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={() => void this.confirmDelete()}>
                  Uninstall
                </Button>
              </Show>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Rename Dialog */}
        <Dialog open={this.renameDialogOpen[0]()} onOpenChange={this.renameDialogOpen[1]}>
          <DialogContent size="sm">
            <DialogHeader>
              <DialogTitle>Rename</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <Input
                placeholder="New name"
                value={this.newItemName[0]()}
                onInput={(e) => this.newItemName[1](e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void this.handleRename()
                }}
              />
            </DialogBody>
            <DialogFooter>
              <Button variant="ghost" onClick={() => this.renameDialogOpen[1](false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => void this.handleRename()}>
                Rename
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Toolbar */}
        <div class="flex items-center gap-1 border-b border-border px-2 py-1.5">
          <div class="flex items-center gap-0.5">
            <Tooltip content="Go back">
              <Button variant="ghost" size="icon-sm" onClick={this.goBack} disabled={!this.canGoBack()}>
                <ArrowLeftIcon class="size-4" />
              </Button>
            </Tooltip>
            <Tooltip content="Go forward">
              <Button variant="ghost" size="icon-sm" onClick={this.goForward} disabled={!this.canGoForward()}>
                <ArrowRightIcon class="size-4" />
              </Button>
            </Tooltip>
            <Tooltip content="Go up">
              <Button variant="ghost" size="icon-sm" onClick={this.goUp} disabled={this.path[0]() === "/"}>
                <ArrowUpIcon class="size-4" />
              </Button>
            </Tooltip>
            <Tooltip content="Refresh">
              <Button variant="ghost" size="icon-sm" onClick={() => void this.refetchEntries()}>
                <RefreshCwIcon class="size-4" />
              </Button>
            </Tooltip>
          </div>

          <Separator orientation="vertical" class="mx-1 h-6" />

          {/* Breadcrumb */}
          <div class="flex min-w-0 flex-1 items-center gap-0.5 rounded-md bg-secondary/50 px-2 py-1">
            <For each={this.pathSegments()}>
              {(segment, index) => (
                <>
                  <Show when={index() > 0}>
                    <ChevronRightIcon class="size-3 shrink-0 text-muted-foreground" />
                  </Show>
                  <button
                    class={cn(
                      "shrink-0 rounded px-1.5 py-0.5 text-xs transition-colors hover:bg-accent",
                      index() === this.pathSegments().length - 1
                        ? "font-medium text-foreground"
                        : "text-muted-foreground",
                    )}
                    onClick={() => this.navigate(segment.path)}
                  >
                    {segment.name}
                  </button>
                </>
              )}
            </For>
          </div>

          <Separator orientation="vertical" class="mx-1 h-6" />

          {/* Search */}
          <div class="relative w-48">
            <SearchIcon class="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search..."
              class="h-7 pl-7 text-xs"
              value={this.searchQuery[0]()}
              onInput={(e) => this.searchQuery[1](e.currentTarget.value)}
            />
          </div>

          <Separator orientation="vertical" class="mx-1 h-6" />

          {/* View mode toggle */}
          <div class="flex items-center gap-0.5">
            <Tooltip content="Grid view">
              <Button
                variant={this.viewMode[0]() === "grid" ? "default" : "ghost"}
                size="icon-sm"
                onClick={() => this.viewMode[1]("grid")}
              >
                <LayoutGridIcon class="size-4" />
              </Button>
            </Tooltip>
            <Tooltip content="List view">
              <Button
                variant={this.viewMode[0]() === "list" ? "default" : "ghost"}
                size="icon-sm"
                onClick={() => this.viewMode[1]("list")}
              >
                <LayoutListIcon class="size-4" />
              </Button>
            </Tooltip>
          </div>
        </div>

        {/* Main content */}
        <div class="flex min-h-0 flex-1">
          {/* Sidebar */}
          <Show when={!this.sidebarCollapsed[0]()}>
            <div class="flex w-48 shrink-0 flex-col border-r border-border">
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
                          this.path[0]() === item.path && "bg-accent text-accent-foreground",
                        )}
                        onClick={() => this.navigate(item.path)}
                      >
                        <item.icon class="size-4 text-muted-foreground" />
                        <span>{item.name}</span>
                      </button>
                    )}
                  </For>
                </div>
              </div>
            </div>
          </Show>

          {/* File list */}
          <div class="flex min-h-0 flex-1 flex-col">
            {/* List header for list view */}
            <Show when={this.viewMode[0]() === "list"}>
              <div class="flex items-center gap-2 border-b border-border bg-secondary/30 px-3 py-1.5 text-[11px] font-medium text-muted-foreground">
                <button class="flex-1 text-left hover:text-foreground" onClick={() => this.toggleSort("name")}>
                  Name {this.sortBy[0]() === "name" && (this.sortOrder[0]() === "asc" ? "↑" : "↓")}
                </button>
                <button class="w-24 text-right hover:text-foreground" onClick={() => this.toggleSort("modified")}>
                  Modified {this.sortBy[0]() === "modified" && (this.sortOrder[0]() === "asc" ? "↑" : "↓")}
                </button>
                <button class="w-20 text-right hover:text-foreground" onClick={() => this.toggleSort("type")}>
                  Type {this.sortBy[0]() === "type" && (this.sortOrder[0]() === "asc" ? "↑" : "↓")}
                </button>
                <button class="w-16 text-right hover:text-foreground" onClick={() => this.toggleSort("size")}>
                  Size {this.sortBy[0]() === "size" && (this.sortOrder[0]() === "asc" ? "↑" : "↓")}
                </button>
              </div>
            </Show>

            {/* Content area */}
            <ContextMenu>
              <ContextMenuTrigger class="flex-1 overflow-auto p-2">
                <Show
                  when={this.entries().length > 0}
                  fallback={
                    <div class="flex h-full flex-col items-center justify-center text-muted-foreground">
                      <FolderOpenIcon class="mb-2 size-12 opacity-50" />
                      <p class="text-sm">This folder is empty</p>
                      <p class="mt-1 text-xs">Right-click to create a new file or folder</p>
                    </div>
                  }
                >
                  <Show
                    when={this.viewMode[0]() === "grid"}
                    fallback={
                      /* List view */
                      <div class="space-y-0.5">
                        <For each={this.entries()}>
                          {(entry) => (
                            <ContextMenu>
                              <ContextMenuTrigger>
                                <button
                                  class={cn(
                                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent",
                                    this.selectedEntry[0]() === entry.path && "bg-accent",
                                  )}
                                  onClick={() => this.selectedEntry[1](entry.path)}
                                  onDblClick={() => this.handleEntryDoubleClick(entry)}
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
                              {this.renderEntryContextMenu(entry)}
                            </ContextMenu>
                          )}
                        </For>
                      </div>
                    }
                  >
                    {/* Grid view */}
                    <div class="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] place-items-center gap-2">
                      <For each={this.entries()}>
                        {(entry) => (
                          <ContextMenu>
                            <ContextMenuTrigger>
                              <button
                                class={cn(
                                  "group flex size-[90px] flex-col items-center gap-1.5 rounded-lg p-2 text-ellipsis transition-colors hover:bg-accent",
                                  this.selectedEntry[0]() === entry.path && "bg-accent",
                                )}
                                onClick={() => this.selectedEntry[1](entry.path)}
                                onDblClick={() => this.handleEntryClick(entry)}
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
                            {this.renderEntryContextMenu(entry)}
                          </ContextMenu>
                        )}
                      </For>
                    </div>
                  </Show>
                </Show>
              </ContextMenuTrigger>
              {this.renderBackgroundContextMenu()}
            </ContextMenu>

            {/* Status bar */}
            <div class="flex items-center justify-between border-t border-border bg-secondary/30 px-3 py-1">
              <span class="text-[11px] text-muted-foreground">{this.entries().length} items</span>
              <Show when={this.selectedEntry[0]()}>
                <span class="text-[11px] text-muted-foreground">Selected: {fsEntryName(this.selectedEntry[0]()!)}</span>
              </Show>
            </div>
          </div>
        </div>
      </div>
    )
  }
}
