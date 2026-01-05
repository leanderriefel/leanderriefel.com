import { createSignal, Signal, For } from "solid-js"
import { App } from "~/os"
import type { OutputLine } from "./types"
import { TerminalOutput, TerminalInput } from "./components"

export class TerminalApp extends App {
  static appId = "terminal"
  static appName = "Terminal"
  static appIcon = "terminal"
  static appDescription = "A simple command-line interface."
  static appColor = "green"
  static supportedFileTypes: readonly string[] = []

  id = TerminalApp.appId
  name = TerminalApp.appName
  icon = TerminalApp.appIcon
  description = TerminalApp.appDescription
  color = TerminalApp.appColor

  defaultSize = { width: 600, height: 400 }

  private history!: Signal<OutputLine[]>
  private inputValue!: Signal<string>
  private containerRef!: HTMLDivElement | undefined

  constructor() {
    super()
  }

  onLaunch = () => {
    this.history = createSignal<OutputLine[]>([
      { type: "output", text: "Welcome to Terminal. Type 'help' for available commands." },
    ])
    this.inputValue = createSignal("")
  }

  private scrollToBottom = () => {
    if (this.containerRef) {
      this.containerRef.scrollTop = this.containerRef.scrollHeight
    }
  }

  private addOutput = (type: OutputLine["type"], text: string) => {
    this.history[1]((prev) => [...prev, { type, text }])
    setTimeout(this.scrollToBottom, 0)
  }

  private processCommand = (input: string) => {
    const trimmed = input.trim()
    if (!trimmed) return

    this.addOutput("input", `> ${trimmed}`)

    const [cmd, ...args] = trimmed.split(" ")
    const command = cmd.toLowerCase()

    switch (command) {
      case "help":
        this.addOutput("output", "Available commands:")
        this.addOutput("output", "  help    - Show this help message")
        this.addOutput("output", "  echo    - Print the provided text")
        this.addOutput("output", "  clear   - Clear the terminal")
        this.addOutput("output", "  date    - Show current date and time")
        this.addOutput("output", "  whoami  - Display current user")
        break

      case "echo":
        this.addOutput("output", args.join(" ") || "")
        break

      case "clear":
        this.history[1]([])
        break

      case "date":
        this.addOutput("output", new Date().toLocaleString())
        break

      case "whoami":
        this.addOutput("output", "guest")
        break

      default:
        this.addOutput("error", `Unknown command: ${command}. Type 'help' for available commands.`)
    }
  }

  private handleSubmit = () => {
    const value = this.inputValue[0]()
    this.processCommand(value)
    this.inputValue[1]("")
  }

  render = () => {
    return (
      <div class="flex h-full flex-col bg-background font-mono text-sm">
        <div ref={(el) => (this.containerRef = el)} class="flex-1 overflow-auto p-3">
          <For each={this.history[0]()}>{(line) => <TerminalOutput line={line} />}</For>
        </div>

        <TerminalInput
          value={this.inputValue[0]}
          onInput={(e: InputEvent & { currentTarget: HTMLInputElement }) => this.inputValue[1](e.currentTarget.value)}
          onSubmit={this.handleSubmit}
        />
      </div>
    )
  }
}
