import { ParentProps } from "solid-js"
import { cn } from "~/os/utils"

export interface KbdProps extends ParentProps {
  class?: string
}

export const Kbd = (props: KbdProps) => {
  return (
    <kbd
      class={cn(
        "inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground",
        props.class,
      )}
    >
      {props.children}
    </kbd>
  )
}
