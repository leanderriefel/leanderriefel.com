import { useColorMode, type ConfigColorMode, COLOR_MODE_STORAGE_KEY } from "@kobalte/core"
import { createSignal, onMount } from "solid-js"
import { Select, SelectItem, SelectTrigger, SelectValue, SelectContent } from "~/components/core"
import { App } from "~/os"

// eslint-disable-next-line solid/reactivity
const sharedColorModeSignal = createSignal<ConfigColorMode>("system")

export class SettingsApp extends App {
  static appId = "settings"
  static appName = "Settings"
  static appIcon = "settings"
  static appDescription = "Adjust system preferences like color mode."
  static appColor = "blue"
  static appProtected = true

  id = SettingsApp.appId
  name = SettingsApp.appName
  icon = SettingsApp.appIcon
  description = SettingsApp.appDescription
  color = SettingsApp.appColor

  constructor() {
    super()
  }

  private captalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)

  render = () => {
    const { setColorMode } = useColorMode()
    const [mode, setMode] = sharedColorModeSignal

    onMount(() => {
      const value = document.cookie
        .split("; ")
        .find((row) => row.startsWith(`${COLOR_MODE_STORAGE_KEY}=`))
        ?.split("=")[1]

      if (value) {
        const decoded = decodeURIComponent(value) as ConfigColorMode
        if (["light", "dark", "system"].includes(decoded)) {
          setMode(decoded)
        }
      }
    })

    return (
      <div class="h-full space-y-4 overflow-auto p-6">
        <h2 class="text-lg font-bold text-foreground @sm:text-xl @md:text-2xl">Settings</h2>
        <div class="flex flex-col gap-4">
          <Select<ConfigColorMode>
            options={["light", "dark", "system"]}
            placeholder="Select a color mode"
            value={mode()}
            onChange={(value) => {
              if (value !== null) {
                setMode(value)
                setColorMode(value)
              }
            }}
            itemComponent={(props) => (
              <SelectItem item={props.item} class="text-sm">
                {this.captalize(props.item.rawValue)}
              </SelectItem>
            )}
          >
            <SelectTrigger>
              <SelectValue<string>>
                {(state) =>
                  state.selectedOption() ? this.captalize(state.selectedOption() as string) : "Select a color mode"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent />
          </Select>
        </div>
      </div>
    )
  }
}
