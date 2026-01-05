import type { JSX } from "solid-js"
import type { OutputLine } from "../types"

interface TerminalOutputProps {
  line: OutputLine
}

export function TerminalOutput(props: TerminalOutputProps) {
  const colorClass = () => {
    switch (props.line.type) {
      case "input":
        return "text-tertiary"
      case "error":
        return "text-destructive"
      default:
        return "text-foreground"
    }
  }

  return <div class={`break-all whitespace-pre-wrap ${colorClass()}`}>{props.line.text}</div>
}

interface TerminalInputProps {
  value: () => string
  onInput: JSX.EventHandler<HTMLInputElement, InputEvent>
  onSubmit: () => void
}

export function TerminalInput(props: TerminalInputProps) {
  const handleKeyDown: JSX.EventHandler<HTMLInputElement, KeyboardEvent> = (e) => {
    if (e.key === "Enter") {
      e.preventDefault()
      props.onSubmit()
    }
  }

  return (
    <div class="flex items-center border-t border-border bg-background px-3 py-2">
      <span class="mr-2 text-tertiary">$</span>
      <input
        type="text"
        value={props.value()}
        onInput={props.onInput}
        onKeyDown={handleKeyDown}
        class="flex-1 bg-transparent font-mono text-tertiary outline-none placeholder:text-muted-foreground"
        placeholder="Type a command..."
        autofocus
      />
    </div>
  )
}
