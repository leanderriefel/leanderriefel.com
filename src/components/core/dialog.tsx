import {
  createSignal,
  createContext,
  useContext,
  ParentProps,
  Show,
  onMount,
  onCleanup,
  Accessor,
  Setter,
} from "solid-js"
import { cva, type VariantProps } from "class-variance-authority"
import { Portal } from "./portal"
import { cn } from "~/os/utils"
import { XIcon } from "lucide-solid"

// Dialog Context
interface DialogContextValue {
  isOpen: Accessor<boolean>
  setIsOpen: Setter<boolean>
  close: () => void
  titleId: string
  descriptionId: string
}

const DialogContext = createContext<DialogContextValue | null>(null)

export interface DialogProps extends ParentProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  defaultOpen?: boolean
  modal?: boolean
}

export const Dialog = (props: DialogProps) => {
  const [internalOpen, setInternalOpen] = createSignal(props.defaultOpen ?? false)
  const titleId = `dialog-title-${Math.random().toString(36).slice(2)}`
  const descriptionId = `dialog-description-${Math.random().toString(36).slice(2)}`

  const isOpen = () => props.open ?? internalOpen()
  const setIsOpen = (value: boolean | ((prev: boolean) => boolean)) => {
    const newValue = typeof value === "function" ? value(isOpen()) : value
    setInternalOpen(newValue)
    props.onOpenChange?.(newValue)
  }

  const close = () => setIsOpen(false)

  return (
    <DialogContext.Provider value={{ isOpen, setIsOpen: setIsOpen as Setter<boolean>, close, titleId, descriptionId }}>
      {props.children}
    </DialogContext.Provider>
  )
}

// Dialog Trigger
export interface DialogTriggerProps extends ParentProps {
  class?: string
  asChild?: boolean
}

export const DialogTrigger = (props: DialogTriggerProps) => {
  const context = useContext(DialogContext)

  return (
    <button class={cn("inline-flex", props.class)} onClick={() => context?.setIsOpen(true)}>
      {props.children}
    </button>
  )
}

