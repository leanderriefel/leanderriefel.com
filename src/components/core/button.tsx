import { JSX, ParentProps, splitProps } from "solid-js"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "~/os/utils"

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "border border-border bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 hover:border-border/80",
        primary:
          "border border-primary/50 bg-primary/10 text-primary hover:bg-primary/20 hover:border-primary hover:shadow-sm",
        success:
          "border border-success/50 bg-success/10 text-success hover:bg-success/20 hover:border-success hover:shadow-sm",
        warning:
          "border border-warning/50 bg-warning/10 text-warning hover:bg-warning/20 hover:border-warning hover:shadow-sm",
        destructive:
          "border border-destructive/50 bg-destructive/10 text-destructive hover:bg-destructive/20 hover:border-destructive hover:shadow-sm",
        ghost:
          "border border-transparent bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        outline:
          "border border-input bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:border-accent",
        glass:
          "border border-border/10 bg-background/5 text-foreground backdrop-blur-xl hover:bg-background/10 hover:border-border/20 shadow-sm",
        link: "border-0 bg-transparent text-primary underline-offset-4 hover:text-primary/80 hover:underline",
      },
      size: {
        xs: "h-6 px-2 text-xs rounded-md gap-1",
        sm: "h-8 px-3 text-xs gap-1.5",
        md: "h-9 px-4 text-sm gap-2",
        lg: "h-10 px-5 text-sm gap-2",
        xl: "h-12 px-6 text-base gap-2.5",
        icon: "size-9 p-0",
        "icon-sm": "size-7 p-0",
        "icon-lg": "size-11 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
)

export interface ButtonProps
  extends
    ParentProps,
    VariantProps<typeof buttonVariants>,
    Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  class?: string
  loading?: boolean
  leftIcon?: JSX.Element
  rightIcon?: JSX.Element
}

export const Button = (props: ButtonProps) => {
  const [local, rest] = splitProps(props, [
    "class",
    "variant",
    "size",
    "children",
    "loading",
    "leftIcon",
    "rightIcon",
    "disabled",
  ])

  return (
    <button
      class={cn(buttonVariants({ variant: local.variant, size: local.size }), local.class)}
      disabled={local.disabled || local.loading}
      {...rest}
    >
      {local.loading ? (
        <svg class="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        local.leftIcon
      )}
      {local.children}
      {local.rightIcon}
    </button>
  )
}

// Icon Button convenience component
export interface IconButtonProps extends Omit<ButtonProps, "children" | "leftIcon" | "rightIcon"> {
  icon: JSX.Element
  "aria-label": string
}

export const IconButton = (props: IconButtonProps) => {
  const [local, rest] = splitProps(props, ["icon", "size"])

  return (
    <Button size={local.size ?? "icon"} {...rest}>
      <span class={cn("flex items-center justify-center")}>{local.icon}</span>
    </Button>
  )
}

// Button Group
export interface ButtonGroupProps extends ParentProps {
  class?: string
  orientation?: "horizontal" | "vertical"
}

export const ButtonGroup = (props: ButtonGroupProps) => {
  return (
    <div
      class={cn(
        "inline-flex",
        props.orientation === "vertical" ? "flex-col" : "flex-row",
        "[&>button]:rounded-none",
        props.orientation === "vertical"
          ? "[&>button:first-child]:rounded-t-lg [&>button:last-child]:rounded-b-lg [&>button:not(:last-child)]:border-b-0"
          : "[&>button:first-child]:rounded-l-lg [&>button:last-child]:rounded-r-lg [&>button:not(:last-child)]:border-r-0",
        props.class,
      )}
    >
      {props.children}
    </div>
  )
}
