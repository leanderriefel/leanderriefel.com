import { type ConfigColorMode } from "@kobalte/core"
import { createSignal } from "solid-js"
import { App } from "~/os"
import { ColorModeSelect } from "./components"

// eslint-disable-next-line solid/reactivity
const sharedColorModeSignal = createSignal<ConfigColorMode>("system")

export class SettingsApp extends App {
  static appId = "settings"
  static appName = "Settings"
  static appIcon = "settings"
  static appDescription = "Adjust system preferences like color mode."
  static appColor = "blue"
  static appProtected = true
  static supportedFileTypes: readonly string[] = []

  id = SettingsApp.appId
  name = SettingsApp.appName
  icon = SettingsApp.appIcon
  description = SettingsApp.appDescription
  color = SettingsApp.appColor

  constructor() {
    super()
  }

  onLaunch = () => {}

  render = () => {
    const [mode, setMode] = sharedColorModeSignal

    return (
      <div class="h-full space-y-4 overflow-auto bg-background p-6">
        <h2 class="text-lg font-bold text-foreground @sm:text-xl @md:text-2xl">Settings</h2>
        <div class="flex flex-col gap-4">
          <ColorModeSelect mode={mode} setMode={setMode} />
        </div>
      </div>
    )
  }
}
