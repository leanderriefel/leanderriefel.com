import { JSX, createSignal, createContext, useContext, ParentProps, Show, onMount, onCleanup, Accessor } from "solid-js"
import { cva, type VariantProps } from "class-variance-authority"
import { Portal } from "./portal"
import { cn } from "~/os/utils"

// Dropdown Context
interface DropdownContextValue {
  isOpen: Accessor<boolean>
  toggle: () => void
  close: () => void
  triggerRef: Accessor<HTMLElement | null>
  setTriggerRef: (el: HTMLElement | null) => void
}

const DropdownContext = createContext<DropdownContextValue | null>(null)

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface DropdownMenuProps extends ParentProps {}

export const DropdownMenu = (props: DropdownMenuProps) => {
  const [isOpen, setIsOpen] = createSignal(false)
  const [triggerRef, setTriggerRef] = createSignal<HTMLElement | null>(null)

  const toggle = () => setIsOpen((prev) => !prev)
  const close = () => setIsOpen(false)

  // Close on click outside
  const handleClickOutside = (e: MouseEvent) => {
    const trigger = triggerRef()
    if (trigger && !trigger.contains(e.target as Node)) {
      close()
    }
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      close()
    }
  }

  onMount(() => {
    document.addEventListener("click", handleClickOutside, true)
    document.addEventListener("keydown", handleKeyDown)
  })

  onCleanup(() => {
    document.removeEventListener("click", handleClickOutside, true)
    document.removeEventListener("keydown", handleKeyDown)
  })

  return (
    <DropdownContext.Provider value={{ isOpen, toggle, close, triggerRef, setTriggerRef }}>
      <div class="relative inline-block">{props.children}</div>
    </DropdownContext.Provider>
  )
}

// Dropdown Trigger
export interface DropdownMenuTriggerProps extends ParentProps {
  class?: string
}

export const DropdownMenuTrigger = (props: DropdownMenuTriggerProps) => {
  const context = useContext(DropdownContext)

  return (
    <button
      ref={(el) => context?.setTriggerRef(el)}
      class={cn("inline-flex items-center", props.class)}
      aria-haspopup="menu"
      aria-expanded={context?.isOpen()}
      onClick={(e) => {
        e.stopPropagation()
        context?.toggle()
      }}
    >
      {props.children}
    </button>
  )
}

// Dropdown Content
const dropdownContentVariants = cva(
  "z-9999 min-w-[180px] overflow-hidden rounded-xl border p-1 shadow-2xl backdrop-blur-xl animate-in fade-in-0",
  {
    variants: {
      variant: {
        default: "border-border bg-popover/95",
        glass: "border-foreground/5 bg-foreground/5",
      },
      side: {
        bottom: "mt-1 slide-in-from-top-2",
        top: "mb-1 slide-in-from-bottom-2",
        left: "mr-1 slide-in-from-right-2",
        right: "ml-1 slide-in-from-left-2",
      },
      align: {
        start: "",
        center: "",
        end: "",
      },
    },
    defaultVariants: {
      variant: "default",
      side: "bottom",
      align: "start",
    },
  },
)

export interface DropdownMenuContentProps extends ParentProps, VariantProps<typeof dropdownContentVariants> {
  class?: string
  sideOffset?: number
}

