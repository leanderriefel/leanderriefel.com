import { FolderOpenIcon } from "lucide-solid"

export const EmptyFolder = () => {
  return (
    <div class="flex h-full flex-col items-center justify-center text-muted-foreground">
      <FolderOpenIcon class="mb-2 size-12 opacity-50" />
      <p class="text-sm">This folder is empty</p>
      <p class="mt-1 text-xs">Right-click to create a new file or folder</p>
    </div>
  )
}

