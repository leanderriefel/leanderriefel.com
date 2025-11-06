import { createStore } from "solid-js/store"
import { WindowProps } from "~/os/windows/window-manager"

export const [openApps, setOpenApps] = createStore<{
  apps: Array<WindowProps>
}>({ apps: [] })
