import { Switch as SwitchPrimitive, type SwitchRootProps as SwitchPrimitiveRootProps } from "@kobalte/core/switch"
import { cva, type VariantProps } from "class-variance-authority"
import { splitProps } from "solid-js"
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

const thumbTranslate: Record<NonNullable<VariantProps<typeof switchVariants>["size"]>, { on: string; off: string }> = {
  sm: { on: "translateX(12px)", off: "translateX(2px)" },
  md: { on: "translateX(18px)", off: "translateX(2px)" },
  lg: { on: "translateX(22px)", off: "translateX(2px)" },
}

export interface SwitchProps
  extends Omit<SwitchPrimitiveRootProps, "class" | "onChange">,
    VariantProps<typeof switchVariants> {
  class?: string
  onCheckedChange?: SwitchPrimitiveRootProps["onChange"]
}

export const Switch = (props: SwitchProps) => {
  const [local, rest] = splitProps(props, ["class", "size", "checked", "defaultChecked", "onCheckedChange", "disabled"])
  const size = () => local.size ?? "md"

  const translate = (checked: boolean) => {
    const offsets = thumbTranslate[size()]
    return checked ? offsets.on : offsets.off
  }

  return (
    <SwitchPrimitive
      checked={local.checked}
      defaultChecked={local.defaultChecked}
      onChange={local.onCheckedChange}
      disabled={local.disabled}
      class={cn(
        switchVariants({ size: size() }),
        "border-input bg-input data-checked:border-primary data-checked:bg-primary",
        local.class,
      )}
      {...rest}
    >
      {(state) => (
        <>
          <SwitchPrimitive.Input class="sr-only" />
          <SwitchPrimitive.Control class="flex h-full w-full items-center">
            <SwitchPrimitive.Thumb
              class={cn(thumbVariants({ size: size() }))}
              style={{ transform: translate(state.checked()) }}
            />
          </SwitchPrimitive.Control>
        </>
      )}
    </SwitchPrimitive>
  )
}