export const DropdownMenuContent = (props: DropdownMenuContentProps) => {
  const context = useContext(DropdownContext)
  const [position, setPosition] = createSignal({ x: 0, y: 0 })
  const [menuRef, setMenuRef] = createSignal<HTMLElement | null>(null)

  const side = () => props.side ?? "bottom"
  const align = () => props.align ?? "start"
  const sideOffset = () => props.sideOffset ?? 4

  const updatePosition = () => {
    const trigger = context?.triggerRef()
    const menu = menuRef()
    if (!trigger || !menu) return

    const triggerRect = trigger.getBoundingClientRect()
    const menuRect = menu.getBoundingClientRect()
    const viewport = { width: window.innerWidth, height: window.innerHeight }

    let x = 0
    let y = 0

    // Calculate side position
    switch (side()) {
      case "bottom":
        y = triggerRect.bottom + sideOffset()
        break
      case "top":
        y = triggerRect.top - menuRect.height - sideOffset()
        break
      case "left":
        x = triggerRect.left - menuRect.width - sideOffset()
        break
      case "right":
        x = triggerRect.right + sideOffset()
        break
    }

    // Calculate alignment
    if (side() === "bottom" || side() === "top") {
      switch (align()) {
        case "start":
          x = triggerRect.left
          break
        case "center":
          x = triggerRect.left + triggerRect.width / 2 - menuRect.width / 2
          break
        case "end":
          x = triggerRect.right - menuRect.width
          break
      }
    } else {
      switch (align()) {
        case "start":
          y = triggerRect.top
          break
        case "center":
          y = triggerRect.top + triggerRect.height / 2 - menuRect.height / 2
          break
        case "end":
          y = triggerRect.bottom - menuRect.height
          break
      }
    }

    // Keep within viewport
    x = Math.max(8, Math.min(x, viewport.width - menuRect.width - 8))
    y = Math.max(8, Math.min(y, viewport.height - menuRect.height - 8))

    setPosition({ x, y })
  }

  // Update position when opened
  onMount(() => {
    updatePosition()
    window.addEventListener("resize", updatePosition)
    window.addEventListener("scroll", updatePosition, true)
  })

  onCleanup(() => {
    window.removeEventListener("resize", updatePosition)
    window.removeEventListener("scroll", updatePosition, true)
  })

  return (
    <Show when={context?.isOpen()}>
      <Portal>
        <div
          ref={(el) => {
            setMenuRef(el)
            // Recalculate after first render to get actual dimensions
            requestAnimationFrame(updatePosition)
          }}
          role="menu"
          class={cn(dropdownContentVariants({ variant: props.variant, side: side(), align: align() }), props.class)}
          style={{
            position: "fixed",
            left: `${position().x}px`,
            top: `${position().y}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {props.children}
        </div>
      </Portal>
    </Show>
  )
}

// Dropdown Menu Item
const dropdownItemVariants = cva(
  "relative flex cursor-pointer select-none items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm outline-none transition-colors",
  {
    variants: {
      variant: {
        default:
          "text-muted-foreground hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
        destructive: "text-destructive hover:bg-destructive/20 hover:text-destructive focus:bg-destructive/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

export interface DropdownMenuItemProps extends ParentProps, VariantProps<typeof dropdownItemVariants> {
  onSelect?: () => void
  disabled?: boolean
  class?: string
  icon?: JSX.Element
  shortcut?: string
}

export const DropdownMenuItem = (props: DropdownMenuItemProps) => {
  const context = useContext(DropdownContext)

  const handleClick = () => {
    if (props.disabled) return
    props.onSelect?.()
    context?.close()
  }

  return (
    <button
      role="menuitem"
      tabIndex={props.disabled ? -1 : 0}
      class={cn(
        dropdownItemVariants({ variant: props.variant }),
        props.disabled && "pointer-events-none text-muted-foreground/50",
        props.class,
      )}
      onClick={handleClick}
      disabled={props.disabled}
    >
      <Show when={props.icon}>
        <span class="flex size-4 items-center justify-center text-muted-foreground/80">{props.icon}</span>
      </Show>
      <span class="flex-1 text-left">{props.children}</span>
      <Show when={props.shortcut}>
        <span class="ml-auto text-xs tracking-wide text-muted-foreground/80">{props.shortcut}</span>
      </Show>
    </button>
  )
}

// Dropdown Separator
export interface DropdownMenuSeparatorProps {
  class?: string
}

export const DropdownMenuSeparator = (props: DropdownMenuSeparatorProps) => {
  return <div class={cn("-mx-1 my-1 h-px bg-border", props.class)} />
}

// Dropdown Label
export interface DropdownMenuLabelProps extends ParentProps {
  class?: string
}

export const DropdownMenuLabel = (props: DropdownMenuLabelProps) => {
  return (
    <div
      class={cn("px-2.5 py-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase", props.class)}
    >
      {props.children}
    </div>
  )
}
