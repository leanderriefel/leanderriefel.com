import { DropdownMenu, DropdownMenuContent, DropdownMenuSeparator, DropdownMenuTrigger } from "~/components/core"
import { OsLogo } from "./os-logo"

export const StartMenu = () => {
  return (
    <DropdownMenu side="top" align="start" sideOffset={10}>
      <DropdownMenuTrigger
        aria-label="Open OS menu"
        class="soft-chip group flex h-10 w-10 items-center justify-center rounded-xl transition-all focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none"
      >
        <div class="flex h-7 w-7 items-center justify-center rounded-lg border border-primary/25 bg-background/40 text-primary shadow-inner ring-1 ring-primary/10">
          <OsLogo />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent variant="glass" class="soft-panel w-64 rounded-2xl p-3">
        <div class="soft-chip flex items-center gap-3 rounded-lg px-3 py-2">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg border border-primary/20 bg-background/60 text-primary shadow-inner ring-1 ring-primary/10">
            <OsLogo />
          </div>
          <div class="flex flex-col leading-tight">
            <span class="text-[10px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">System</span>
            <span class="text-sm font-semibold text-foreground">Start menu</span>
          </div>
        </div>
        <DropdownMenuSeparator class="my-2" />
        <div class="soft-chip rounded-lg border border-dashed border-border/60 px-3 py-4 text-xs text-muted-foreground">
          Placeholder start menu content.
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