// Dialog Content Variants
const dialogContentVariants = cva(
  "fixed z-9999 flex flex-col overflow-hidden shadow-2xl animate-in fade-in-0 zoom-in-95",
  {
    variants: {
      variant: {
        default: "border border-border bg-background/95 backdrop-blur-xl",
        glass: "border border-foreground/5 bg-black/50 backdrop-blur-2xl",
        solid: "border border-border bg-card",
      },
      size: {
        sm: "max-w-sm rounded-xl",
        md: "max-w-md rounded-xl",
        lg: "max-w-lg rounded-xl",
        xl: "max-w-xl rounded-2xl",
        "2xl": "max-w-2xl rounded-2xl",
        full: "h-[90vh] max-w-[90vw] rounded-2xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
)

export interface DialogContentProps extends ParentProps, VariantProps<typeof dialogContentVariants> {
  class?: string
  showClose?: boolean
  onEscapeKeyDown?: (e: KeyboardEvent) => void
  onPointerDownOutside?: (e: MouseEvent) => void
}

export const DialogContent = (props: DialogContentProps) => {
  const context = useContext(DialogContext)
  const [contentRef, setContentRef] = createSignal<HTMLElement | null>(null)

  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      props.onEscapeKeyDown?.(e)
      if (!e.defaultPrevented) {
        context?.close()
      }
    }
  }

  const handleClickOutside = (e: MouseEvent) => {
    const content = contentRef()
    if (content && !content.contains(e.target as Node)) {
      props.onPointerDownOutside?.(e)
      if (!e.defaultPrevented) {
        context?.close()
      }
    }
  }

  onMount(() => {
    document.addEventListener("keydown", handleEscape)
  })

  onCleanup(() => {
    document.removeEventListener("keydown", handleEscape)
  })

  return (
    <Show when={context?.isOpen()}>
      <Portal>
        {/* Overlay */}
        <div
          class="animate-in fade-in-0 fixed inset-0 z-9998 bg-black/60 backdrop-blur-sm"
          onClick={handleClickOutside}
        />
        {/* Content */}
        <div
          ref={setContentRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={context?.titleId}
          aria-describedby={context?.descriptionId}
          class={cn(
            dialogContentVariants({ variant: props.variant, size: props.size }),
            "top-1/2 left-1/2 w-full -translate-x-1/2 -translate-y-1/2",
            props.class,
          )}
        >
          {props.children}
          <Show when={props.showClose !== false}>
            <button
              class="absolute top-3 right-3 flex size-7 cursor-pointer items-center justify-center rounded-lg border border-border bg-secondary/50 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              onClick={() => context?.close()}
            >
              <XIcon class="size-4" />
            </button>
          </Show>
        </div>
      </Portal>
    </Show>
  )
}

// Dialog Header
export interface DialogHeaderProps extends ParentProps {
  class?: string
}

export const DialogHeader = (props: DialogHeaderProps) => {
  return <div class={cn("flex flex-col gap-1.5 border-b border-border px-5 py-4", props.class)}>{props.children}</div>
}

// Dialog Title
export interface DialogTitleProps extends ParentProps {
  class?: string
}

export const DialogTitle = (props: DialogTitleProps) => {
  const context = useContext(DialogContext)
  return (
    <h2 id={context?.titleId} class={cn("text-base font-semibold text-foreground", props.class)}>
      {props.children}
    </h2>
  )
}

// Dialog Description
export interface DialogDescriptionProps extends ParentProps {
  class?: string
}

export const DialogDescription = (props: DialogDescriptionProps) => {
  const context = useContext(DialogContext)
  return (
    <p id={context?.descriptionId} class={cn("text-sm text-muted-foreground", props.class)}>
      {props.children}
    </p>
  )
}

// Dialog Body
export interface DialogBodyProps extends ParentProps {
  class?: string
}

export const DialogBody = (props: DialogBodyProps) => {
  return <div class={cn("flex-1 overflow-auto px-5 py-4", props.class)}>{props.children}</div>
}

// Dialog Footer
export interface DialogFooterProps extends ParentProps {
  class?: string
}

export const DialogFooter = (props: DialogFooterProps) => {
  return (
    <div class={cn("flex items-center justify-end gap-2 border-t border-border px-5 py-3", props.class)}>
      {props.children}
    </div>
  )
}

// Dialog Close (renders children with close functionality)
export interface DialogCloseProps extends ParentProps {
  class?: string
}

export const DialogClose = (props: DialogCloseProps) => {
  const context = useContext(DialogContext)

  return (
    <button class={cn("inline-flex", props.class)} onClick={() => context?.close()}>
      {props.children}
    </button>
  )
}

// Alert Dialog (Specialized confirmation dialog)
export interface AlertDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  onConfirm?: () => void
  onCancel?: () => void
  variant?: "default" | "destructive"
}

export const AlertDialog = (props: AlertDialogProps) => {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent size="sm" showClose={false}>
        <DialogHeader>
          <DialogTitle>{props.title}</DialogTitle>
          <Show when={props.description}>
            <DialogDescription>{props.description}</DialogDescription>
          </Show>
        </DialogHeader>
        <DialogFooter>
          <button
            class="rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary/80 hover:text-foreground"
            onClick={() => {
              props.onCancel?.()
              props.onOpenChange?.(false)
            }}
          >
            {props.cancelText ?? "Cancel"}
          </button>
          <button
            class={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              props.variant === "destructive"
                ? "border border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : "border border-primary bg-primary text-primary-foreground hover:bg-primary/90",
            )}
            onClick={() => {
              props.onConfirm?.()
              props.onOpenChange?.(false)
            }}
          >
            {props.confirmText ?? "Confirm"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
