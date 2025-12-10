import {
  Select as SelectPrimitive,
  type SelectContentProps as SelectPrimitiveContentProps,
  type SelectItemProps as SelectPrimitiveItemProps,
  type SelectRootProps as SelectPrimitiveRootProps,
  type SelectSectionProps as SelectPrimitiveSectionProps,
  type SelectTriggerProps as SelectPrimitiveTriggerProps,
  type SelectValueProps as SelectPrimitiveValueProps,
} from "@kobalte/core/select"
import { cva, type VariantProps } from "class-variance-authority"
import { splitProps, type ParentProps } from "solid-js"
import { cn } from "~/os/utils"
import { CheckIcon, ChevronsUpDownIcon } from "lucide-solid"

export type SelectProps<Option> = ParentProps<SelectPrimitiveRootProps<Option>>

export const Select = <Option,>(props: SelectProps<Option>) => {
  return <SelectPrimitive<Option> {...props} />
}

export type SelectValueProps<Option> = SelectPrimitiveValueProps<Option> & {
  class?: string
}

export const SelectValue = <Option,>(props: SelectValueProps<Option>) => {
  const [local, rest] = splitProps(props, ["class", "children"])
  return (
    <SelectPrimitive.Value class={cn("truncate", local.class)} {...rest}>
      {local.children}
    </SelectPrimitive.Value>
  )
}

export type SelectTriggerProps = ParentProps<Omit<SelectPrimitiveTriggerProps, "class">> & {
  class?: string
}

export const SelectTrigger = (props: SelectTriggerProps) => {
  const [local, rest] = splitProps(props, ["class", "children"])
  return (
    <SelectPrimitive.Trigger
      class={cn(
        "flex h-9 w-full cursor-pointer items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        local.class,
      )}
      {...rest}
    >
      {local.children}
      <SelectPrimitive.Icon as={ChevronsUpDownIcon} class="size-4 opacity-50" />
    </SelectPrimitive.Trigger>
  )
}

const selectContentVariants = cva(
  "relative z-9999 min-w-[8rem] overflow-hidden rounded-xl border p-1 shadow-2xl backdrop-blur-xl animate-in fade-in-0 zoom-in-95",
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

export type SelectContentProps = ParentProps<Omit<SelectPrimitiveContentProps, "class">> &
  VariantProps<typeof selectContentVariants> & {
    class?: string
  }

export const SelectContent = (props: SelectContentProps) => {
  const [local, rest] = splitProps(props, ["children", "class", "variant"])

  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content class={cn(selectContentVariants({ variant: local.variant }), local.class)} {...rest}>
        <SelectPrimitive.Listbox class="p-1 focus-visible:outline-none" />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

export type SelectItemProps = ParentProps<Omit<SelectPrimitiveItemProps, "class">> & {
  class?: string
}

export const SelectItem = (props: SelectItemProps) => {
  const [local, rest] = splitProps(props, ["children", "class"])

  return (
    <SelectPrimitive.Item
      class={cn(
        "relative flex w-full cursor-pointer items-center rounded-sm py-1.5 pr-8 pl-2 text-sm outline-none select-none focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
        local.class,
      )}
      {...rest}
    >
      <SelectPrimitive.ItemLabel>{local.children}</SelectPrimitive.ItemLabel>
      <SelectPrimitive.ItemIndicator class="absolute right-2 flex size-3.5 items-center justify-center">
        <CheckIcon class="size-4" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
}

export type SelectSectionProps = ParentProps<Omit<SelectPrimitiveSectionProps, "class">> & {
  class?: string
}

export const SelectSection = (props: SelectSectionProps) => {
  const [local, rest] = splitProps(props, ["class", "children"])
  return (
    <SelectPrimitive.Section
      class={cn("px-2 py-1.5 text-xs font-semibold text-muted-foreground", local.class)}
      {...rest}
    >
      {local.children}
    </SelectPrimitive.Section>
  )
}
