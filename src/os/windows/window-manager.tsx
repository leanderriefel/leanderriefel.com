import { XIcon, MinusIcon, SquareIcon, Maximize2Icon } from "lucide-solid"
import { For, createSignal, onCleanup, onMount } from "solid-js"
import { OsWindow } from "~/os"
import { bringToFront, closeApp, getZIndex, minimizeApp, openApps, setOpenApps } from "~/os/windows/open-windows"
import { isFocused } from "~/os/focus"

const MIN_WIDTH = 200
const MIN_HEIGHT = 100

export const WindowManager = () => {
  return <For each={openApps.apps}>{(props) => <Window {...props} />}</For>
}

export const Window = (props: OsWindow) => {
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

  const handleClose = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    closeApp(props.id)
  }

  const handleMinimize = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const appId = props.id
    minimizeApp(appId)
  }

  const handleMaximize = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const currentDisplay = props.display
    const appId = props.id
    setOpenApps("apps", (w) => w.id === appId, "display", currentDisplay === "maximized" ? "default" : "maximized")
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

      setOpenApps("apps", (w) => w.id === appId, "position", {
        x: start.windowX + deltaX,
        y: start.windowY + deltaY,
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

  return (
    <div
      class={`grid-rows[auto_1fr] absolute border-2 bg-black/25 backdrop-blur-3xl ${
        props.display === "minimized" ? "hidden" : "grid"
      } ${
        isFocused(props.id) ? "border-white/20 shadow-2xl shadow-black/50" : "border-white/10 shadow-lg"
      } ${props.display !== "default" ? "rounded-none" : "rounded-xl"}`}
      style={{
        top: `${props.display === "maximized" ? 0 : props.position.y}px`,
        left: `${props.display === "maximized" ? 0 : props.position.x}px`,
        width: `${props.display === "maximized" ? window.innerWidth : props.size.width}px`,
        height: `${props.display === "maximized" ? window.innerHeight : props.size.height}px`,
        "z-index": `${props.display === "maximized" ? 1000 : getZIndex(props.id)}`,
      }}
    >
      <div
        class="flex h-8 w-full cursor-move items-center justify-between gap-2 overflow-hidden rounded-t-xl bg-black/50 px-2"
        onMouseDown={handleMouseDown}
      >
        <div class="flex min-w-0 flex-1 items-center gap-2">
          <h3 class="ml-1 truncate text-xs tracking-wide text-white select-none">
            {typeof props.app.name === "string" ? props.app.name : props.app.name[0]()}
          </h3>
        </div>
        <div class="flex shrink-0 items-center gap-1">
          <button
            onClick={handleMinimize}
            class="inline-flex size-5 cursor-pointer items-center justify-center rounded border border-yellow-500/50 bg-yellow-500/10 hover:bg-yellow-500/20"
            title="Minimize"
          >
            <MinusIcon class="size-3 text-white" />
          </button>
          <button
            onClick={handleMaximize}
            class="inline-flex size-5 cursor-pointer items-center justify-center rounded border border-green-500/50 bg-green-500/10 hover:bg-green-500/20"
            title={props.display === "maximized" ? "Restore" : "Maximize"}
          >
            {props.display === "maximized" ? (
              <Maximize2Icon class="size-3 text-white" />
            ) : (
              <SquareIcon class="size-3 text-white" />
            )}
          </button>
          <button
            onClick={handleClose}
            class="inline-flex size-5 cursor-pointer items-center justify-center rounded border border-red-500/50 bg-red-500/10 hover:bg-red-500/20"
            title="Close"
          >
            <XIcon class="size-3 text-white" />
          </button>
        </div>
      </div>
      <div class="size-full grow overflow-hidden rounded-b-xl">{props.app.render()}</div>

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
  )
}
