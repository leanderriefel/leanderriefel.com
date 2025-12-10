import type { Accessor } from "solid-js"
import type { FsPath } from "~/os/fs"

type FooterProps = {
  currentPath: Accessor<FsPath | null>
  characterCount: Accessor<number>
}

export const Footer = (props: FooterProps) => {
  return (
    <div class="flex items-center justify-between border-t border-border bg-secondary/30 px-3 py-1">
      <span class="text-[11px] text-muted-foreground">{props.currentPath() ?? "No file"}</span>
      <span class="text-[11px] text-muted-foreground">{props.characterCount()} characters</span>
    </div>
  )
}

