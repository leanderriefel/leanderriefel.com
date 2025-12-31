import { ParentProps } from "solid-js"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "~/os/utils"

const cardVariants = cva("overflow-hidden rounded-xl transition-all", {
  variants: {
    variant: {
      default: "border border-border bg-card/50 backdrop-blur-md shadow-sm hover:bg-card/60",
      glass: "border border-white/10 bg-black/40 backdrop-blur-2xl shadow-2xl hover:bg-black/50",
      solid: "border border-border bg-card shadow-md",
      ghost: "bg-transparent",
    },
    padding: {
      none: "",
      sm: "p-3",
      md: "p-4",
      lg: "p-6",
    },
  },
  defaultVariants: {
    variant: "default",
    padding: "none",
  },
})

export interface CardProps extends ParentProps, VariantProps<typeof cardVariants> {
  class?: string
}

export const Card = (props: CardProps) => {
  return (
    <div class={cn(cardVariants({ variant: props.variant, padding: props.padding }), props.class)}>
      {props.children}
    </div>
  )
}

// Card Header
export interface CardHeaderProps extends ParentProps {
  class?: string
}

export const CardHeader = (props: CardHeaderProps) => {
  return <div class={cn("flex flex-col gap-1.5 border-b border-border px-4 py-3", props.class)}>{props.children}</div>
}

// Card Title
export interface CardTitleProps extends ParentProps {
  class?: string
}

export const CardTitle = (props: CardTitleProps) => {
  return <h3 class={cn("text-sm font-semibold text-card-foreground", props.class)}>{props.children}</h3>
}

// Card Description
export interface CardDescriptionProps extends ParentProps {
  class?: string
}

export const CardDescription = (props: CardDescriptionProps) => {
  return <p class={cn("text-xs text-muted-foreground", props.class)}>{props.children}</p>
}

// Card Content
export interface CardContentProps extends ParentProps {
  class?: string
}

export const CardContent = (props: CardContentProps) => {
  return <div class={cn("p-4", props.class)}>{props.children}</div>
}

// Card Footer
export interface CardFooterProps extends ParentProps {
  class?: string
}

export const CardFooter = (props: CardFooterProps) => {
  return <div class={cn("flex items-center gap-2 border-t border-border px-4 py-3", props.class)}>{props.children}</div>
}
