import { onMount, type Accessor, type Setter } from "solid-js"
import { useColorMode, type ConfigColorMode, COLOR_MODE_STORAGE_KEY } from "@kobalte/core"
import { Select, SelectItem, SelectTrigger, SelectValue, SelectContent } from "~/components/core"

type ColorModeSelectProps = {
  mode: Accessor<ConfigColorMode>
  setMode: Setter<ConfigColorMode>
}

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)

export const ColorModeSelect = (props: ColorModeSelectProps) => {
  const { setColorMode } = useColorMode()

  onMount(() => {
    const value = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${COLOR_MODE_STORAGE_KEY}=`))
      ?.split("=")[1]

    if (value) {
      const decoded = decodeURIComponent(value) as ConfigColorMode
      if (["light", "dark", "system"].includes(decoded)) {
        props.setMode(decoded)
      }
    }
  })

  return (
    <Select<ConfigColorMode>
      options={["light", "dark", "system"]}
      placeholder="Select a color mode"
      value={props.mode()}
      onChange={(value) => {
        if (value !== null) {
          props.setMode(value)
          setColorMode(value)
        }
      }}
      itemComponent={(p) => (
        <SelectItem item={p.item} class="text-sm">
          {capitalize(p.item.rawValue)}
        </SelectItem>
      )}
    >
      <SelectTrigger>
        <SelectValue<string>>
          {(state) => (state.selectedOption() ? capitalize(state.selectedOption() as string) : "Select a color mode")}
        </SelectValue>
      </SelectTrigger>
      <SelectContent />
    </Select>
  )
}

