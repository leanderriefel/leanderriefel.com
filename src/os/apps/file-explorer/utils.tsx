import type { JSX } from "solid-js"
import type { FsPath, FsEntry, FileEntry } from "~/os/fs"
import { entryName as fsEntryName } from "~/os/fs"
import {
  FolderIcon,
  FileIcon,
  FileTextIcon,
  ImageIcon,
  Music2Icon,
  VideoIcon,
  FileCodeIcon,
  FileArchiveIcon,
  FileJsonIcon,
} from "lucide-solid"
import { cn } from "~/os/utils"

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export const getFileIcon = (entry: FsEntry, clazz: string = ""): JSX.Element => {
  if (entry.type === "dir") {
    return <FolderIcon class={cn("size-5 text-warning", clazz)} />
  }

  if (entry.type === "link") {
    return <FolderIcon class={cn("size-5 text-primary", clazz)} />
  }

  const fileEntry = entry as FileEntry
  const mime = fileEntry.mimeType ?? ""
  const name = fsEntryName(entry.path).toLowerCase()

  if (mime.startsWith("image/")) return <ImageIcon class={cn("size-5 text-primary", clazz)} />
  if (mime.startsWith("audio/")) return <Music2Icon class={cn("size-5 text-success", clazz)} />
  if (mime.startsWith("video/")) return <VideoIcon class={cn("size-5 text-destructive", clazz)} />
  if (mime.includes("zip") || mime.includes("gzip") || mime.includes("tar"))
    return <FileArchiveIcon class={cn("size-5 text-warning", clazz)} />
  if (mime.includes("json")) return <FileJsonIcon class={cn("size-5 text-warning", clazz)} />
  if (
    name.endsWith(".tsx") ||
    name.endsWith(".ts") ||
    name.endsWith(".js") ||
    name.endsWith(".jsx") ||
    name.endsWith(".py") ||
    name.endsWith(".css")
  )
    return <FileCodeIcon class={cn("size-5 text-primary", clazz)} />
  if (mime.startsWith("text/") || name.endsWith(".md") || name.endsWith(".txt"))
    return <FileTextIcon class={cn("size-5 text-muted-foreground", clazz)} />

  return <FileIcon class={cn("size-5 text-muted-foreground", clazz)} />
}

export const joinPath = (base: FsPath, name: string): FsPath => {
  if (base === "/") return `/${name}` as FsPath
  return `${base}/${name}` as FsPath
}

export const getPathSegments = (path: FsPath): { name: string; path: FsPath }[] => {
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
