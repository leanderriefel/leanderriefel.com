import { ParentProps } from "solid-js"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "~/os/utils"

const badgeVariants = cva("inline-flex items-center gap-1 rounded-full font-medium transition-colors", {
  variants: {
    variant: {
      default: "border border-border bg-secondary/50 text-secondary-foreground",
      primary: "border border-primary/50 bg-primary/10 text-primary",
      success: "border border-success/50 bg-success/10 text-success",
      warning: "border border-warning/50 bg-warning/10 text-warning",
      destructive: "border border-destructive/50 bg-destructive/10 text-destructive",
      outline: "border border-border bg-transparent text-muted-foreground",
    },
    size: {
      sm: "px-1.5 py-px text-[10px]",
      md: "px-2 py-0.5 text-xs",
      lg: "px-2.5 py-1 text-sm",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "md",
  },
})

export interface BadgeProps extends ParentProps, VariantProps<typeof badgeVariants> {
  class?: string
}

export const Badge = (props: BadgeProps) => {
  return (
    <span class={cn(badgeVariants({ variant: props.variant, size: props.size }), props.class)}>{props.children}</span>
  )
}
