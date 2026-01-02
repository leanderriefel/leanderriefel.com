import { JSX, Show, splitProps } from "solid-js"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "~/os/utils"

const inputVariants = cva(
  "w-full rounded-lg border bg-transparent px-3 text-sm text-foreground transition-all placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border-input bg-input/20 focus:border-ring focus:ring-2 focus:ring-ring/20",
        ghost: "border-transparent hover:bg-accent focus:bg-accent focus:border-input",
        outline: "border-input focus:border-ring",
      },
      inputSize: {
        sm: "h-8 text-xs",
        md: "h-9",
        lg: "h-10 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      inputSize: "md",
    },
  },
)

export interface InputProps
  extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "size">, VariantProps<typeof inputVariants> {
  class?: string
}

export const Input = (props: InputProps) => {
  const [local, rest] = splitProps(props, ["class", "variant", "inputSize"])

  return (
    <input class={cn(inputVariants({ variant: local.variant, inputSize: local.inputSize }), local.class)} {...rest} />
  )
}

// Textarea
const textareaVariants = cva(
  "w-full min-h-[80px] rounded-lg border bg-transparent px-3 py-2 text-sm text-foreground transition-all placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 resize-none",
  {
    variants: {
      variant: {
        default: "border-input bg-input/20 focus:border-ring focus:ring-2 focus:ring-ring/20",
        ghost: "border-transparent hover:bg-accent focus:bg-accent focus:border-input",
        outline: "border-input focus:border-ring",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

export interface TextareaProps
  extends JSX.TextareaHTMLAttributes<HTMLTextAreaElement>, VariantProps<typeof textareaVariants> {
  class?: string
}

export const Textarea = (props: TextareaProps) => {
  const [local, rest] = splitProps(props, ["class", "variant"])

  return <textarea class={cn(textareaVariants({ variant: local.variant }), local.class)} {...rest} />
}

// Input with label wrapper
export interface FormFieldProps {
  label?: string
  error?: string
  hint?: string
  class?: string
  children: JSX.Element
  inputId?: string
}

export const FormField = (props: FormFieldProps) => {
  return (
    <div class={cn("flex flex-col gap-1.5", props.class)}>
      {props.label && (
        <label for={props.inputId} class="text-xs font-medium text-muted-foreground">
          {props.label}
        </label>
      )}
      {props.children}
      <Show when={props.hint && !props.error}>
        <p class="text-xs text-muted-foreground">{props.hint}</p>
      </Show>
      <Show when={props.error}>
        <p class="text-xs text-destructive">{props.error}</p>
      </Show>
    </div>
  )
}
