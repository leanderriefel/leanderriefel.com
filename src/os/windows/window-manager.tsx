import { XIcon, MinusIcon, SquareIcon, Maximize2Icon, CopyIcon } from "lucide-solid"
import { For, Suspense, createEffect, createSignal, onCleanup, onMount, Show } from "solid-js"
import { OsWindow, createAppInstance } from "~/os"
import {
  bringToFront,
  closeApp,
  getZIndex,
  minimizeApp,
  openApp,
  openApps,
  setOpenApps,
} from "~/os/windows/open-windows"
import { constrainToViewport, cn } from "~/os/utils"
import { isFocused } from "~/os/focus"
import { IconButton, Tooltip } from "~/components/core"
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuLabel,
} from "~/components/core"

const MIN_WIDTH = 200
const MIN_HEIGHT = 100

const BOUND_CHECK_MARGIN = 32

export const WindowManager = () => {
  onMount(() => {
    const handleResize = () => {
      openApps.apps.forEach((app) => {
        const { position, size } = constrainToViewport(app.position, app.size)
        if (
          position.x !== app.position.x ||
          position.y !== app.position.y ||
          size.width !== app.size.width ||
          size.height !== app.size.height
        ) {
          setOpenApps("apps", (w) => w.id === app.id, { position, size })
        }
      })
    }
    window.addEventListener("resize", handleResize)
    onCleanup(() => window.removeEventListener("resize", handleResize))
  })

  return <For each={openApps.apps}>{(props) => <Window {...props} />}</For>
}

