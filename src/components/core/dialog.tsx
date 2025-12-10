import {
  Dialog as DialogPrimitive,
  type DialogCloseButtonProps as DialogPrimitiveCloseButtonProps,
  type DialogContentProps as DialogPrimitiveContentProps,
  type DialogDescriptionProps as DialogPrimitiveDescriptionProps,
  type DialogRootProps as DialogPrimitiveRootProps,
  type DialogTitleProps as DialogPrimitiveTitleProps,
  type DialogTriggerProps as DialogPrimitiveTriggerProps,
} from "@kobalte/core/dialog"
import { cva, type VariantProps } from "class-variance-authority"
import { splitProps, type ParentProps } from "solid-js"
import { cn } from "~/os/utils"
import { XIcon } from "lucide-solid"

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

export type DialogProps = DialogPrimitiveRootProps

export const Dialog = (props: DialogProps) => {
  return <DialogPrimitive {...props} />
}

export type DialogTriggerProps = ParentProps<Omit<DialogPrimitiveTriggerProps, "class">> & {
  class?: string
}

export const DialogTrigger = (props: DialogTriggerProps) => {
  const [local, rest] = splitProps(props, ["class", "children"])

  return (
    <DialogPrimitive.Trigger class={cn("inline-flex cursor-pointer", local.class)} {...rest}>
      {local.children}
    </DialogPrimitive.Trigger>
  )
}

export type DialogContentProps = ParentProps<Omit<DialogPrimitiveContentProps, "class">> &
  VariantProps<typeof dialogContentVariants> & {
    class?: string
    showClose?: boolean
  }

export const DialogContent = (props: DialogContentProps) => {
  const [local, rest] = splitProps(props, ["children", "class", "variant", "size", "showClose"])

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay class="animate-in fade-in-0 fixed inset-0 z-9998 bg-black/60 backdrop-blur-sm" />
      <DialogPrimitive.Content
        class={cn(
          dialogContentVariants({ variant: local.variant, size: local.size }),
          "top-1/2 left-1/2 w-full -translate-x-1/2 -translate-y-1/2",
          local.class,
        )}
        {...rest}
      >
        {local.children}
        {local.showClose !== false && (
          <DialogPrimitive.CloseButton class="absolute top-3 right-3 flex size-7 cursor-pointer items-center justify-center rounded-lg border border-border bg-secondary/50 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
            <XIcon class="size-4" />
          </DialogPrimitive.CloseButton>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

export interface DialogHeaderProps extends ParentProps {
  class?: string
}

export const DialogHeader = (props: DialogHeaderProps) => {
  const [local] = splitProps(props, ["children", "class"])
  return <div class={cn("flex flex-col gap-1.5 border-b border-border px-5 py-4", local.class)}>{local.children}</div>
}

export type DialogTitleProps = ParentProps<Omit<DialogPrimitiveTitleProps, "class">> & {
  class?: string
}

export const DialogTitle = (props: DialogTitleProps) => {
  const [local] = splitProps(props, ["children", "class"])
  return (
    <DialogPrimitive.Title class={cn("text-base font-semibold text-foreground", local.class)}>
      {local.children}
    </DialogPrimitive.Title>
  )
}

export type DialogDescriptionProps = ParentProps<Omit<DialogPrimitiveDescriptionProps, "class">> & {
  class?: string
}

export const DialogDescription = (props: DialogDescriptionProps) => {
  const [local] = splitProps(props, ["children", "class"])
  return (
    <DialogPrimitive.Description class={cn("text-sm text-muted-foreground", local.class)}>
      {local.children}
    </DialogPrimitive.Description>
  )
}

export interface DialogBodyProps extends ParentProps {
  class?: string
}

export const DialogBody = (props: DialogBodyProps) => {
  const [local] = splitProps(props, ["children", "class"])
  return <div class={cn("flex-1 overflow-auto px-5 py-4", local.class)}>{local.children}</div>
}

export interface DialogFooterProps extends ParentProps {
  class?: string
}

export const DialogFooter = (props: DialogFooterProps) => {
  const [local] = splitProps(props, ["children", "class"])
  return (
    <div class={cn("flex items-center justify-end gap-2 border-t border-border px-5 py-3", local.class)}>
      {local.children}
    </div>
  )
}

export type DialogCloseProps = ParentProps<Omit<DialogPrimitiveCloseButtonProps, "class">> & {
  class?: string
}

export const DialogClose = (props: DialogCloseProps) => {
  const [local, rest] = splitProps(props, ["children", "class"])
  return (
    <DialogPrimitive.CloseButton class={cn("inline-flex cursor-pointer", local.class)} {...rest}>
      {local.children}
    </DialogPrimitive.CloseButton>
  )
}

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
          {props.description && <DialogDescription>{props.description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          <button
            class="cursor-pointer rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary/80 hover:text-foreground"
            onClick={() => {
              props.onCancel?.()
              props.onOpenChange?.(false)
            }}
          >
            {props.cancelText ?? "Cancel"}
          </button>
          <button
            class={cn(
              "cursor-pointer rounded-lg px-4 py-2 text-sm font-medium transition-colors",
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
