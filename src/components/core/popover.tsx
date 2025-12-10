import {
  Popover as PopoverPrimitive,
  type PopoverContentProps as PopoverPrimitiveContentProps,
  type PopoverRootProps as PopoverPrimitiveRootProps,
  type PopoverTriggerProps as PopoverPrimitiveTriggerProps,
  type PopoverAnchorProps as PopoverPrimitiveAnchorProps,
  type PopoverCloseButtonProps as PopoverPrimitiveCloseButtonProps,
  type PopoverTitleProps as PopoverPrimitiveTitleProps,
  type PopoverDescriptionProps as PopoverPrimitiveDescriptionProps,
} from "@kobalte/core/popover"
import { cva, type VariantProps } from "class-variance-authority"
import { splitProps, type ParentProps } from "solid-js"
import { cn } from "~/os/utils"
import { XIcon } from "lucide-solid"

const popoverContentVariants = cva(
  "z-9999 w-72 rounded-xl border p-4 shadow-2xl backdrop-blur-xl outline-none animate-in fade-in-0 zoom-in-95",
  {
    variants: {
      variant: {
        default: "border-border bg-popover/95 text-popover-foreground",
        glass: "border-foreground/5 bg-foreground/5 text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

export type PopoverProps = PopoverPrimitiveRootProps

export const Popover = (props: PopoverProps) => {
  return <PopoverPrimitive {...props} />
}

export type PopoverTriggerProps = ParentProps<Omit<PopoverPrimitiveTriggerProps, "class">> & {
  class?: string
}

export const PopoverTrigger = (props: PopoverTriggerProps) => {
  const [local, rest] = splitProps(props, ["class", "children"])

  return (
    <PopoverPrimitive.Trigger class={cn("inline-flex cursor-pointer", local.class)} {...rest}>
      {local.children}
    </PopoverPrimitive.Trigger>
  )
}

export type PopoverAnchorProps = ParentProps<Omit<PopoverPrimitiveAnchorProps, "class">> & {
  class?: string
}

export const PopoverAnchor = (props: PopoverAnchorProps) => {
  const [local, rest] = splitProps(props, ["class", "children"])

  return (
    <PopoverPrimitive.Anchor class={cn("block", local.class)} {...rest}>
      {local.children}
    </PopoverPrimitive.Anchor>
  )
}

export type PopoverContentProps = ParentProps<Omit<PopoverPrimitiveContentProps, "class">> &
  VariantProps<typeof popoverContentVariants> & {
    class?: string
  }

export const PopoverContent = (props: PopoverContentProps) => {
  const [local, rest] = splitProps(props, ["children", "class", "variant"])

  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content class={cn(popoverContentVariants({ variant: local.variant }), local.class)} {...rest}>
        {local.children}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  )
}

export type PopoverTitleProps = ParentProps<Omit<PopoverPrimitiveTitleProps, "class">> & {
  class?: string
}

export const PopoverTitle = (props: PopoverTitleProps) => {
  const [local, rest] = splitProps(props, ["children", "class"])
  return (
    <PopoverPrimitive.Title class={cn("leading-none font-semibold tracking-tight", local.class)} {...rest}>
      {local.children}
    </PopoverPrimitive.Title>
  )
}

export type PopoverDescriptionProps = ParentProps<Omit<PopoverPrimitiveDescriptionProps, "class">> & {
  class?: string
}

export const PopoverDescription = (props: PopoverDescriptionProps) => {
  const [local, rest] = splitProps(props, ["children", "class"])
  return (
    <PopoverPrimitive.Description class={cn("text-sm text-muted-foreground", local.class)} {...rest}>
      {local.children}
    </PopoverPrimitive.Description>
  )
}

export type PopoverCloseProps = ParentProps<Omit<PopoverPrimitiveCloseButtonProps, "class">> & {
  class?: string
}

export const PopoverClose = (props: PopoverCloseProps) => {
  const [local, rest] = splitProps(props, ["children", "class"])
  return (
    <PopoverPrimitive.CloseButton
      class={cn(
        "absolute top-2 right-2 flex size-6 cursor-pointer items-center justify-center rounded-md bg-transparent text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        local.class,
      )}
      {...rest}
    >
      {local.children ?? <XIcon class="size-4" />}
    </PopoverPrimitive.CloseButton>
  )
}
