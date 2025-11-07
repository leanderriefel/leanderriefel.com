import { XIcon, MinusIcon, SquareIcon, Maximize2Icon } from "lucide-solid"
import { For, Signal, createSignal, onCleanup, onMount } from "solid-js"
import { App } from "~/os"
import { bringToFront, closeApp, getZIndex, openApps } from "~/os/windows/open-windows"

export interface WindowProps {
  app: App
  position: Signal<{
    x: number
    y: number
  }>
  size: Signal<{
    width: number
    height: number
  }>
  display: Signal<"default" | "minimized" | "maximized" | "fullscreen">
}

export const WindowManager = () => {
  return <For each={openApps.apps}>{(props) => <Window {...props} />}</For>
}

export const Window = (props: WindowProps) => {
  const [isDragging, setIsDragging] = createSignal(false)
  const [dragStart, setDragStart] = createSignal<{
    mouseX: number
    mouseY: number
    windowX: number
    windowY: number
  } | null>(null)

  const handleClose = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    closeApp(props.app)
  }

  const handleMinimize = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    props.display[1]("minimized")
  }

  const handleMaximize = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const currentDisplay = props.display[0]()
    props.display[1](currentDisplay === "maximized" ? "default" : "maximized")
  }

  const handleMouseDown = (e: MouseEvent) => {
    e.preventDefault()
    const currentPos = props.position[0]()
    setDragStart({
      mouseX: e.clientX,
      mouseY: e.clientY,
      windowX: currentPos.x,
      windowY: currentPos.y,
    })
    setIsDragging(true)
    bringToFront(props.app.id)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging() || !dragStart()) return

    const start = dragStart()!
    const deltaX = e.clientX - start.mouseX
    const deltaY = e.clientY - start.mouseY

    props.position[1]({
      x: start.windowX + deltaX,
      y: start.windowY + deltaY,
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setDragStart(null)
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
      class="grid-rows[auto_1fr] absolute grid rounded-xl border-2 border-white/10 bg-black/25 backdrop-blur-3xl"
      style={{
        top: `${props.position[0]().y}px`,
        left: `${props.position[0]().x}px`,
        width: `${props.size[0]().width}px`,
        height: `${props.size[0]().height}px`,
        "z-index": `${getZIndex(props.app.id)}`,
      }}
    >
      <div
        class="flex h-8 w-full cursor-move items-center justify-between gap-2 overflow-hidden rounded-t-xl bg-black/50 px-2"
        onMouseDown={handleMouseDown}
      >
        <div class="flex min-w-0 flex-1 items-center gap-2">
          <h3 class="truncate text-sm font-medium text-white">
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
            title={props.display[0]() === "maximized" ? "Restore" : "Maximize"}
          >
            {props.display[0]() === "maximized" ? (
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

      {/* Red edge handles - full edges */}
      <div data-handle="top" class="absolute -top-2 right-2 left-2 h-2 cursor-ns-resize" />
      <div data-handle="bottom" class="absolute right-2 -bottom-2 left-2 h-2 cursor-ns-resize" />
      <div data-handle="left" class="absolute top-2 bottom-2 -left-2 w-2 cursor-ew-resize" />
      <div data-handle="right" class="absolute top-2 -right-2 bottom-2 w-2 cursor-ew-resize" />

      {/* Blue corner handles */}
      <div data-handle="top-left" class="absolute -top-2 -left-2 size-3 cursor-nwse-resize" />
      <div data-handle="top-right" class="absolute -top-2 -right-2 size-3 cursor-nesw-resize" />
      <div data-handle="bottom-left" class="absolute -bottom-2 -left-2 size-3 cursor-nesw-resize" />
      <div data-handle="bottom-right" class="absolute -right-2 -bottom-2 size-3 cursor-nwse-resize" />
    </div>
  )
}
