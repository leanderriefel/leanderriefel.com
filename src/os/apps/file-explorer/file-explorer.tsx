import { createSignal, createResource, createMemo, Show, Signal, Accessor, Resource, onMount } from "solid-js"
import { App, createAppInstance } from "~/os"
import { fuzzyMatch } from "~/os/utils"
import { ContextMenu, ContextMenuTrigger } from "~/components/core"
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
import { isProtectedAppId, getInstalledApps, waitForInstalledApps, refreshInstalledApps } from "~/os/fs/programs"
import {
  resolveAppForPath,
  isSystemAssociation,
  setAssociation,
  getExtension,
  getAppsForExtension,
  appSupportsExtension,
  waitForAssociations,
} from "~/os/fs/file-associations"
import { openApp, openAppById } from "~/os/windows/open-windows"

import type { ViewMode, SortBy, SortOrder, ClipboardItem } from "./types"
import { joinPath, getPathSegments } from "./utils"
import {
  Toolbar,
  Sidebar,
  FileGridView,
  FileListView,
  EntryContextMenu,
  BackgroundContextMenu,
  NewItemDialog,
  RenameDialog,
  DeleteConfirmDialog,
  OpenWithDialog,
  StatusBar,
  EmptyFolder,
} from "./components"

export class FileExplorerApp extends App {
  static appId = "file-explorer"
  static appName = "File Explorer"
  static appIcon = "file-explorer"
  static appDescription = "Browse files, manage folders, and perform basic file operations."
  static appColor = "yellow"
  static appProtected = true
  static supportedFileTypes: readonly string[] = []

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
  private openWithDialogOpen: Signal<boolean>
  private openWithTarget: Signal<FsEntry | null>
  private openWithRemember: Signal<boolean>
  private openWithSelectedApp: Signal<string | null>

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
    this.openWithDialogOpen = createSignal(false)
    this.openWithTarget = createSignal<FsEntry | null>(null)
    this.openWithRemember = createSignal(false)
    this.openWithSelectedApp = createSignal<string | null>(null)

    onMount(() => {
      void waitForAssociations()
      void waitForInstalledApps()
    })

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

  private handleEntryDoubleClick = (entry: FsEntry) => {
    if (entry.type === "dir") {
      this.navigate(entry.path)
      return
    }

    if (entry.type === "file") {
      void this.openFile(entry)
    }
  }

  private openFile = async (entry: FsEntry) => {
    const appId = resolveAppForPath(entry.path)

    if (appId && isSystemAssociation(appId)) {
      if (this.isProgramAppFile(entry)) {
        const appName = fsEntryName(entry.path).replace(/\.app$/i, "")
        await refreshInstalledApps()
        const opened = openAppById(appName, { context: { filePath: entry.path } })
        if (opened) return
      }
      this.showOpenWithDialog(entry)
      return
    }

    if (appId) {
      const AppClass = getInstalledApps().find((app) => app.appId === appId)
      if (AppClass) {
        const app = createAppInstance(AppClass, { filePath: entry.path })
        openApp(app)
        return
      }
    }

    this.showOpenWithDialog(entry)
  }

  private showOpenWithDialog = (entry: FsEntry) => {
    this.openWithTarget[1](entry)
    this.openWithRemember[1](false)
    this.openWithSelectedApp[1](null)
    this.openWithDialogOpen[1](true)
  }

