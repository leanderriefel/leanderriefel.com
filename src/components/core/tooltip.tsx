import { JSX, createSignal, createContext, useContext, ParentProps, Show, onCleanup, Accessor } from "solid-js"
import { cva, type VariantProps } from "class-variance-authority"
import { Portal } from "./portal"
import { cn } from "~/os/utils"

// Tooltip group context for instant switching
interface TooltipGroupContextValue {
  isAnyTooltipOpen: Accessor<boolean>
  setAnyTooltipOpen: (value: boolean) => void
  lastCloseTime: Accessor<number>
  setLastCloseTime: (value: number) => void
}

const TooltipGroupContext = createContext<TooltipGroupContextValue | null>(null)

export interface TooltipGroupProps extends ParentProps {
  skipDelayDuration?: number
}

export const TooltipGroup = (props: TooltipGroupProps) => {
  const [isAnyTooltipOpen, setAnyTooltipOpen] = createSignal(false)
  const [lastCloseTime, setLastCloseTime] = createSignal(0)

  return (
    <TooltipGroupContext.Provider
      value={{
        isAnyTooltipOpen,
        setAnyTooltipOpen,
        lastCloseTime,
        setLastCloseTime,
      }}
    >
      {props.children}
    </TooltipGroupContext.Provider>
  )
}

