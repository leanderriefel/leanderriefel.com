import { Tooltip as TooltipPrimitive, type TooltipRootProps as TooltipPrimitiveRootProps } from "@kobalte/core/tooltip"
import { cva, type VariantProps } from "class-variance-authority"
import { Accessor, ParentProps, JSX, createContext, createMemo, splitProps, useContext } from "solid-js"
import { cn } from "~/os/utils"

interface TooltipGroupContextValue {
  skipDelayDuration?: Accessor<number | undefined>
}

const TooltipGroupContext = createContext<TooltipGroupContextValue | null>(null)

export interface TooltipGroupProps extends ParentProps {
  skipDelayDuration?: number
}

export const TooltipGroup = (props: TooltipGroupProps) => {
  const skipDelayDuration = createMemo(() => props.skipDelayDuration)

  const contextValue: TooltipGroupContextValue = {
    skipDelayDuration,
  }

  return <TooltipGroupContext.Provider value={contextValue}>{props.children}</TooltipGroupContext.Provider>
}

const tooltipContentVariants = cva(
  "rounded-lg border px-2.5 py-1.5 text-xs font-medium shadow-xl backdrop-blur-md animate-in fade-in-0 zoom-in-95 z-50",
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

type TooltipPlacement = NonNullable<TooltipPrimitiveRootProps["placement"]>

export interface TooltipProps
  extends Omit<TooltipPrimitiveRootProps, "placement" | "gutter" | "openDelay" | "skipDelayDuration">,
    VariantProps<typeof tooltipContentVariants> {
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
  const group = useContext(TooltipGroupContext)
  const [local, rest] = splitProps(props, [
    "children",
    "class",
    "content",
    "contentClass",
    "variant",
    "delayDuration",
    "skipDelayDuration",
    "disabled",
    "side",
    "align",
    "sideOffset",
  ])

  const placement = createMemo<TooltipPlacement>(() => {
    const side = local.side ?? "top"
    const align = local.align ?? "center"
    if (align === "center") return side as TooltipPlacement
    return `${side}-${align}` as TooltipPlacement
  })

  const gutter = () => local.sideOffset ?? 12
  const openDelay = () => local.delayDuration ?? 400
  const skipDelay = () => local.skipDelayDuration ?? group?.skipDelayDuration?.() ?? 300

  return (
    <TooltipPrimitive
      placement={placement()}
      gutter={gutter()}
      openDelay={openDelay()}
      closeDelay={100}
      skipDelayDuration={skipDelay()}
      disabled={local.disabled}
      {...rest}
    >
      <TooltipPrimitive.Trigger class={cn("inline-flex", local.class)}>{local.children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content class={cn(tooltipContentVariants({ variant: local.variant }), local.contentClass)}>
          {local.content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive>
  )
}