  private handleOpenWith = async () => {
    const target = this.openWithTarget[0]()
    const appId = this.openWithSelectedApp[0]()
    const remember = this.openWithRemember[0]()

    this.openWithDialogOpen[1](false)

    if (!target || !appId || target.type !== "file") return

    const ext = getExtension(target.path)
    const AppClass = getInstalledApps().find((app) => app.appId === appId)

    if (!AppClass || (ext && !appSupportsExtension(AppClass, ext))) {
      this.openWithTarget[1](null)
      this.openWithSelectedApp[1](null)
      return
    }

    if (remember && ext) {
      await setAssociation(ext, appId)
    }

    const app = createAppInstance(AppClass, { filePath: target.path })
    openApp(app)

    this.openWithTarget[1](null)
    this.openWithSelectedApp[1](null)
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

  private getOpenWithApps = (entry: FsEntry | null) => {
    if (!entry || entry.type !== "file") return []
    const ext = getExtension(entry.path)
    if (!ext) return []
    return getAppsForExtension(ext).filter((app) => !app.appProtected)
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
    <EntryContextMenu
      entry={entry}
      onOpen={() => this.handleEntryDoubleClick(entry)}
      onOpenWith={() => this.showOpenWithDialog(entry)}
      onCopy={() => this.handleCopy(entry)}
      onCut={() => this.handleCut(entry)}
      onRename={() => this.openRenameDialog(entry)}
      onDelete={() => this.handleDelete(entry)}
    />
  )

  render = () => {
    return (
      <div class="flex h-full flex-col bg-background">
        <NewItemDialog
          open={this.newFolderDialogOpen[0]}
          onOpenChange={this.newFolderDialogOpen[1]}
          title="Create New Folder"
          placeholder="Folder name"
          itemName={this.newItemName[0]}
          setItemName={this.newItemName[1]}
          onSubmit={() => void this.handleCreateFolder()}
        />

        <NewItemDialog
          open={this.newFileDialogOpen[0]}
          onOpenChange={this.newFileDialogOpen[1]}
          title="Create New File"
          placeholder="File name"
          itemName={this.newItemName[0]}
          setItemName={this.newItemName[1]}
          onSubmit={() => void this.handleCreateFile()}
        />

        <DeleteConfirmDialog
          open={this.deleteConfirmOpen[0]}
          onOpenChange={(open) => {
            this.deleteConfirmOpen[1](open)
            if (!open) this.deleteTarget[1](null)
          }}
          target={this.deleteTarget[0]}
          message={this.deleteMessage[0]}
          onConfirm={() => void this.confirmDelete()}
          onClose={this.closeDeleteDialog}
        />

        <RenameDialog
          open={this.renameDialogOpen[0]}
          onOpenChange={this.renameDialogOpen[1]}
          itemName={this.newItemName[0]}
          setItemName={this.newItemName[1]}
          onSubmit={() => void this.handleRename()}
        />

        <OpenWithDialog
          open={this.openWithDialogOpen[0]}
          onOpenChange={(open) => {
            this.openWithDialogOpen[1](open)
            if (!open) {
              this.openWithTarget[1](null)
              this.openWithSelectedApp[1](null)
            }
          }}
          target={this.openWithTarget[0]}
          availableApps={this.getOpenWithApps(this.openWithTarget[0]())}
          selectedApp={this.openWithSelectedApp[0]}
          setSelectedApp={this.openWithSelectedApp[1]}
          remember={this.openWithRemember[0]}
          setRemember={this.openWithRemember[1]}
          onSubmit={() => void this.handleOpenWith()}
          onCancel={() => {
            this.openWithDialogOpen[1](false)
            this.openWithTarget[1](null)
            this.openWithSelectedApp[1](null)
          }}
        />

        <Toolbar
          pathSegments={this.pathSegments}
          searchQuery={this.searchQuery[0]}
          setSearchQuery={this.searchQuery[1]}
          viewMode={this.viewMode[0]}
          setViewMode={this.viewMode[1]}
          currentPath={this.path[0]}
          canGoBack={this.canGoBack}
          canGoForward={this.canGoForward}
          onGoBack={this.goBack}
          onGoForward={this.goForward}
          onGoUp={this.goUp}
          onRefresh={this.refetchEntries}
          onNavigate={this.navigate}
        />

        <div class="flex min-h-0 flex-1">
          <Show when={!this.sidebarCollapsed[0]()}>
            <Sidebar currentPath={this.path[0]} onNavigate={this.navigate} />
          </Show>

          <div class="flex min-h-0 flex-1 flex-col">
            <Show when={this.viewMode[0]() === "list"}>
              <FileListView
                entries={this.entries}
                selectedEntry={this.selectedEntry[0]}
                sortBy={this.sortBy[0]}
                sortOrder={this.sortOrder[0]}
                onSelect={this.selectedEntry[1]}
                onDoubleClick={this.handleEntryDoubleClick}
                onToggleSort={this.toggleSort}
                renderContextMenu={this.renderEntryContextMenu}
              />
            </Show>

            <Show when={this.viewMode[0]() === "grid"}>
              <ContextMenu>
                <ContextMenuTrigger class="flex-1 overflow-auto p-2">
                  <Show when={this.entries().length > 0} fallback={<EmptyFolder />}>
                    <FileGridView
                      entries={this.entries}
                      selectedEntry={this.selectedEntry[0]}
                      onSelect={this.selectedEntry[1]}
                      onDoubleClick={this.handleEntryDoubleClick}
                      renderContextMenu={this.renderEntryContextMenu}
                    />
                  </Show>
                </ContextMenuTrigger>
                <BackgroundContextMenu
                  hasClipboard={this.clipboard[0]() !== null}
                  onNewFolder={() => {
                    this.newItemName[1]("")
                    this.newFolderDialogOpen[1](true)
                  }}
                  onNewFile={() => {
                    this.newItemName[1]("")
                    this.newFileDialogOpen[1](true)
                  }}
                  onPaste={this.refetchEntries}
                  onRefresh={this.refetchEntries}
                />
              </ContextMenu>
            </Show>

            <StatusBar itemCount={() => this.entries().length} selectedEntry={this.selectedEntry[0]} />
          </div>
        </div>
      </div>
    )
  }
}