const tooltipContentVariants = cva(
  "rounded-lg border px-2.5 py-1.5 text-xs font-medium shadow-xl backdrop-blur-md animate-in fade-in-0 zoom-in-95",
  {
    variants: {
      variant: {
        default: "border-border bg-popover/95 text-popover-foreground",
        glass: "border-foreground/5 bg-foreground/5 text-foreground",
        dark: "border-border bg-popover text-popover-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

export interface TooltipProps extends ParentProps, VariantProps<typeof tooltipContentVariants> {
  content: JSX.Element
  delayDuration?: number
  skipDelayDuration?: number
  disabled?: boolean
  side?: "top" | "bottom" | "left" | "right"
  align?: "start" | "center" | "end"
  sideOffset?: number
  class?: string
  contentClass?: string
}

export const Tooltip = (props: TooltipProps) => {
  const [isOpen, setIsOpen] = createSignal(false)
  const [triggerRef, setTriggerRef] = createSignal<HTMLElement | null>(null)
  const [tooltipRef, setTooltipRef] = createSignal<HTMLElement | null>(null)
  const [position, setPosition] = createSignal({ x: 0, y: 0 })
  const groupContext = useContext(TooltipGroupContext)

  let openTimeout: ReturnType<typeof setTimeout>
  let closeTimeout: ReturnType<typeof setTimeout>

  const delayDuration = () => props.delayDuration ?? 400
  const skipDelayDuration = () => props.skipDelayDuration ?? 300
  const preferredSide = () => props.side ?? "top"
  const align = () => props.align ?? "center"
  const sideOffset = () => props.sideOffset ?? 12
  const [activeSide, setActiveSide] = createSignal<"top" | "bottom" | "left" | "right">(preferredSide())

  const shouldSkipDelay = () => {
    if (!groupContext) return false
    const timeSinceClose = Date.now() - groupContext.lastCloseTime()
    return groupContext.isAnyTooltipOpen() || timeSinceClose < skipDelayDuration()
  }

  const updatePosition = () => {
    const trigger = triggerRef()
    const tooltip = tooltipRef()
    if (!trigger) return

    const triggerRect = trigger.getBoundingClientRect()
    const tooltipRect = tooltip?.getBoundingClientRect() ?? { width: 0, height: 0 }
    const viewport = { width: window.innerWidth, height: window.innerHeight }

    let side = preferredSide()

    // Only attempt collision logic if we have dimensions
    if (tooltipRect.width > 0 && tooltipRect.height > 0) {
      if (side === "top" && triggerRect.top - tooltipRect.height - sideOffset() < 8) {
        side = "bottom"
      } else if (side === "bottom" && triggerRect.bottom + tooltipRect.height + sideOffset() > viewport.height - 8) {
        side = "top"
      } else if (side === "left" && triggerRect.left - tooltipRect.width - sideOffset() < 8) {
        side = "right"
      } else if (side === "right" && triggerRect.right + tooltipRect.width + sideOffset() > viewport.width - 8) {
        side = "left"
      }
    }

    let x = 0
    let y = 0

    // Calculate Anchor Points (Not top-left of tooltip)
    if (side === "top" || side === "bottom") {
      // Vertical position
      y = side === "top" ? triggerRect.top - sideOffset() : triggerRect.bottom + sideOffset()

      // Horizontal Anchor
      switch (align()) {
        case "start":
          x = triggerRect.left
          break
        case "center":
          x = triggerRect.left + triggerRect.width / 2
          break
        case "end":
          x = triggerRect.right
          break
      }
    } else {
      // Horizontal position
      x = side === "left" ? triggerRect.left - sideOffset() : triggerRect.right + sideOffset()

      // Vertical Anchor
      switch (align()) {
        case "start":
          y = triggerRect.top
          break
        case "center":
          y = triggerRect.top + triggerRect.height / 2
          break
        case "end":
          y = triggerRect.bottom
          break
      }
    }

    // Clamp Anchor to viewport
    if (tooltipRect.width > 0) {
      const halfWidth = tooltipRect.width / 2

      if (side === "top" || side === "bottom") {
        if (align() === "center") {
          x = Math.max(halfWidth + 8, Math.min(x, viewport.width - halfWidth - 8))
        }
      }
    } else {
      x = Math.max(8, Math.min(x, viewport.width - 8))
      y = Math.max(8, Math.min(y, viewport.height - 8))
    }

    setActiveSide(side)
    // Round to nearest pixel to avoid sub-pixel blurring
    setPosition({ x: Math.round(x), y: Math.round(y) })
  }

  const open = () => {
    if (props.disabled) return
    clearTimeout(closeTimeout)

    const delay = shouldSkipDelay() ? 0 : delayDuration()

    const show = () => {
      setIsOpen(true)
      groupContext?.setAnyTooltipOpen(true)
      requestAnimationFrame(() => updatePosition())
    }

    if (delay === 0) {
      updatePosition()
      show()
    } else {
      openTimeout = setTimeout(() => {
        updatePosition()
        show()
      }, delay)
    }
  }

  const close = () => {
    clearTimeout(openTimeout)
    closeTimeout = setTimeout(() => {
      setIsOpen(false)
      groupContext?.setAnyTooltipOpen(false)
      groupContext?.setLastCloseTime(Date.now())
    }, 100)
  }

  onCleanup(() => {
    clearTimeout(openTimeout)
    clearTimeout(closeTimeout)
  })

  const getTransform = () => {
    const side = activeSide()
    const a = align()

    if (side === "top") {
      if (a === "center") return "translate(-50%, -100%)"
      if (a === "start") return "translate(0, -100%)"
      if (a === "end") return "translate(-100%, -100%)"
    }
    if (side === "bottom") {
      if (a === "center") return "translate(-50%, 0)"
      if (a === "start") return "translate(0, 0)"
      if (a === "end") return "translate(-100%, 0)"
    }
    if (side === "left") {
      if (a === "center") return "translate(-100%, -50%)"
      if (a === "start") return "translate(-100%, 0)"
      if (a === "end") return "translate(-100%, -100%)"
    }
    if (side === "right") {
      if (a === "center") return "translate(0, -50%)"
      if (a === "start") return "translate(0, 0)"
      if (a === "end") return "translate(0, -100%)"
    }
    return "translate(-50%, -100%)"
  }

  return (
    <>
      <div
        ref={setTriggerRef}
        class={cn("inline-flex", props.class)}
        onMouseEnter={open}
        onMouseLeave={close}
        onFocus={open}
        onBlur={close}
        aria-describedby={isOpen() ? "tooltip" : undefined}
      >
        {props.children}
      </div>
      <Show when={isOpen()}>
        <Portal>
          <div
            ref={(el) => {
              setTooltipRef(el)
              requestAnimationFrame(() => updatePosition())
            }}
            class="fixed z-50"
            style={{
              left: `${position().x}px`,
              top: `${position().y}px`,
              transform: getTransform(),
            }}
            onMouseEnter={open}
            onMouseLeave={close}
          >
            <div
              id="tooltip"
              role="tooltip"
              class={cn(tooltipContentVariants({ variant: props.variant }), props.contentClass)}
            >
              {props.content}
            </div>
          </div>
        </Portal>
      </Show>
    </>
  )
}
