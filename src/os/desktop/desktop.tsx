import {
  createEffect,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
  createMemo,
  untrack,
  type Signal,
  type JSX,
} from "solid-js"
import {
  type FsPath,
  type FsEntry,
  createFsListResource,
  mkdir,
  writeFile,
  remove,
  rename,
  copy as fsCopy,
  move as fsMove,
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
import { createRegistrySignal } from "~/os/registry"
import { createKeybindings, KeyBindings, type KeyBindingConfig } from "~/os/utils"
import { openApp, openAppById } from "~/os/windows/open-windows"
import { createAppInstance } from "~/os"
import { ContextMenu, ContextMenuTrigger } from "~/components/core"
import { FileIcon } from "../apps/file-explorer/components/file-icon"
import {
  EntryContextMenu,
  BackgroundContextMenu,
  NewItemDialog,
  RenameDialog,
  DeleteConfirmDialog,
  OpenWithDialog,
  useMarqueeSelection,
  elementIntersectsRect,
  type MarqueeRect,
} from "../apps/file-explorer/components"
import type { ClipboardItem } from "../apps/file-explorer/types"
import { joinPath } from "../apps/file-explorer/utils"
import { cn } from "~/os/utils"

const DESKTOP_PATHS_KEY = "desktop_paths_v1"
const DESKTOP_PATH: FsPath = "/Desktop"

export const Desktop = () => {
  // eslint-disable-next-line no-undef
  let ref!: HTMLDivElement
  let resizeObserver!: ResizeObserver

  // Grid size calculation
  const [size, setSize] = createSignal<{ rows: number; columns: number } | null>(null)

  // File system state
  const [desktopFiles, { refetch }] = createFsListResource(() => DESKTOP_PATH, { initialValue: [] })
  const refetchEntries = () => void refetch()

  // Position tracking for desktop icons
  const [paths, setPaths] = createRegistrySignal<{ fileId: string; index: number }[]>(DESKTOP_PATHS_KEY, [])

  // Selection state
  const [selectedEntries, setSelectedEntries] = createSignal<Set<FsPath>>(new Set())
  const [lastSelectedEntry, setLastSelectedEntry] = createSignal<FsPath | null>(null)

  // Clipboard state
  const [clipboard, setClipboard] = createSignal<ClipboardItem | null>(null)

  // Dialog states
  const [newFolderDialogOpen, setNewFolderDialogOpen] = createSignal(false)
  const [newFileDialogOpen, setNewFileDialogOpen] = createSignal(false)
  const [renameDialogOpen, setRenameDialogOpen] = createSignal(false)
  const [newItemName, setNewItemName] = createSignal("")
  const [renameTarget, setRenameTarget] = createSignal<FsEntry | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = createSignal(false)
  const [deleteTarget, setDeleteTarget] = createSignal<FsEntry | null>(null)
  const [deleteMessage, setDeleteMessage] = createSignal("")
  const [openWithDialogOpen, setOpenWithDialogOpen] = createSignal(false)
  const [openWithTarget, setOpenWithTarget] = createSignal<FsEntry | null>(null)
  const [openWithRemember, setOpenWithRemember] = createSignal(false)
  const [openWithSelectedApp, setOpenWithSelectedApp] = createSignal<string | null>(null)

  // Container ref for marquee selection
  const containerRef: Signal<HTMLElement | undefined> = createSignal<HTMLElement | undefined>(undefined)

  // Keybindings cleanup
  let cleanupKeybindings: (() => void) | null = null

  // Computed files list with position data
  const files = createMemo(() => desktopFiles().filter((f) => paths().some((p) => p.fileId === f.stableId)))

  // Sorted entries for selection operations
  const entries = createMemo(() => {
    const filesData = desktopFiles()
    return [...filesData].sort((a, b) => fsEntryName(a.path).localeCompare(fsEntryName(b.path)))
  })

  // Sync paths with file system
  createEffect(() => {
    if (!desktopFiles()) return

    const pathsSnapshot = untrack(() => paths())

    const oldFileIdSet = new Set(pathsSnapshot.map((p) => p.fileId))
    const fileIdSet = new Set(desktopFiles().map((f) => f.stableId))

    const addedFileIds = fileIdSet.difference(oldFileIdSet)
    const removedFileIds = oldFileIdSet.difference(fileIdSet)

    const getSmallestEmptyIndex = () => {
      for (let i = 0; i < pathsSnapshot.length; i++) {
        if (!pathsSnapshot.some((p) => p.index === i)) return i
      }
      return pathsSnapshot.length
    }

    const newPaths = pathsSnapshot.filter((p) => !removedFileIds.has(p.fileId))
    for (const fileId of addedFileIds) newPaths.push({ fileId, index: getSmallestEmptyIndex() })
    setPaths(newPaths)
  })

  // Grid size calculation
  const calculateSize = () => {
    if (!ref.clientWidth || !ref.clientHeight) return
    setSize({
      rows: Math.floor(ref.clientHeight / 90),
      columns: Math.floor(ref.clientWidth / 90),
    })
  }

  // Selection helpers
  const clearSelection = () => {
    setSelectedEntries(new Set<FsPath>())
    setLastSelectedEntry(null)
  }

  const isSelected = (path: FsPath) => selectedEntries().has(path)

  const handleSelect = (entry: FsEntry, event: MouseEvent) => {
    const allEntries = entries()
    const path = entry.path

    if (event.ctrlKey || event.metaKey) {
      // Toggle selection
      const newSelection = new Set<FsPath>(selectedEntries())
      if (newSelection.has(path)) {
        newSelection.delete(path)
      } else {
        newSelection.add(path)
      }
      setSelectedEntries(newSelection)
      setLastSelectedEntry(path)
    } else if (event.shiftKey && lastSelectedEntry()) {
      // Range selection
      const lastPath = lastSelectedEntry()!
      const lastIndex = allEntries.findIndex((e) => e.path === lastPath)
      const currentIndex = allEntries.findIndex((e) => e.path === path)

      if (lastIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastIndex, currentIndex)
        const end = Math.max(lastIndex, currentIndex)
        const newSelection = new Set<FsPath>()
        for (let i = start; i <= end; i++) {
          newSelection.add(allEntries[i].path)
        }
        setSelectedEntries(newSelection)
      }
    } else {
      // Single selection
      setSelectedEntries(new Set<FsPath>([path]))
      setLastSelectedEntry(path)
    }
  }

  const getSelectedEntries = (): FsEntry[] => {
    const selectedPaths = selectedEntries()
    return entries().filter((e) => selectedPaths.has(e.path))
  }

  // File opening
  const isProgramAppFile = (entry: FsEntry) =>
    entry.type === "file" &&
    entry.path.startsWith("/Programs/") &&
    fsEntryName(entry.path).toLowerCase().endsWith(".app")

  const isProtectedProgramApp = (entry: FsEntry) => {
    if (!isProgramAppFile(entry)) return false
    const name = fsEntryName(entry.path).toLowerCase()
    const appId = name.replace(/\.app$/, "")
    return isProtectedAppId(appId)
  }

  const showOpenWithDialog = (entry: FsEntry) => {
    setOpenWithTarget(entry)
    setOpenWithRemember(false)
    setOpenWithSelectedApp(null)
    setOpenWithDialogOpen(true)
  }

  const openFile = async (entry: FsEntry) => {
    const appId = resolveAppForPath(entry.path)

    if (appId && isSystemAssociation(appId)) {
      if (isProgramAppFile(entry)) {
        const appName = fsEntryName(entry.path).replace(/\.app$/i, "")
        await refreshInstalledApps()
        const opened = openAppById(appName, { context: { filePath: entry.path } })
        if (opened) return
      }
      showOpenWithDialog(entry)
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

    showOpenWithDialog(entry)
  }

  const handleEntryDoubleClick = (entry: FsEntry) => {
    if (entry.type === "dir") {
      // Open file explorer at this directory
      openAppById("file-explorer", { context: { filePath: entry.path } })
      return
    }

    if (entry.type === "file") {
      void openFile(entry)
    }
  }

  const handleOpenWith = async () => {
    const target = openWithTarget()
    const appId = openWithSelectedApp()
    const remember = openWithRemember()

    setOpenWithDialogOpen(false)

    if (!target || !appId || target.type !== "file") return

    const ext = getExtension(target.path)
    const AppClass = getInstalledApps().find((app) => app.appId === appId)

    if (!AppClass || (ext && !appSupportsExtension(AppClass, ext))) {
      setOpenWithTarget(null)
      setOpenWithSelectedApp(null)
      return
    }

    if (remember && ext) {
      await setAssociation(ext, appId)
    }

    const app = createAppInstance(AppClass, { filePath: target.path })
    openApp(app)

    setOpenWithTarget(null)
    setOpenWithSelectedApp(null)
  }

  const getOpenWithApps = (entry: FsEntry | null) => {
    if (!entry || entry.type !== "file") return []
    const ext = getExtension(entry.path)
    if (!ext) return []
    return getAppsForExtension(ext).filter((app) => !app.appProtected)
  }

  // File operations
  const handleCreateFolder = async () => {
    const name = newItemName().trim()
    if (!name) return

    try {
      const newPath = joinPath(DESKTOP_PATH, name)
      await mkdir(newPath, { parents: true })
      setNewFolderDialogOpen(false)
      setNewItemName("")
    } catch (err) {
      console.error("Failed to create folder:", err)
    }
  }

  const handleCreateFile = async () => {
    const name = newItemName().trim()
    if (!name) return

    try {
      const newPath = joinPath(DESKTOP_PATH, name)
      await writeFile(newPath, "", { parents: true })
      setNewFileDialogOpen(false)
      setNewItemName("")
    } catch (err) {
      console.error("Failed to create file:", err)
    }
  }

  const handleRename = async () => {
    const target = renameTarget()
    const name = newItemName().trim()
    if (!target || !name) return

    try {
      await rename(target.path, name)
      setRenameDialogOpen(false)
      setNewItemName("")
      setRenameTarget(null)
    } catch (err) {
      console.error("Failed to rename:", err)
    }
  }

  const openRenameDialog = (entry: FsEntry) => {
    setRenameTarget(entry)
    setNewItemName(fsEntryName(entry.path))
    setRenameDialogOpen(true)
  }

  const performDelete = async (entriesToDelete: FsEntry[]) => {
    try {
      for (const entry of entriesToDelete) {
        await remove(entry.path, { recursive: true })
      }
      clearSelection()
    } catch (err) {
      console.error("Failed to delete:", err)
    }
  }

  const handleDelete = (entry: FsEntry) => {
    if (isProgramAppFile(entry)) {
      if (isProtectedProgramApp(entry)) {
        setDeleteTarget(null)
        setDeleteMessage("This app is protected and cannot be uninstalled.")
        setDeleteConfirmOpen(true)
        return
      }

      setDeleteTarget(entry)
      setDeleteMessage(`Uninstall ${fsEntryName(entry.path)}? This removes the app until you reinstall its .app file.`)
      setDeleteConfirmOpen(true)
      return
    }

    void performDelete([entry])
  }

  const handleBulkDelete = () => {
    const selected = getSelectedEntries()
    if (selected.length === 0) return

    const protectedApp = selected.find((e) => isProtectedProgramApp(e))
    if (protectedApp) {
      setDeleteTarget(null)
      setDeleteMessage("Selection contains protected apps that cannot be deleted.")
      setDeleteConfirmOpen(true)
      return
    }

    const programApps = selected.filter((e) => isProgramAppFile(e))
    if (programApps.length > 0) {
      setDeleteTarget(programApps[0])
      setDeleteMessage(
        `Uninstall ${selected.length} item(s)? This includes ${programApps.length} app(s) that will be removed until reinstalled.`,
      )
      setDeleteConfirmOpen(true)
      return
    }

    void performDelete(selected)
  }

  const confirmDelete = async () => {
    const target = deleteTarget()
    setDeleteConfirmOpen(false)
    if (!target) return

    const selected = getSelectedEntries()
    if (selected.length > 1) {
      await performDelete(selected)
    } else {
      await performDelete([target])
    }
    setDeleteTarget(null)
  }

  const closeDeleteDialog = () => {
    setDeleteConfirmOpen(false)
    setDeleteTarget(null)
  }

  // Clipboard operations
  const handleCopy = (entry: FsEntry) => {
    const selected = selectedEntries()
    if (selected.has(entry.path) && selected.size > 1) {
      setClipboard({ paths: [...selected], operation: "copy" })
    } else {
      setClipboard({ paths: [entry.path], operation: "copy" })
    }
  }

  const handleCut = (entry: FsEntry) => {
    const selected = selectedEntries()
    if (selected.has(entry.path) && selected.size > 1) {
      setClipboard({ paths: [...selected], operation: "cut" })
    } else {
      setClipboard({ paths: [entry.path], operation: "cut" })
    }
  }

  const handleCopySelected = () => {
    const selected = selectedEntries()
    if (selected.size === 0) return
    setClipboard({ paths: [...selected], operation: "copy" })
  }

  const handleCutSelected = () => {
    const selected = selectedEntries()
    if (selected.size === 0) return
    setClipboard({ paths: [...selected], operation: "cut" })
  }

  const handlePaste = async () => {
    const clipboardItem = clipboard()
    if (!clipboardItem) return

    try {
      for (const sourcePath of clipboardItem.paths) {
        const name = fsEntryName(sourcePath)
        const destPath = joinPath(DESKTOP_PATH, name)

        if (clipboardItem.operation === "copy") {
          await fsCopy(sourcePath, destPath)
        } else {
          await fsMove(sourcePath, destPath)
        }
      }

      if (clipboardItem.operation === "cut") {
        setClipboard(null)
      }

      refetchEntries()
    } catch (err) {
      console.error("Failed to paste:", err)
    }
  }

  // Keyboard handlers
  const handleDeleteSelected = () => {
    const selected = getSelectedEntries()
    if (selected.length === 0) return

    if (selected.length === 1) {
      handleDelete(selected[0])
    } else {
      handleBulkDelete()
    }
  }

  const handleSelectAll = () => {
    const allPaths = new Set<FsPath>(entries().map((e) => e.path))
    setSelectedEntries(allPaths)
  }

  const handleRenameSelected = () => {
    const selected = getSelectedEntries()
    if (selected.length !== 1) return
    openRenameDialog(selected[0])
  }

  const handleOpenSelected = () => {
    const selected = getSelectedEntries()
    if (selected.length !== 1) return
    handleEntryDoubleClick(selected[0])
  }

  const setupKeybindings = () => {
    const bindings: KeyBindingConfig[] = [
      KeyBindings.copy(handleCopySelected),
      KeyBindings.cut(handleCutSelected),
      KeyBindings.paste(() => void handlePaste()),
      KeyBindings.delete(handleDeleteSelected),
      KeyBindings.selectAll(handleSelectAll),
      KeyBindings.escape(clearSelection),
      KeyBindings.rename(handleRenameSelected),
      KeyBindings.enter(handleOpenSelected),
      KeyBindings.refresh(refetchEntries),
      KeyBindings.newFolder(() => {
        setNewItemName("")
        setNewFolderDialogOpen(true)
      }),
    ]

    cleanupKeybindings = createKeybindings(bindings)
  }

  // Marquee selection
  const handleMarqueeSelection = (rect: MarqueeRect) => {
    const container = containerRef[0]()
    if (!container) return

    const containerRect = container.getBoundingClientRect()
    const scrollTop = container.scrollTop
    const scrollLeft = container.scrollLeft

    const fileElements = container.querySelectorAll("[data-file-entry]")
    const selectedPaths = new Set<FsPath>()

    fileElements.forEach((el) => {
      const path = el.getAttribute("data-file-path") as FsPath | null
      if (path && elementIntersectsRect(el as HTMLElement, rect, containerRect, scrollTop, scrollLeft)) {
        selectedPaths.add(path)
      }
    })

    setSelectedEntries(selectedPaths)
  }

  const handleMarqueeEnd = (rect: MarqueeRect) => {
    handleMarqueeSelection(rect)
  }

  // Setup marquee selection hook
  let containerEl: HTMLDivElement | undefined

  const marquee = useMarqueeSelection(() => containerEl, {
    onSelectionChange: handleMarqueeSelection,
    onSelectionEnd: handleMarqueeEnd,
    onClear: clearSelection,
  })

  // Context menu render
  const renderEntryContextMenu = (entry: FsEntry): JSX.Element => {
    const selectedCount = selectedEntries().size
    const isInSelection = selectedEntries().has(entry.path)

    return (
      <EntryContextMenu
        entry={entry}
        selectedCount={isInSelection ? selectedCount : 1}
        onOpen={() => handleEntryDoubleClick(entry)}
        onOpenWith={() => showOpenWithDialog(entry)}
        onCopy={() => handleCopy(entry)}
        onCut={() => handleCut(entry)}
        onRename={() => openRenameDialog(entry)}
        onDelete={() => {
          if (isInSelection && selectedCount > 1) {
            handleBulkDelete()
          } else {
            handleDelete(entry)
          }
        }}
      />
    )
  }

  // Lifecycle
  onMount(() => {
    void waitForAssociations()
    void waitForInstalledApps()

    resizeObserver = new ResizeObserver(calculateSize)
    resizeObserver.observe(ref)
    calculateSize()

    setupKeybindings()
  })

  onCleanup(() => {
    resizeObserver.disconnect()
    cleanupKeybindings?.()
  })

  return (
    <>
      {/* Dialogs */}
      <NewItemDialog
        open={() => newFolderDialogOpen()}
        onOpenChange={setNewFolderDialogOpen}
        title="Create New Folder"
        placeholder="Folder name"
        itemName={() => newItemName()}
        setItemName={setNewItemName}
        onSubmit={() => void handleCreateFolder()}
      />

      <NewItemDialog
        open={() => newFileDialogOpen()}
        onOpenChange={setNewFileDialogOpen}
        title="Create New File"
        placeholder="File name"
        itemName={() => newItemName()}
        setItemName={setNewItemName}
        onSubmit={() => void handleCreateFile()}
      />

      <RenameDialog
        open={() => renameDialogOpen()}
        onOpenChange={setRenameDialogOpen}
        itemName={() => newItemName()}
        setItemName={setNewItemName}
        onSubmit={() => void handleRename()}
      />

      <DeleteConfirmDialog
        open={() => deleteConfirmOpen()}
        onOpenChange={(open) => {
          setDeleteConfirmOpen(open)
          if (!open) setDeleteTarget(null)
        }}
        target={() => deleteTarget()}
        message={() => deleteMessage()}
        onConfirm={() => void confirmDelete()}
        onClose={closeDeleteDialog}
      />

      <OpenWithDialog
        open={() => openWithDialogOpen()}
        onOpenChange={(open) => {
          setOpenWithDialogOpen(open)
          if (!open) {
            setOpenWithTarget(null)
            setOpenWithSelectedApp(null)
          }
        }}
        target={() => openWithTarget()}
        availableApps={getOpenWithApps(openWithTarget())}
        selectedApp={() => openWithSelectedApp()}
        setSelectedApp={setOpenWithSelectedApp}
        remember={() => openWithRemember()}
        setRemember={setOpenWithRemember}
        onSubmit={() => void handleOpenWith()}
        onCancel={() => {
          setOpenWithDialogOpen(false)
          setOpenWithTarget(null)
          setOpenWithSelectedApp(null)
        }}
      />

      {/* Desktop Grid with Context Menu */}
      <ContextMenu>
        <ContextMenuTrigger
          class="absolute inset-0 z-1 m-1 overflow-hidden"
          ref={(el: HTMLElement) => {
            ref = el as HTMLDivElement
            containerEl = el as HTMLDivElement
            containerRef[1](el)
          }}
        >
          <div
            class="relative grid h-full w-full content-start gap-1"
            style={{
              "grid-template-rows": `repeat(${size()?.rows}, 90px)`,
              "grid-template-columns": `repeat(${size()?.columns}, 90px)`,
              "grid-auto-flow": "column",
            }}
            tabIndex={0}
          >
            <Show when={size()}>
              {(gridSize) => (
                <For each={files()}>
                  {(file) => {
                    const pathInfo = () => paths().find((p) => p.fileId === file.stableId)
                    const index = () => pathInfo()?.index ?? 0
                    const column = () => Math.floor(index() / gridSize().rows) + 1
                    const row = () => (index() % gridSize().rows) + 1

                    return (
                      <ContextMenu>
                        <ContextMenuTrigger>
                          <button
                            data-file-entry
                            data-file-path={file.path}
                            class={cn(
                              "group flex size-[90px] flex-col items-center gap-1 overflow-hidden rounded-lg p-2 transition-colors hover:bg-accent/50",
                              isSelected(file.path) && "bg-accent",
                            )}
                            style={{
                              "grid-column": column(),
                              "grid-row": row(),
                            }}
                            onClick={(e) => handleSelect(file, e)}
                            onDblClick={() => handleEntryDoubleClick(file)}
                          >
                            <FileIcon entry={file} />
                          </button>
                        </ContextMenuTrigger>
                        {renderEntryContextMenu(file)}
                      </ContextMenu>
                    )
                  }}
                </For>
              )}
            </Show>

            {/* Marquee selection overlay */}
            <Show when={marquee.isSelecting() && marquee.hasDragged()}>
              <div
                class="pointer-events-none absolute z-50 border border-primary/50 bg-primary/10"
                style={marquee.selectionStyle()}
              />
            </Show>
          </div>
        </ContextMenuTrigger>

        {/* Background context menu */}
        <BackgroundContextMenu
          hasClipboard={clipboard() !== null}
          onNewFolder={() => {
            setNewItemName("")
            setNewFolderDialogOpen(true)
          }}
          onNewFile={() => {
            setNewItemName("")
            setNewFileDialogOpen(true)
          }}
          onPaste={() => void handlePaste()}
          onRefresh={refetchEntries}
        />
      </ContextMenu>
    </>
  )
}
