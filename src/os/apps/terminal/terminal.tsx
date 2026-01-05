import { createSignal, Signal, For } from "solid-js"
import { App, LaunchContext } from "~/os"
import type { OutputLine } from "./types"
import { TerminalOutput, TerminalInput } from "./components"
import { Interpreter, createInterpreter, type ExecutionContext } from "~/os/dash"
import { list, mkdir, remove, writeFile, readFile, stat, entryName, type FsPath, type FsEntry } from "~/os/fs"
import { getInstalledApps } from "~/os/fs/programs"
import { openAppById } from "~/os/windows/open-windows"
import { appSupportsExtension, getExtension } from "~/os/fs/file-associations"

export class TerminalApp extends App {
  static appId = "terminal"
  static appName = "Terminal"
  static appIcon = "terminal"
  static appDescription = "A Dash scripting terminal."
  static appColor = "green"
  static supportedFileTypes: readonly string[] = [".dash"]

  id = TerminalApp.appId
  name = TerminalApp.appName
  icon = TerminalApp.appIcon
  description = TerminalApp.appDescription
  color = TerminalApp.appColor

  defaultSize = { width: 600, height: 400 }

  private history!: Signal<OutputLine[]>
  private inputValue!: Signal<string>
  private containerRef!: HTMLDivElement | undefined
  private interpreter!: Interpreter
  private stopped: boolean = false
  private cwd: FsPath = "/"

  constructor() {
    super()
  }

  onLaunch = (context: LaunchContext) => {
    this.history = createSignal<OutputLine[]>([
      { type: "output", text: "Dash Shell v1.0 - Type 'help' for available commands." },
    ])
    this.inputValue = createSignal("")
    this.interpreter = createInterpreter()
    this.stopped = false

    // Register additional terminal-specific commands
    this.registerTerminalCommands()

    // If opened with a .dash file, run it
    if (context.filePath && context.filePath.endsWith(".dash")) {
      void this.runDashFile(context.filePath)
    }
  }

  private runDashFile = async (filePath: FsPath) => {
    const entry = await stat(filePath)
    if (!entry) {
      this.addOutput("error", `dash: ${filePath}: No such file or directory`)
      return
    }

    if (entry.type !== "file") {
      this.addOutput("error", `dash: ${filePath}: Not a file`)
      return
    }

    const content = await readFile(filePath, { as: "text" })
    if (content === undefined) {
      this.addOutput("error", `dash: ${filePath}: Could not read file`)
      return
    }

    this.addOutput("output", `Running ${filePath}...`)
    this.addOutput("output", "")

    const ctx = this.createExecutionContext()
    await this.interpreter.execute(content as string, ctx)
  }

  private resolvePath = (inputPath: string): FsPath => {
    const trimmed = inputPath.trim()
    if (!trimmed || trimmed === "~") return "/"
    if (trimmed.startsWith("/")) return trimmed as FsPath

    // Handle relative paths
    const segments = this.cwd === "/" ? [] : this.cwd.split("/").filter(Boolean)
    const parts = trimmed.split("/")

    for (const part of parts) {
      if (part === "." || part === "") continue
      if (part === "..") {
        segments.pop()
      } else {
        segments.push(part)
      }
    }

    return `/${segments.join("/")}` as FsPath
  }

  private formatEntry = (entry: FsEntry): string => {
    const name = entryName(entry.path)
    if (entry.type === "dir") return `${name}/`
    if (entry.type === "link") return `${name}@`
    return name
  }

