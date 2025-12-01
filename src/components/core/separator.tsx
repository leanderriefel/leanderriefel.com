import { Separator as SeparatorPrimitive, type SeparatorRootProps } from "@kobalte/core/separator"
import { cva, type VariantProps } from "class-variance-authority"
import { splitProps } from "solid-js"
import { cn } from "~/os/utils"

type SeparatorPrimitiveDivProps = SeparatorRootProps<"div">

const separatorVariants = cva("shrink-0 transition-colors", {
  variants: {
    orientation: {
      horizontal: "h-px w-full",
      vertical: "h-full w-px",
    },
    variant: {
      default:
        "bg-linear-to-r from-transparent via-border/80 to-transparent data-[orientation=vertical]:bg-linear-to-b data-[orientation=vertical]:from-transparent data-[orientation=vertical]:via-border/80 data-[orientation=vertical]:to-transparent",
      subtle: "bg-border/50",
      strong: "bg-foreground/25",
    },
  },
  defaultVariants: {
    orientation: "horizontal",
    variant: "default",
  },
})

export interface SeparatorProps
  extends VariantProps<typeof separatorVariants>,
    Omit<SeparatorPrimitiveDivProps, "children" | "orientation"> {
  class?: string
}

export const Separator = (props: SeparatorProps) => {
  const [local, rest] = splitProps(props, ["orientation", "variant", "class"])
  const orientation = () => (local.orientation ?? undefined) as SeparatorPrimitiveDivProps["orientation"]

  return (
    <SeparatorPrimitive
      as="div"
      orientation={orientation()}
      class={cn(separatorVariants({ orientation: orientation(), variant: local.variant }), local.class)}
      {...rest}
    />
  )
}
