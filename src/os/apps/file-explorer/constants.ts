import type { FsPath } from "~/os/fs"
import { HomeIcon, FileTextIcon, ImageIcon, Music2Icon, VideoIcon, DownloadIcon, MonitorIcon } from "lucide-solid"
import type { QuickAccessItem } from "./types"

export const QUICK_ACCESS: QuickAccessItem[] = [
  { name: "Home", path: "/" as FsPath, icon: HomeIcon },
  { name: "Documents", path: "/Documents" as FsPath, icon: FileTextIcon },
  { name: "Pictures", path: "/Pictures" as FsPath, icon: ImageIcon },
  { name: "Music", path: "/Music" as FsPath, icon: Music2Icon },
  { name: "Videos", path: "/Videos" as FsPath, icon: VideoIcon },
  { name: "Downloads", path: "/Downloads" as FsPath, icon: DownloadIcon },
  { name: "Desktop", path: "/Desktop" as FsPath, icon: MonitorIcon },
]