  private registerTerminalCommands = () => {
    // pwd - print working directory
    this.interpreter.registerCommand("pwd", (_args, ctx) => {
      ctx.println(this.cwd)
    })

    // cd - change directory
    this.interpreter.registerCommand("cd", async (args, ctx) => {
      const target = args.trim()
      if (!target || target === "~") {
        this.cwd = "/"
        return
      }

      const resolved = this.resolvePath(target)
      const entry = await stat(resolved)

      if (!entry) {
        ctx.error(`cd: ${resolved}: No such file or directory`)
        return 1
      }

      if (entry.type !== "dir") {
        ctx.error(`cd: ${resolved}: Not a directory`)
        return 1
      }

      this.cwd = resolved
    })

    // ls - list directory contents
    this.interpreter.registerCommand("ls", async (args, ctx) => {
      const parts = args.trim().split(/\s+/).filter(Boolean)
      let showAll = false
      let showLong = false
      let targetPath = this.cwd

      for (const part of parts) {
        if (part === "-a" || part === "-la" || part === "-al") showAll = true
        if (part === "-l" || part === "-la" || part === "-al") showLong = true
        if (!part.startsWith("-")) targetPath = this.resolvePath(part)
      }

      try {
        const entries = await list(targetPath)
        const filtered = showAll ? entries : entries.filter((e) => !entryName(e.path).startsWith("."))

        if (filtered.length === 0) {
          return
        }

        if (showLong) {
          for (const entry of filtered) {
            const name = this.formatEntry(entry)
            const type = entry.type === "dir" ? "d" : entry.type === "link" ? "l" : "-"
            const size = entry.type === "file" ? String(entry.size).padStart(8) : "       -"
            ctx.println(`${type}  ${size}  ${name}`)
          }
        } else {
          const names = filtered.map((e) => this.formatEntry(e))
          ctx.println(names.join("  "))
        }
      } catch (err) {
        ctx.error(`ls: ${targetPath}: ${err instanceof Error ? err.message : "Error"}`)
        return 1
      }
    })

    // mkdir - create directory
    this.interpreter.registerCommand("mkdir", async (args, ctx) => {
      const parts = args.trim().split(/\s+/).filter(Boolean)
      let parents = false
      const dirs: string[] = []

      for (const part of parts) {
        if (part === "-p") {
          parents = true
        } else {
          dirs.push(part)
        }
      }

      if (dirs.length === 0) {
        ctx.error("mkdir: missing operand")
        return 1
      }

      for (const dir of dirs) {
        const resolved = this.resolvePath(dir)
        try {
          await mkdir(resolved, { parents })
        } catch (err) {
          ctx.error(`mkdir: ${resolved}: ${err instanceof Error ? err.message : "Error"}`)
          return 1
        }
      }
    })

    // touch - create empty file
    this.interpreter.registerCommand("touch", async (args, ctx) => {
      const files = args.trim().split(/\s+/).filter(Boolean)

      if (files.length === 0) {
        ctx.error("touch: missing file operand")
        return 1
      }

      for (const file of files) {
        const resolved = this.resolvePath(file)
        try {
          const entry = await stat(resolved)
          if (!entry) {
            await writeFile(resolved, "", { parents: false })
          }
          // If file exists, touch would update mtime but we don't need to do anything
        } catch (err) {
          ctx.error(`touch: ${resolved}: ${err instanceof Error ? err.message : "Error"}`)
          return 1
        }
      }
    })

    // rm - remove files and directories
    this.interpreter.registerCommand("rm", async (args, ctx) => {
      const parts = args.trim().split(/\s+/).filter(Boolean)
      let recursive = false
      let force = false
      const paths: string[] = []

      for (const part of parts) {
        if (part === "-r" || part === "-R" || part === "--recursive") {
          recursive = true
        } else if (part === "-f" || part === "--force") {
          force = true
        } else if (part === "-rf" || part === "-fr") {
          recursive = true
          force = true
        } else {
          paths.push(part)
        }
      }

      if (paths.length === 0) {
        ctx.error("rm: missing operand")
        return 1
      }

      for (const path of paths) {
        const resolved = this.resolvePath(path)
        try {
          const entry = await stat(resolved)
          if (!entry) {
            if (!force) {
              ctx.error(`rm: ${resolved}: No such file or directory`)
              return 1
            }
            continue
          }

          if (entry.type === "dir" && !recursive) {
            ctx.error(`rm: ${resolved}: Is a directory`)
            return 1
          }

          await remove(resolved, { recursive })
        } catch (err) {
          ctx.error(`rm: ${resolved}: ${err instanceof Error ? err.message : "Error"}`)
          return 1
        }
      }
    })

    // cat - display file contents
    this.interpreter.registerCommand("cat", async (args, ctx) => {
      const files = args.trim().split(/\s+/).filter(Boolean)

      if (files.length === 0) {
        ctx.error("cat: missing file operand")
        return 1
      }

      for (const file of files) {
        const resolved = this.resolvePath(file)
        try {
          const entry = await stat(resolved)
          if (!entry) {
            ctx.error(`cat: ${resolved}: No such file or directory`)
            return 1
          }

          if (entry.type === "dir") {
            ctx.error(`cat: ${resolved}: Is a directory`)
            return 1
          }

          const content = await readFile(resolved, { as: "text" })
          if (content !== undefined) {
            ctx.println(content as string)
          }
        } catch (err) {
          ctx.error(`cat: ${resolved}: ${err instanceof Error ? err.message : "Error"}`)
          return 1
        }
      }
    })

    // history - show command history
    this.interpreter.registerCommand("history", (_args, ctx) => {
      const history = this.history[0]()
      const commands = history.filter((line) => line.type === "input").map((line) => line.text.replace(/^> /, ""))

      if (commands.length === 0) {
        ctx.println("No command history.")
      } else {
        commands.forEach((cmd, i) => {
          ctx.println(`${String(i + 1).padStart(4)}  ${cmd}`)
        })
      }
    })

    // uptime - show session time
    const startTime = Date.now()
    this.interpreter.registerCommand("uptime", (_args, ctx) => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000)
      const mins = Math.floor(elapsed / 60)
      const secs = elapsed % 60
      ctx.println(`Session uptime: ${mins}m ${secs}s`)
    })

    // neofetch - fun system info
    this.interpreter.registerCommand("neofetch", (_args, ctx) => {
      ctx.println("")
      ctx.println("        ████████        guest@leander-os")
      ctx.println("      ██        ██      -----------")
      ctx.println("    ██    ████    ██    OS: Leander's OS 1.0")
      ctx.println("    ██  ████████  ██    Host: Browser")
      ctx.println("    ██  ████████  ██    Kernel: Dash Shell")
      ctx.println("    ██    ████    ██    Shell: dash 1.0")
      ctx.println("      ██        ██      Terminal: TerminalApp")
      ctx.println("        ████████        ")
      ctx.println("")
    })

    // run - execute a .dash script file
    this.interpreter.registerCommand("run", async (args, ctx) => {
      const file = args.trim()
      if (!file) {
        ctx.error("run: missing file operand")
        return 1
      }

      const resolved = this.resolvePath(file)
      const entry = await stat(resolved)

      if (!entry) {
        ctx.error(`run: ${resolved}: No such file or directory`)
        return 1
      }

      if (entry.type !== "file") {
        ctx.error(`run: ${resolved}: Not a file`)
        return 1
      }

      if (!resolved.endsWith(".dash")) {
        ctx.error(`run: ${resolved}: Not a .dash file`)
        return 1
      }

      const content = await readFile(resolved, { as: "text" })
      if (content === undefined) {
        ctx.error(`run: ${resolved}: Could not read file`)
        return 1
      }

      await this.interpreter.execute(content as string, ctx)
    })

    // open - open a file or directory with default app
    this.interpreter.registerCommand("open", async (args, ctx) => {
      const file = args.trim()
      if (!file) {
        ctx.error("open: missing file operand")
        return 1
      }

      const resolved = this.resolvePath(file)
      const entry = await stat(resolved)

      if (!entry) {
        ctx.error(`open: ${resolved}: No such file or directory`)
        return 1
      }

      if (entry.type === "dir") {
        openAppById("file-explorer", { context: { filePath: resolved } })
        return
      }

      // For .dash files, run them in this terminal
      if (resolved.endsWith(".dash")) {
        await this.runDashFile(resolved)
        return
      }

      // For other files, try to find an app that supports the extension
      const ext = getExtension(resolved)
      const apps = getInstalledApps()
      const supportingApp = apps.find((app) => appSupportsExtension(app, ext))

      if (supportingApp) {
        openAppById(supportingApp.appId, { context: { filePath: resolved } })
      } else {
        ctx.error(`open: ${resolved}: No application can open this file type`)
        return 1
      }
    })

    // Register commands for each installed app (program ID opens the app)
    this.registerProgramCommands()
  }

  private registerProgramCommands = () => {
    const apps = getInstalledApps()

    for (const appClass of apps) {
      const appId = appClass.appId

      // Skip registering terminal as a command (would be recursive)
      if (appId === "terminal") continue

      // Register command using the app ID
      this.interpreter.registerCommand(appId, async (args, ctx) => {
        const filePath = args.trim()

        // If no file argument, just open the app
        if (!filePath) {
          const success = openAppById(appId)
          if (!success) {
            ctx.error(`${appId}: Application not found`)
            return 1
          }
          return
        }

        // Resolve the file path
        const resolved = this.resolvePath(filePath)
        const entry = await stat(resolved)

        if (!entry) {
          ctx.error(`${appId}: ${resolved}: No such file or directory`)
          return 1
        }

        // Check if the app supports this file type
        const ext = getExtension(resolved)
        if (ext && !appSupportsExtension(appClass, ext)) {
          ctx.error(`${appId}: Cannot open ${ext} files`)
          return 1
        }

        // Open the app with the file context
        const success = openAppById(appId, { context: { filePath: resolved } })
        if (!success) {
          ctx.error(`${appId}: Application not found`)
          return 1
        }
      })
    }
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

  private createExecutionContext = (): ExecutionContext => {
    return {
      print: (text: string) => {
        // For print without newline, we append to the last output line or create new
        const history = this.history[0]()
        if (history.length > 0 && history[history.length - 1].type === "output") {
          this.history[1]((prev) => {
            const newHistory = [...prev]
            newHistory[newHistory.length - 1] = {
              ...newHistory[newHistory.length - 1],
              text: newHistory[newHistory.length - 1].text + text,
            }
            return newHistory
          })
        } else {
          this.addOutput("output", text)
        }
      },
      println: (text: string) => {
        this.addOutput("output", text)
      },
      error: (text: string) => {
        this.addOutput("error", text)
      },
      clear: () => {
        this.history[1]([])
      },
      getVariables: () => this.interpreter.getVariables(),
      setVariable: (name, value) => this.interpreter.setVariable(name, value),
      stop: () => {
        this.stopped = true
        this.interpreter.stop()
      },
      isStopped: () => this.stopped,
    }
  }

  private processCommand = async (input: string) => {
    const trimmed = input.trim()
    if (!trimmed) return

    this.addOutput("input", `> ${trimmed}`)
    this.stopped = false

    const context = this.createExecutionContext()
    await this.interpreter.execute(trimmed, context)
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
