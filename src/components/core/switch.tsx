import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "~/os/utils"

const switchVariants = cva(
  "relative inline-flex shrink-0 cursor-pointer items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      size: {
        sm: "h-4 w-7",
        md: "h-5 w-9",
        lg: "h-6 w-11",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
)

const thumbVariants = cva(
  "pointer-events-none block rounded-full bg-foreground shadow-lg ring-0 transition-transform",
  {
    variants: {
      size: {
        sm: "size-3",
        md: "size-4",
        lg: "size-5",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
)

export interface SwitchProps extends VariantProps<typeof switchVariants> {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  class?: string
}

export const Switch = (props: SwitchProps) => {
  const size = () => props.size ?? "md"

  const getTranslateX = () => {
    switch (size()) {
      case "sm":
        return props.checked ? "translateX(12px)" : "translateX(2px)"
      case "lg":
        return props.checked ? "translateX(22px)" : "translateX(2px)"
      default:
        return props.checked ? "translateX(18px)" : "translateX(2px)"
    }
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={props.checked}
      class={cn(
        switchVariants({ size: size() }),
        props.checked ? "border-primary bg-primary" : "border-input bg-input",
        props.class,
      )}
      disabled={props.disabled}
      onClick={() => props.onCheckedChange?.(!props.checked)}
    >
      <span class={cn(thumbVariants({ size: size() }))} style={{ transform: getTranslateX() }} />
    </button>
  )
}
