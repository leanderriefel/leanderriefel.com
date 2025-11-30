import {
  JSX,
  createSignal,
  createContext,
  useContext,
  ParentProps,
  Show,
  onMount,
  onCleanup,
  Accessor,
  createMemo,
} from "solid-js"
import { cva, type VariantProps } from "class-variance-authority"
import { Portal } from "./portal"
import { cn } from "~/os/utils"

// Context Menu Context
interface ContextMenuContextValue {
  isOpen: Accessor<boolean>
  position: Accessor<{ x: number; y: number }>
  open: (x: number, y: number) => void
  close: () => void
  setMenuRef: (el: HTMLElement | null) => void
  registerTrigger: (el: HTMLElement | null) => void
  unregisterTrigger: (el: HTMLElement | null) => void
}

const ContextMenuContext = createContext<ContextMenuContextValue | null>(null)

export interface ContextMenuProps extends ParentProps {
  disabled?: boolean
}

export const ContextMenu = (props: ContextMenuProps) => {
  const [isOpen, setIsOpen] = createSignal(false)
  const [position, setPosition] = createSignal({ x: 0, y: 0 })
  const [menuRef, setMenuRef] = createSignal<HTMLElement | null>(null)
  const [triggerRefs, setTriggerRefs] = createSignal<Set<HTMLElement>>(new Set())

  const open = (x: number, y: number) => {
    setPosition({ x, y })
    setIsOpen(true)
  }

  const close = () => setIsOpen(false)

  const registerTrigger = (el: HTMLElement | null) => {
    if (el) {
      setTriggerRefs((refs) => new Set([...refs, el]))
    }
  }

  const unregisterTrigger = (el: HTMLElement | null) => {
    if (el) {
      setTriggerRefs((refs) => {
        const newRefs = new Set(refs)
        newRefs.delete(el)
        return newRefs
      })
    }
  }

  // Close on click outside
  const handleClickOutside = (e: MouseEvent) => {
    const menu = menuRef()
    if (menu && !menu.contains(e.target as Node)) {
      close()
    }
  }

  // Close on escape
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      close()
    }
  }

  // Close on any other context menu (but allow triggers to handle their own)
  const handleOtherContextMenu = (e: MouseEvent) => {
    const menu = menuRef()
    const triggers = triggerRefs()
    const target = e.target as Node

    // Check if target is within any trigger
    const isWithinTrigger = Array.from(triggers).some((trigger) => trigger.contains(target))

    if (isWithinTrigger) {
      // Let the trigger handle it - don't interfere
      return
    }

    // If menu is open and click is outside, close it
    if (menu && !menu.contains(target)) {
      close()
    }
  }

  onMount(() => {
    document.addEventListener("click", handleClickOutside)
    document.addEventListener("keydown", handleKeyDown)
    document.addEventListener("contextmenu", handleOtherContextMenu)
  })

  onCleanup(() => {
    document.removeEventListener("click", handleClickOutside)
    document.removeEventListener("keydown", handleKeyDown)
    document.removeEventListener("contextmenu", handleOtherContextMenu)
  })

  return (
    <ContextMenuContext.Provider
      value={{ isOpen, position, open, close, setMenuRef, registerTrigger, unregisterTrigger }}
    >
      {props.children}
    </ContextMenuContext.Provider>
  )
}

// Context Menu Trigger - wraps the element that triggers the context menu
export interface ContextMenuTriggerProps extends ParentProps {
  class?: string
  disabled?: boolean
}

export const ContextMenuTrigger = (props: ContextMenuTriggerProps) => {
  const context = useContext(ContextMenuContext)
  let triggerElement: HTMLDivElement | null = null

  const handleContextMenu = (e: MouseEvent) => {
    if (props.disabled) return
    e.preventDefault()
    e.stopPropagation()
    context?.open(e.clientX, e.clientY)
  }

  onMount(() => {
    if (triggerElement) {
      triggerElement.addEventListener("contextmenu", handleContextMenu, true)
    }
  })

  onCleanup(() => {
    if (triggerElement) {
      triggerElement.removeEventListener("contextmenu", handleContextMenu, true)
      context?.unregisterTrigger(triggerElement)
    }
  })

  return (
    <div
      ref={(el) => {
        if (triggerElement && triggerElement !== el) {
          triggerElement.removeEventListener("contextmenu", handleContextMenu, true)
          context?.unregisterTrigger(triggerElement)
        }
        triggerElement = el
        if (el) {
          el.addEventListener("contextmenu", handleContextMenu, true)
          context?.registerTrigger(el)
        }
      }}
      class={props.class}
    >
      {props.children}
    </div>
  )
}

// Context Menu Content - the actual menu that appears
export interface ContextMenuContentProps extends ParentProps {
  class?: string
}