export const Window = (props: OsWindow) => {
  // oxlint-disable-next-line no-unassigned-vars
  let headerRef!: HTMLDivElement

  const [isDragging, setIsDragging] = createSignal(false)
  const [dragStart, setDragStart] = createSignal<{
    mouseX: number
    mouseY: number
    windowX: number
    windowY: number
  } | null>(null)

  const [isResizing, setIsResizing] = createSignal(false)
  const [resizeStart, setResizeStart] = createSignal<{
    mouseX: number
    mouseY: number
    windowX: number
    windowY: number
    width: number
    height: number
    handle: string
  } | null>(null)

  const [isExiting, setIsExiting] = createSignal(false)

  const handleClose = (e?: MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()
    setIsExiting(true)
    setTimeout(() => closeApp(props.id), 150)
  }

  const handleMinimize = (e?: MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()
    const appId = props.id
    setIsExiting(true)
    setTimeout(() => minimizeApp(appId), 150)
  }

  const handleMaximize = (e?: MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()
    const currentDisplay = props.display
    const appId = props.id
    setOpenApps("apps", (w) => w.id === appId, "display", currentDisplay === "maximized" ? "default" : "maximized")
  }

  createEffect(() => {
    if (props.display !== "minimized") {
      setIsExiting(false)
    }
  })

  const handleDuplicate = () => {
    const AppClass = props.app.constructor as new () => typeof props.app
    openApp(createAppInstance(AppClass as Parameters<typeof createAppInstance>[0]))
  }

  const handleMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return
    e.preventDefault()
    const currentPos = props.position
    setDragStart({
      mouseX: e.clientX,
      mouseY: e.clientY,
      windowX: currentPos.x,
      windowY: currentPos.y,
    })
    setIsDragging(true)
    bringToFront(props)
  }

  const handleResizeMouseDown = (e: MouseEvent, handle: string) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()

    const currentPos = props.position
    const currentSize = props.size

    setResizeStart({
      mouseX: e.clientX,
      mouseY: e.clientY,
      windowX: currentPos.x,
      windowY: currentPos.y,
      width: currentSize.width,
      height: currentSize.height,
      handle,
    })
    setIsResizing(true)
    bringToFront(props)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging() && dragStart()) {
      const start = dragStart()!
      const deltaX = e.clientX - start.mouseX
      const deltaY = e.clientY - start.mouseY
      const appId = props.id

      const newX = start.windowX + deltaX
      const newY = start.windowY + deltaY

      // Ensure at least BOUND_CHECK_MARGIN pixels of the header remain visible
      const minX = BOUND_CHECK_MARGIN - headerRef.offsetWidth
      const maxX = window.innerWidth - BOUND_CHECK_MARGIN
      const minY = BOUND_CHECK_MARGIN - headerRef.offsetHeight
      const maxY = window.innerHeight - BOUND_CHECK_MARGIN

      setOpenApps("apps", (w) => w.id === appId, "position", {
        x: Math.max(minX, Math.min(newX, maxX)),
        y: Math.max(minY, Math.min(newY, maxY)),
      })
    } else if (isResizing() && resizeStart()) {
      const start = resizeStart()!
      const deltaX = e.clientX - start.mouseX
      const deltaY = e.clientY - start.mouseY
      const appId = props.id

      let newX = start.windowX
      let newY = start.windowY
      let newWidth = start.width
      let newHeight = start.height

      if (start.handle.includes("top")) {
        newHeight = Math.max(MIN_HEIGHT, start.height - deltaY)
        newY = start.windowY + (start.height - newHeight)
      }
      if (start.handle.includes("bottom")) {
        newHeight = Math.max(MIN_HEIGHT, start.height + deltaY)
      }
      if (start.handle.includes("left")) {
        newWidth = Math.max(MIN_WIDTH, start.width - deltaX)
        newX = start.windowX + (start.width - newWidth)
      }
      if (start.handle.includes("right")) {
        newWidth = Math.max(MIN_WIDTH, start.width + deltaX)
      }

      // Bounds checking
      if (newX < 0) {
        newWidth += newX
        newX = 0
      }
      if (newY < 0) {
        newHeight += newY
        newY = 0
      }
      if (newX + newWidth > window.innerWidth) {
        newWidth = window.innerWidth - newX
      }
      if (newY + newHeight > window.innerHeight) {
        newHeight = window.innerHeight - newY
      }

      setOpenApps("apps", (w) => w.id === appId, {
        position: { x: newX, y: newY },
        size: { width: newWidth, height: newHeight },
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setDragStart(null)
    setIsResizing(false)
    setResizeStart(null)
  }

  onMount(() => {
    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)
    onCleanup(() => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    })
  })

  const windowName = () => (typeof props.app.name === "string" ? props.app.name : props.app.name[0]())

  return (
    <ContextMenu>
      <div
        class={cn("absolute h-full grid-rows-[auto_1fr] border", {
          "transition-all duration-200 ease-out": !isDragging() && !isResizing(),
          hidden: props.display === "minimized",
          grid: props.display !== "minimized",
          "shadow-xl": isFocused(props.id),
          "shadow-md": !isFocused(props.id),
          "rounded-none": props.display !== "default",
          "rounded-xl": props.display === "default",
          "scale-95 opacity-0": isExiting(),
          "scale-100 opacity-100": !isExiting(),
        })}
        style={{
          top: `${props.display === "maximized" ? 0 : props.position.y}px`,
          left: `${props.display === "maximized" ? 0 : props.position.x}px`,
          width: `${props.display === "maximized" ? window.innerWidth : props.size.width}px`,
          height: `${props.display === "maximized" ? window.innerHeight : props.size.height}px`,
          "z-index": `${props.display === "maximized" ? 1000 : getZIndex(props.id)}`,
        }}
        onMouseDown={() => bringToFront(props)}
      >
        <ContextMenuTrigger>
          <div
            ref={headerRef}
            class={cn(
              "flex h-10 w-full cursor-move items-center justify-between gap-2 overflow-hidden border-b backdrop-blur-2xl transition-colors",
              {
                "bg-background": isFocused(props.id),
                "bg-background/60": !isFocused(props.id),
                "rounded-t-none": props.display !== "default",
                "rounded-t-xl": props.display === "default",
              },
            )}
            onMouseDown={handleMouseDown}
          >
            <div class="flex min-w-0 flex-1 items-center gap-2 px-4">
              <h3 class="truncate text-xs tracking-wide text-foreground select-none">{windowName()}</h3>
            </div>
            <div class="mx-2 flex items-center gap-1">
              <Tooltip content="Minimize" side="bottom" delayDuration={500}>
                <IconButton
                  icon={<MinusIcon class="size-3" />}
                  aria-label="Minimize"
                  variant="warning"
                  size="icon-sm"
                  class="size-6 rounded-md [corner-shape:squircle] supports-corner-shape:rounded-full"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={handleMinimize}
                />
              </Tooltip>
              <Tooltip
                content={props.display === "maximized" ? "Restore" : "Maximize"}
                side="bottom"
                delayDuration={500}
              >
                <IconButton
                  icon={
                    <Show when={props.display === "maximized"} fallback={<Maximize2Icon class="size-3" />}>
                      <SquareIcon class="size-3" />
                    </Show>
                  }
                  aria-label={props.display === "maximized" ? "Restore" : "Maximize"}
                  variant="success"
                  size="icon-sm"
                  class="size-6 rounded-md [corner-shape:squircle] supports-corner-shape:rounded-full"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={handleMaximize}
                />
              </Tooltip>
              <Tooltip content="Close" side="bottom" delayDuration={500}>
                <IconButton
                  icon={<XIcon class="size-3" />}
                  aria-label="Close"
                  variant="destructive"
                  size="icon-sm"
                  class="size-6 rounded-md [corner-shape:squircle] supports-corner-shape:rounded-full"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={handleClose}
                />
              </Tooltip>
            </div>
          </div>
        </ContextMenuTrigger>
        <div
          class={cn("@container min-h-0 w-full overflow-auto transition-all duration-200 ease-out", {
            "rounded-b-xl": props.display === "default" || !isExiting(),
            "rounded-b-none": props.display !== "default" || isExiting(),
          })}
        >
          <Suspense
            fallback={
              <div class="flex h-full w-full items-center justify-center bg-background text-xs text-muted-foreground">
                Loading…
              </div>
            }
          >
            {props.app.render()}
          </Suspense>
        </div>

        {/* Edges */}
        <div
          data-handle="top"
          class="absolute -top-2 right-2 left-2 h-2 cursor-ns-resize"
          onMouseDown={(e) => handleResizeMouseDown(e, "top")}
        />
        <div
          data-handle="bottom"
          class="absolute right-2 -bottom-2 left-2 h-2 cursor-ns-resize"
          onMouseDown={(e) => handleResizeMouseDown(e, "bottom")}
        />
        <div
          data-handle="left"
          class="absolute top-2 bottom-2 -left-2 w-2 cursor-ew-resize"
          onMouseDown={(e) => handleResizeMouseDown(e, "left")}
        />
        <div
          data-handle="right"
          class="absolute top-2 -right-2 bottom-2 w-2 cursor-ew-resize"
          onMouseDown={(e) => handleResizeMouseDown(e, "right")}
        />

        {/* Corners */}
        <div
          data-handle="top-left"
          class="absolute -top-2 -left-2 size-3 cursor-nwse-resize"
          onMouseDown={(e) => handleResizeMouseDown(e, "top-left")}
        />
        <div
          data-handle="top-right"
          class="absolute -top-2 -right-2 size-3 cursor-nesw-resize"
          onMouseDown={(e) => handleResizeMouseDown(e, "top-right")}
        />
        <div
          data-handle="bottom-left"
          class="absolute -bottom-2 -left-2 size-3 cursor-nesw-resize"
          onMouseDown={(e) => handleResizeMouseDown(e, "bottom-left")}
        />
        <div
          data-handle="bottom-right"
          class="absolute -right-2 -bottom-2 size-3 cursor-nwse-resize"
          onMouseDown={(e) => handleResizeMouseDown(e, "bottom-right")}
        />
      </div>

      <ContextMenuContent>
        <ContextMenuLabel>{windowName()}</ContextMenuLabel>
        <ContextMenuSeparator />
        <ContextMenuItem icon={<MinusIcon class="size-4" />} onSelect={handleMinimize}>
          Minimize
        </ContextMenuItem>
        <ContextMenuItem
          icon={
            <Show when={props.display === "maximized"} fallback={<SquareIcon class="size-4" />}>
              <Maximize2Icon class="size-4" />
            </Show>
          }
          onSelect={handleMaximize}
        >
          <Show when={props.display === "maximized"} fallback={"Maximize"}>
            Restore
          </Show>
        </ContextMenuItem>
        <ContextMenuItem icon={<CopyIcon class="size-4" />} onSelect={handleDuplicate}>
          Duplicate Window
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem icon={<XIcon class="size-4" />} variant="destructive" onSelect={handleClose}>
          Close
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
