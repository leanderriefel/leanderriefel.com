import { Signal, createSignal, Show } from "solid-js"
import { App } from "~/os"
import { Separator } from "~/components/core"
import { BadgeRow, CounterCard, ControlsRow, ButtonGallery } from "./components"

export class TestApp extends App {
  static appId = "test"
  static appName = "Test"
  static appIcon = "test"
  static appDescription = "Playground for UI components and interactions."
  static appColor = "red"
  static supportedFileTypes: readonly string[] = []

  id = TestApp.appId
  name = TestApp.appName
  icon = TestApp.appIcon
  description = TestApp.appDescription
  color = TestApp.appColor

  private count!: Signal<number>
  private message!: Signal<string>
  private isVisible!: Signal<boolean>
  private dialogOpen!: Signal<boolean>
  private darkMode!: Signal<boolean>

  constructor() {
    super()
  }

  onLaunch = () => {
    this.count = createSignal(0)
    this.message = createSignal("UI Components Demo")
    this.isVisible = createSignal(true)
    this.dialogOpen = createSignal(false)
    this.darkMode = createSignal(true)
  }

  render = () => {
    const [count, setCount] = this.count
    const [message] = this.message
    const [isVisible, setIsVisible] = this.isVisible
    const [dialogOpen, setDialogOpen] = this.dialogOpen
    const [darkMode, setDarkMode] = this.darkMode

    return (
      <div class="h-full space-y-4 overflow-auto p-6">
        <h2 class="text-lg font-bold text-foreground @sm:text-xl @md:text-2xl">{message()}</h2>

        <BadgeRow />

        <Separator />

        <Show when={isVisible()}>
          <CounterCard count={count} setCount={setCount} />
        </Show>

        <ControlsRow
          isVisible={isVisible}
          setIsVisible={setIsVisible}
          dialogOpen={dialogOpen}
          setDialogOpen={setDialogOpen}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
        />

        <Separator />

        <ButtonGallery />
      </div>
    )
  }
}
