import { createSignal } from "solid-js"
import { createStore } from "solid-js/store"
import { App } from "~/os"
import { WindowProps } from "~/os/windows/window-manager"
import { getValue } from "../utils/index"

export const [openApps, setOpenApps] = createStore<{
  apps: Array<WindowProps>
}>({ apps: [] })

export const openApp = (app: App) => {
  setOpenApps("apps", openApps.apps.length, {
    app,
    // eslint-disable-next-line solid/reactivity
    display: createSignal<"default" | "minimized" | "maximized" | "fullscreen">("default"),
    // eslint-disable-next-line solid/reactivity
    position: createSignal({ x: 100, y: 100 }),
    // eslint-disable-next-line solid/reactivity
    size: createSignal(app.defaultSize ? getValue(app.defaultSize) : { width: 500, height: 500 }),
  })

  bringToFront(app.id)
}

export const closeApp = (app: App | string) => {
  const appId = typeof app === "string" ? app : app.id
  setOpenApps("apps", (apps) => apps.filter((app) => app.app.id !== appId))
}

export const [zIndexStack, setZIndexStack] = createStore<{
  stack: Array<string>
}>({ stack: [] })

export const bringToFront = (appId: string) => {
  setZIndexStack("stack", (stack) => {
    const filtered = stack.filter((id) => id !== appId)
    return [...filtered, appId]
  })
}

export const getZIndex = (appId: string) => zIndexStack.stack.indexOf(appId) + 1
