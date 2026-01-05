import { For, Show, createMemo, createSignal } from "solid-js"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/core"
import { SettingsIcon } from "lucide-solid"
import { AppClass, createAppInstance } from "~/os"
import { getInstalledApps } from "~/os/fs/programs"
import { openApp } from "~/os/windows/open-windows"
import { SettingsApp } from "~/os/apps/settings"
import { OsLogo } from "./os-logo"
import { cn } from "~/os/utils"
import { AppIcon } from "~/os/apps/app-icons"

export const StartMenuButton = () => {
  const [open, setOpen] = createSignal(false)

  const groupedApps = createMemo(() => {
    const installed = getInstalledApps()
    const sorted = [...installed].sort((a, b) => a.appName.localeCompare(b.appName))

    const groups = sorted.reduce<Map<string, AppClass[]>>((acc, appClass) => {
      const letter = appClass.appName.charAt(0).toUpperCase()
      if (!acc.has(letter)) {
        acc.set(letter, [])
      }
      acc.get(letter)!.push(appClass)
      return acc
    }, new Map())

    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([letter, apps]) => ({ letter, apps }))
  })

  const launchApp = (appClass: AppClass) => {
    openApp(createAppInstance(appClass))
    setOpen(false)
  }

  return (
    <DropdownMenu side="top" align="start" sideOffset={24} open={open()} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        aria-label="Open OS menu"
        class={cn(
          "group flex size-8 items-center justify-center rounded-lg bg-background/50",
          "border border-primary/25 bg-background/40 text-primary shadow-inner ring-1 ring-primary/10",
          "transition-all focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none",
        )}
      >
        <OsLogo />
      </DropdownMenuTrigger>
      <DropdownMenuContent variant="glass" class="soft-panel max-h-[70vh] w-80 rounded-2xl p-3">
        <div class="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/70 px-3 py-2">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-lg border border-primary/20 bg-background/60 text-primary shadow-inner ring-1 ring-primary/10">
              <OsLogo />
            </div>
            <div class="leading-tight">
              <div class="text-sm font-semibold text-foreground">Leander&apos;s OS</div>
            </div>
          </div>
          <button
            type="button"
            aria-label="Open settings"
            class="flex size-9 items-center justify-center rounded-lg border border-border bg-secondary text-muted-foreground transition-colors hover:bg-secondary/80 hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none"
            onClick={() => launchApp(SettingsApp)}
          >
            <SettingsIcon class="size-4" />
          </button>
        </div>

        <DropdownMenuSeparator class="my-3" />

        <Show
          when={groupedApps().length > 0}
          fallback={
            <div class="flex items-center justify-center rounded-lg border border-border/60 bg-background/70 px-3 py-6 text-sm text-muted-foreground">
              No apps installed
            </div>
          }
        >
          <div class="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
            <For each={groupedApps()}>
              {(group) => (
                <div class="space-y-2">
                  <div class="px-1 text-[11px] font-semibold tracking-[0.35em] text-muted-foreground uppercase">
                    {group.letter}
                  </div>
                  <div class="flex flex-col gap-1">
                    <For each={group.apps}>
                      {(appClass) => (
                        <DropdownMenuItem variant="glass" class="group" onSelect={() => launchApp(appClass)}>
                          <div class="flex items-center gap-3">
                            <div class="flex size-7 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors group-hover:text-foreground group-focus-visible:text-foreground">
                              <AppIcon icon={appClass.appIcon} class="size-4" />
                            </div>
                            <div class="flex flex-col leading-tight">
                              <span class="font-medium text-foreground">{appClass.appName}</span>
                            </div>
                          </div>
                        </DropdownMenuItem>
                      )}
                    </For>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
