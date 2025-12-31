import type { FsPath } from "~/os/fs"

export type ViewMode = "grid" | "list"
export type SortBy = "name" | "size" | "modified" | "type"
export type SortOrder = "asc" | "desc"

export type ClipboardItem = {
  path: FsPath
  operation: "copy" | "cut"
}

export type QuickAccessItem = {
  name: string
  path: FsPath
  icon: typeof import("lucide-solid").HomeIcon
}

export type FileDialogMode = "open" | "save"

export type FileDialogSelectionType = "file" | "folder" | "both"

export type FileDialogOptions = {
  mode: FileDialogMode
  title?: string
  initialPath?: FsPath
  selectionType?: FileDialogSelectionType
  allowedExtensions?: string[]
  multiSelect?: boolean
  defaultFileName?: string
}

export type FileDialogResult = { cancelled: true } | { cancelled: false; paths: FsPath[] }
