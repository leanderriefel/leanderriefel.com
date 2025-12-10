import {
  ContextMenu as ContextMenuPrimitive,
  type ContextMenuCheckboxItemProps as ContextMenuPrimitiveCheckboxItemProps,
  type ContextMenuContentProps as ContextMenuPrimitiveContentProps,
  type ContextMenuItemProps as ContextMenuPrimitiveItemProps,
  type ContextMenuRootProps as ContextMenuPrimitiveRootProps,
  type ContextMenuSeparatorProps as ContextMenuPrimitiveSeparatorProps,
  type ContextMenuSubProps as ContextMenuPrimitiveSubProps,
  type ContextMenuTriggerProps as ContextMenuPrimitiveTriggerProps,
} from "@kobalte/core/context-menu"
import { cva, type VariantProps } from "class-variance-authority"
import { splitProps, type JSX, type ParentProps } from "solid-js"
import { cn } from "~/os/utils"

type ContextMenuPrimitiveSeparatorDivProps = ContextMenuPrimitiveSeparatorProps<"div">

const contextMenuItemVariants = cva(
  "relative flex cursor-pointer select-none items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm outline-none transition-colors",
  {
    variants: {
      variant: {
        default:
          "text-muted-foreground hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
        destructive:
          "text-destructive hover:bg-destructive/20 hover:text-destructive focus:bg-destructive/20 [&_svg]:fill-destructive [&_svg]:text-destructive",
        disabled: "pointer-events-none text-muted-foreground/50",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

export type ContextMenuProps = ContextMenuPrimitiveRootProps

export const ContextMenu = (props: ContextMenuProps) => {
  return <ContextMenuPrimitive {...props} />
}

export type ContextMenuTriggerProps = ParentProps<Omit<ContextMenuPrimitiveTriggerProps, "class">> & {
  class?: string
}

export const ContextMenuTrigger = (props: ContextMenuTriggerProps) => {
  const [local, rest] = splitProps(props, ["class", "children", "disabled"])

  return (
    <ContextMenuPrimitive.Trigger class={cn("cursor-pointer", local.class)} disabled={local.disabled} {...rest}>
      {local.children}
    </ContextMenuPrimitive.Trigger>
  )
}

export type ContextMenuContentProps = ParentProps<Omit<ContextMenuPrimitiveContentProps, "class">> & {
  class?: string
}

export const ContextMenuContent = (props: ContextMenuContentProps) => {
  const [local, rest] = splitProps(props, ["class", "children"])

  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Content
        class={cn(
          "animate-in fade-in-0 zoom-in-95 z-2000 min-w-[180px] overflow-hidden rounded-xl border border-border bg-popover/95 p-1 shadow-2xl ring-0 backdrop-blur-xl outline-none focus:outline-none focus-visible:ring-0 focus-visible:outline-none",
          local.class,
        )}
        {...rest}
      >
        {local.children}
      </ContextMenuPrimitive.Content>
    </ContextMenuPrimitive.Portal>
  )
}

export type ContextMenuItemProps = ParentProps<Omit<ContextMenuPrimitiveItemProps, "class">> &
  VariantProps<typeof contextMenuItemVariants> & {
    class?: string
    icon?: JSX.Element
    shortcut?: string
  }

export const ContextMenuItem = (props: ContextMenuItemProps) => {
  const [local, rest] = splitProps(props, ["class", "children", "variant", "icon", "shortcut", "disabled", "onSelect"])

  return (
    <ContextMenuPrimitive.Item
      class={cn(contextMenuItemVariants({ variant: local.disabled ? "disabled" : local.variant }), local.class)}
      disabled={local.disabled}
      onSelect={local.onSelect}
      {...rest}
    >
      {local.icon && <span class="flex size-4 items-center justify-center text-muted-foreground/80">{local.icon}</span>}
      <span class="flex flex-1 items-center text-left">{local.children}</span>
      {local.shortcut && <span class="ml-auto text-xs tracking-wide text-muted-foreground/80">{local.shortcut}</span>}
    </ContextMenuPrimitive.Item>
  )
}

export interface ContextMenuSeparatorProps extends Omit<ContextMenuPrimitiveSeparatorDivProps, "class"> {
  class?: string
}

export const ContextMenuSeparator = (props: ContextMenuSeparatorProps) => {
  const [local, rest] = splitProps(props, ["class"])

  return <ContextMenuPrimitive.Separator as="div" class={cn("-mx-1 my-1 h-px bg-border", local.class)} {...rest} />
}

export interface ContextMenuLabelProps extends ParentProps {
  class?: string
}

export const ContextMenuLabel = (props: ContextMenuLabelProps) => {
  const [local] = splitProps(props, ["class", "children"])

  return (
    <div
      class={cn("px-2.5 py-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase", local.class)}
    >
      {local.children}
    </div>
  )
}

export type ContextMenuSubProps = ParentProps<Omit<ContextMenuPrimitiveSubProps, "children">> & {
  label: string
  icon?: JSX.Element
  class?: string
  contentClass?: string
}

export const ContextMenuSub = (props: ContextMenuSubProps) => {
  const [local, rest] = splitProps(props, ["label", "icon", "class", "contentClass", "children"])

  return (
    <ContextMenuPrimitive.Sub {...rest}>
      <ContextMenuPrimitive.SubTrigger
        class={cn(
          "flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
          local.class,
        )}
      >
        {local.icon && (
          <span class="flex size-4 items-center justify-center text-muted-foreground/80">{local.icon}</span>
        )}
        <span class="flex-1">{local.label}</span>
        <span class="text-muted-foreground">›</span>
      </ContextMenuPrimitive.SubTrigger>
      <ContextMenuPrimitive.Portal>
        <ContextMenuPrimitive.SubContent
          class={cn(
            "animate-in fade-in-0 slide-in-from-left-1 z-2000 min-w-[160px] overflow-hidden rounded-xl border border-border bg-popover/95 p-1 shadow-2xl ring-0 backdrop-blur-xl outline-none focus:outline-none focus-visible:ring-0 focus-visible:outline-none",
            local.contentClass,
          )}
        >
          {local.children}
        </ContextMenuPrimitive.SubContent>
      </ContextMenuPrimitive.Portal>
    </ContextMenuPrimitive.Sub>
  )
}

export type ContextMenuCheckboxItemProps = ParentProps<
  Omit<ContextMenuPrimitiveCheckboxItemProps, "class" | "onChange">
> & {
  class?: string
  onCheckedChange?: ContextMenuPrimitiveCheckboxItemProps["onChange"]
}

export const ContextMenuCheckboxItem = (props: ContextMenuCheckboxItemProps) => {
  const [local, rest] = splitProps(props, ["class", "children", "onCheckedChange", "disabled"])

  return (
    <ContextMenuPrimitive.CheckboxItem
      class={cn(
        "flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
        local.disabled && "pointer-events-none text-muted-foreground/50",
        local.class,
      )}
      onChange={local.onCheckedChange}
      disabled={local.disabled}
      {...rest}
    >
      <span class="flex size-4 items-center justify-center">
        <ContextMenuPrimitive.ItemIndicator>
          <svg class="size-3 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </ContextMenuPrimitive.ItemIndicator>
      </span>
      <span class="flex-1 text-left">{local.children}</span>
    </ContextMenuPrimitive.CheckboxItem>
  )
}
