import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "~/os/utils"

const separatorVariants = cva("shrink-0", {
  variants: {
    orientation: {
      horizontal: "h-px w-full",
      vertical: "h-full w-px",
    },
    variant: {
      default: "bg-border",
      subtle: "bg-border/50",
      strong: "bg-foreground/20",
      gradient: "bg-linear-to-r from-transparent via-border to-transparent",
    },
  },
  defaultVariants: {
    orientation: "horizontal",
    variant: "default",
  },
})

export interface SeparatorProps extends VariantProps<typeof separatorVariants> {
  class?: string
}

export const Separator = (props: SeparatorProps) => {
  return <div class={cn(separatorVariants({ orientation: props.orientation, variant: props.variant }), props.class)} />
}