export const ContextMenuContent = (props: ContextMenuContentProps) => {
  const context = useContext(ContextMenuContext)

  // Adjust position to stay within viewport
  const getAdjustedPosition = (menuEl: HTMLElement | null) => {
    const pos = context?.position() ?? { x: 0, y: 0 }
    if (!menuEl) return pos

    const rect = menuEl.getBoundingClientRect()
    const viewport = { width: window.innerWidth, height: window.innerHeight }

    let { x, y } = pos

    if (x + rect.width > viewport.width) {
      x = viewport.width - rect.width - 8
    }
    if (y + rect.height > viewport.height) {
      y = viewport.height - rect.height - 8
    }

    return { x: Math.max(8, x), y: Math.max(8, y) }
  }

  const [localRef, setLocalRef] = createSignal<HTMLElement | null>(null)

  const adjustedPos = createMemo(() => getAdjustedPosition(localRef()))

  return (
    <Show when={context?.isOpen()}>
      <Portal>
        <div
          ref={(el) => {
            setLocalRef(el)
            context?.setMenuRef(el)
          }}
          role="menu"
          tabIndex={-1}
          class={cn(
            "animate-in fade-in-0 zoom-in-95 fixed z-[2000] min-w-[180px] overflow-hidden rounded-xl border border-border bg-popover/95 p-1 shadow-2xl backdrop-blur-xl",
            props.class,
          )}
          style={{
            left: `${adjustedPos().x}px`,
            top: `${adjustedPos().y}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {props.children}
        </div>
      </Portal>
    </Show>
  )
}

// Context Menu Item
const contextMenuItemVariants = cva(
  "relative flex cursor-pointer select-none items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm outline-none transition-colors",
  {
    variants: {
      variant: {
        default:
          "text-muted-foreground hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
        destructive: "text-destructive hover:bg-destructive/20 hover:text-destructive focus:bg-destructive/20",
        disabled: "pointer-events-none text-muted-foreground/50",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

export interface ContextMenuItemProps extends ParentProps, VariantProps<typeof contextMenuItemVariants> {
  onSelect?: () => void
  disabled?: boolean
  class?: string
  icon?: JSX.Element
  shortcut?: string
}

export const ContextMenuItem = (props: ContextMenuItemProps) => {
  const context = useContext(ContextMenuContext)

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
        contextMenuItemVariants({
          variant: props.disabled ? "disabled" : props.variant,
        }),
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

// Context Menu Separator
export interface ContextMenuSeparatorProps {
  class?: string
}

export const ContextMenuSeparator = (props: ContextMenuSeparatorProps) => {
  return <div class={cn("-mx-1 my-1 h-px bg-border", props.class)} />
}

// Context Menu Label
export interface ContextMenuLabelProps extends ParentProps {
  class?: string
}

export const ContextMenuLabel = (props: ContextMenuLabelProps) => {
  return (
    <div
      class={cn("px-2.5 py-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase", props.class)}
    >
      {props.children}
    </div>
  )
}

// Context Menu Sub (submenu support)
export interface ContextMenuSubProps extends ParentProps {
  label: string
  icon?: JSX.Element
  class?: string
}

export const ContextMenuSub = (props: ContextMenuSubProps) => {
  const [isOpen, setIsOpen] = createSignal(false)
  let hoverTimeout: ReturnType<typeof setTimeout>

  const handleMouseEnter = () => {
    clearTimeout(hoverTimeout)
    setIsOpen(true)
  }

  const handleMouseLeave = () => {
    hoverTimeout = setTimeout(() => setIsOpen(false), 100)
  }

  onCleanup(() => clearTimeout(hoverTimeout))

  return (
    <div class="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <div
        class={cn(
          "flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
          props.class,
        )}
      >
        <Show when={props.icon}>
          <span class="flex size-4 items-center justify-center text-muted-foreground/80">{props.icon}</span>
        </Show>
        <span class="flex-1">{props.label}</span>
        <span class="text-muted-foreground">›</span>
      </div>
      <Show when={isOpen()}>
        <div
          class="animate-in fade-in-0 slide-in-from-left-1 absolute top-0 left-full ml-1 min-w-[160px] overflow-hidden rounded-xl border border-border bg-popover/95 p-1 shadow-2xl backdrop-blur-xl"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {props.children}
        </div>
      </Show>
    </div>
  )
}

// Context Menu Checkbox Item
export interface ContextMenuCheckboxItemProps extends ParentProps {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  class?: string
}

export const ContextMenuCheckboxItem = (props: ContextMenuCheckboxItemProps) => {
  const handleClick = () => {
    if (props.disabled) return
    props.onCheckedChange?.(!props.checked)
  }

  return (
    <button
      role="menuitemcheckbox"
      aria-checked={props.checked}
      tabIndex={props.disabled ? -1 : 0}
      class={cn(
        "flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
        props.disabled && "pointer-events-none text-muted-foreground/50",
        props.class,
      )}
      onClick={handleClick}
      disabled={props.disabled}
    >
      <span class="flex size-4 items-center justify-center">
        <Show when={props.checked}>
          <svg class="size-3 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </Show>
      </span>
      <span class="flex-1 text-left">{props.children}</span>
    </button>
  )
}
