import { For, Show, createMemo, JSX } from "solid-js"
import { AppClass, createAppInstance, OsWindow } from "~/os"
import { closeApp, openApp, openApps, bringToFront } from "~/os/windows/open-windows"
import { focusStack } from "~/os/focus"
import { XIcon, MinusIcon } from "lucide-solid"
import { Tooltip, TooltipGroup } from "~/components/core"
import { Badge } from "~/components/core"

interface TaskbarButtonProps {
  appClass: AppClass
}

const PREVIEW_HEIGHT = 140

// Window Preview Tooltip Content
const WindowPreviewContent = (props: {
  windows: OsWindow[]
  onWindowClick: (window: OsWindow) => void
  onCloseWindow: (e: MouseEvent, windowId: string) => void
}) => {
  return (
    <div class="flex gap-2">
      <For each={props.windows}>
        {(osWindow) => {
          const getEffectiveSize = () => {
            if (osWindow.display === "maximized") {
              return { width: window.innerWidth, height: window.innerHeight }
            }
            return osWindow.size
          }

          const scale = () => PREVIEW_HEIGHT / getEffectiveSize().height
          const previewWidth = () => getEffectiveSize().width * scale()

          return (
            <div
              class="group/preview flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-border bg-popover/90 p-2 backdrop-blur-md transition-colors hover:bg-accent"
              onClick={(e) => {
                e.stopPropagation()
                props.onWindowClick(osWindow)
              }}
            >
              <div class="flex w-full items-center justify-between pl-1">
                <div class="flex items-center gap-1.5">
                  <div class="text-xs font-medium text-foreground">
                    {typeof osWindow.app.name === "string" ? osWindow.app.name : osWindow.app.name[0]()}
                  </div>
                  <Show when={osWindow.display === "minimized"}>
                    <Badge variant="warning" size="sm" class="gap-0.5">
                      <MinusIcon class="size-2" />
                      <span>Min</span>
                    </Badge>
                  </Show>
                </div>
                <button
                  class="flex size-6 cursor-pointer items-center justify-center rounded-sm bg-secondary text-muted-foreground transition-colors hover:bg-destructive hover:text-destructive-foreground"
                  onClick={(e) => props.onCloseWindow(e, osWindow.id)}
                  title="Close window"
                >
                  <XIcon class="size-2.5" />
                </button>
              </div>
              <div
                class="relative overflow-hidden rounded-md border border-border bg-background"
                style={{
                  height: `${PREVIEW_HEIGHT}px`,
                  width: `${previewWidth()}px`,
                }}
              >
                <div
                  class="pointer-events-none absolute inset-0 origin-top-left"
                  style={{
                    width: `${getEffectiveSize().width}px`,
                    height: `${getEffectiveSize().height}px`,
                    transform: `scale(${scale()})`,
                  }}
                >
                  {osWindow.app.render()}
                </div>
              </div>
            </div>
          )
        }}
      </For>
    </div>
  )
}

export const TaskbarButton = (props: TaskbarButtonProps) => {
  const handleOpenApp = () => {
    const appWindows = openApps.apps.filter((w) => w.app instanceof props.appClass)

    if (appWindows.length === 0) {
      openApp(createAppInstance(props.appClass))
      return
    }

    let targetWindow = appWindows[appWindows.length - 1]
    let maxIndex = -1

    for (const win of appWindows) {
      const index = focusStack.stack.indexOf(win.id)
      if (index > maxIndex) {
        maxIndex = index
        targetWindow = win
      }
    }

    bringToFront(targetWindow.id)
  }

  const handleMiddleClick = (e: MouseEvent) => {
    if (e.button === 1) {
      openApp(createAppInstance(props.appClass))
    }
  }

  const handleWindowClick = (osWindow: OsWindow) => {
    bringToFront(osWindow.id)
  }

  const handleCloseWindow = (e: MouseEvent, windowId: string) => {
    e.stopPropagation()
    closeApp(windowId)
  }

  const windowCount = () => openApps.apps.filter((w) => w.app instanceof props.appClass).length
  const hasOpenWindows = () => windowCount() > 0

  const sortedWindows = createMemo(() =>
    openApps.apps.filter((w) => w.app instanceof props.appClass).sort((a, b) => a.position.x - b.position.x),
  )

  const tooltipContent = (): JSX.Element => {
    if (hasOpenWindows()) {
      return (
        <WindowPreviewContent
          windows={sortedWindows()}
          onWindowClick={handleWindowClick}
          onCloseWindow={handleCloseWindow}
        />
      )
    }
    return (
      <span class="text-[9px] font-semibold tracking-wider whitespace-nowrap">
        {props.appClass.appName.toUpperCase()}
      </span>
    )
  }

  return (
    <div class="group relative flex items-center justify-center">
      <Tooltip
        content={tooltipContent()}
        side="top"
        align="center"
        delayDuration={300}
        skipDelayDuration={100}
        contentClass={hasOpenWindows() ? "!p-0 !bg-transparent !border-0 !shadow-none !backdrop-blur-0" : ""}
      >
        <button
          onClick={handleOpenApp}
          onAuxClick={handleMiddleClick}
          class="relative flex aspect-square size-7 cursor-pointer items-center justify-center transition-all duration-300 hover:-translate-y-0.5"
        >
          {/* Icon Representation */}
          <div class="flex size-full items-center justify-center rounded-lg border border-border bg-secondary shadow-sm transition-all duration-300 group-hover:bg-secondary/80 group-hover:shadow-sm group-active:scale-95">
            <span class="font-mono text-xs font-bold text-muted-foreground transition-colors group-hover:text-foreground">
              {props.appClass.appName[0]}
            </span>
          </div>

          {/* Window Count Indicator */}
          <Show when={hasOpenWindows()}>
            <div class="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full border border-background bg-primary pb-px text-center font-mono text-[10px] text-primary-foreground shadow-sm">
              {windowCount()}
            </div>
          </Show>

          {/* Active indicator (glow dot) */}
          <div class="absolute -bottom-1.5 size-0.5 rounded-full bg-foreground opacity-0 transition-all duration-300 group-hover:opacity-100" />
        </button>
      </Tooltip>
    </div>
  )
}

// Export a wrapped version with TooltipGroup for instant tooltip switching in taskbar
export const TaskbarButtons = (props: { children: JSX.Element }) => {
  return <TooltipGroup skipDelayDuration={100}>{props.children}</TooltipGroup>
}
