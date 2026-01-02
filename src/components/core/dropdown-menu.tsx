import {
  DropdownMenu as DropdownMenuPrimitive,
  type DropdownMenuContentProps as DropdownMenuPrimitiveContentProps,
  type DropdownMenuItemProps as DropdownMenuPrimitiveItemProps,
  type DropdownMenuRootProps as DropdownMenuPrimitiveRootProps,
  type DropdownMenuSeparatorProps as DropdownMenuPrimitiveSeparatorProps,
  type DropdownMenuTriggerProps as DropdownMenuPrimitiveTriggerProps,
} from "@kobalte/core/dropdown-menu"
import { cva, type VariantProps } from "class-variance-authority"
import { Show, splitProps, type JSX, type ParentProps } from "solid-js"
import { cn } from "~/os/utils"

type DropdownMenuPrimitiveSeparatorDivProps = DropdownMenuPrimitiveSeparatorProps<"div">

const dropdownContentVariants = cva(
  "z-9999 min-w-[180px] overflow-hidden rounded-xl border p-1 shadow-2xl backdrop-blur-xl animate-in  fade-in-0",
  {
    variants: {
      variant: {
        default: "border-border bg-popover/95",
        glass: "border-foreground/5 bg-background/25",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

const dropdownItemVariants = cva(
  "relative flex select-none items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm outline-none transition-colors",
  {
    variants: {
      variant: {
        default:
          "text-muted-foreground hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
        glass:
          "text-foreground border border-transparent hover:border-foreground/25 hover:bg-foreground/5 hover:text-foreground focus-visible:bg-foreground/5 focus-visible:border-foreground/25 focus-visible:text-foreground",
        destructive:
          "text-destructive hover:bg-destructive/20 hover:text-destructive focus:bg-destructive/20 [&_svg]:fill-destructive [&_svg]:text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

type DropdownPlacement = NonNullable<DropdownMenuPrimitiveRootProps["placement"]>

export interface DropdownMenuProps extends Omit<DropdownMenuPrimitiveRootProps, "placement" | "gutter"> {
  side?: "top" | "bottom" | "left" | "right"
  align?: "start" | "center" | "end"
  sideOffset?: number
}

export const DropdownMenu = (props: DropdownMenuProps) => {
  const [local, rest] = splitProps(props, ["side", "align", "sideOffset"])

  const placement = (): DropdownPlacement => {
    const side = local.side ?? "bottom"
    const align = local.align ?? "start"
    return (align === "center" ? side : `${side}-${align}`) as DropdownPlacement
  }

  return <DropdownMenuPrimitive placement={placement()} gutter={local.sideOffset ?? 4} {...rest} />
}

export type DropdownMenuTriggerProps = ParentProps<Omit<DropdownMenuPrimitiveTriggerProps, "class">> & {
  class?: string
}

export const DropdownMenuTrigger = (props: DropdownMenuTriggerProps) => {
  const [local, rest] = splitProps(props, ["class", "children"])

  return (
    <DropdownMenuPrimitive.Trigger class={cn("inline-flex items-center", local.class)} {...rest}>
      {local.children}
    </DropdownMenuPrimitive.Trigger>
  )
}

export type DropdownMenuContentProps = ParentProps<Omit<DropdownMenuPrimitiveContentProps, "class">> &
  VariantProps<typeof dropdownContentVariants> & {
    class?: string
  }

export const DropdownMenuContent = (props: DropdownMenuContentProps) => {
  const [local, rest] = splitProps(props, ["children", "class", "variant"])

  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        class={cn(dropdownContentVariants({ variant: local.variant }), local.class)}
        {...rest}
      >
        {local.children}
      </DropdownMenuPrimitive.Content>
    </DropdownMenuPrimitive.Portal>
  )
}

export type DropdownMenuItemProps = ParentProps<Omit<DropdownMenuPrimitiveItemProps, "class">> &
  VariantProps<typeof dropdownItemVariants> & {
    class?: string
    icon?: JSX.Element
    shortcut?: string
  }

export const DropdownMenuItem = (props: DropdownMenuItemProps) => {
  const [local, rest] = splitProps(props, ["children", "class", "variant", "disabled", "icon", "shortcut", "onSelect"])

  return (
    <DropdownMenuPrimitive.Item
      class={cn(
        dropdownItemVariants({ variant: local.variant }),
        local.disabled && "pointer-events-none text-muted-foreground/50",
        local.class,
      )}
      disabled={local.disabled}
      onSelect={local.onSelect}
      {...rest}
    >
      <Show when={local.icon}>
        <span class="flex size-4 items-center justify-center text-muted-foreground/80">{local.icon}</span>
      </Show>
      <span class="flex-1 text-left">{local.children}</span>
      <Show when={local.shortcut}>
        <span class="ml-auto text-xs tracking-wide text-muted-foreground/80">{local.shortcut}</span>
      </Show>
    </DropdownMenuPrimitive.Item>
  )
}

export interface DropdownMenuSeparatorProps extends Omit<DropdownMenuPrimitiveSeparatorDivProps, "class"> {
  class?: string
}

export const DropdownMenuSeparator = (props: DropdownMenuSeparatorProps) => {
  const [local, rest] = splitProps(props, ["class"])

  return <DropdownMenuPrimitive.Separator as="div" class={cn("-mx-1 my-1 h-px bg-border", local.class)} {...rest} />
}

export interface DropdownMenuLabelProps extends ParentProps {
  class?: string
}

export const DropdownMenuLabel = (props: DropdownMenuLabelProps) => {
  const [local] = splitProps(props, ["children", "class"])
  return (
    <div
      class={cn("px-2.5 py-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase", local.class)}
    >
      {local.children}
    </div>
  )
}
