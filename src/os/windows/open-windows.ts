import { createStore } from "solid-js/store"
import { App, OsWindow, appRegistry, AppClass } from "~/os"
import { getValue, constrainToViewport } from "../utils/index"
import { focus, removeFromStack, Focusable } from "~/os/focus"
import { createEffect, createRoot } from "solid-js"

const STORAGE_KEY = "os_windows_state"

export const [openApps, setOpenApps] = createStore<{
  apps: Array<OsWindow>
}>({ apps: [] })

interface SavedWindow {
  id: string
  appName: string
  position: { x: number; y: number }
  size: { width: number; height: number }
  display: "default" | "minimized" | "maximized"
}

export const initWindowPersistence = () => {
  if (typeof window === "undefined") return

  // Load state
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const savedWindows: SavedWindow[] = JSON.parse(saved)
      const windows: OsWindow[] = []

      savedWindows.forEach((savedWin) => {
        const AppClass = appRegistry.find((a) => a.appName === savedWin.appName)
        if (AppClass) {
          const app = new AppClass()
          app.id = savedWin.id // Restore ID to keep consistency

          const { position, size } = constrainToViewport(savedWin.position, savedWin.size)

          windows.push({
            id: savedWin.id,
            app,
            display: savedWin.display,
            position,
            size,
          })
        }
      })

      if (windows.length > 0) {
        setOpenApps("apps", windows)
        // Re-initialize focus stack or other state if necessary
        // For now, just ensure they are in the store
      }
    }
  } catch (e) {
    console.error("Failed to load window state", e)
  }

  // Save state effect
  createRoot(() => {
    createEffect(() => {
      const stateToSave: SavedWindow[] = openApps.apps.map((w) => ({
        id: w.id,
        appName: (w.app.constructor as AppClass).appName,
        position: w.position,
        size: w.size,
        display: w.display,
      }))
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave))
    })
  })
}

export const openApp = (app: App) => {
  let position = { x: 100, y: 100 }
  let size = app.defaultSize ? getValue(app.defaultSize) : { width: 500, height: 500 }

  if (typeof window !== "undefined") {
    const constrained = constrainToViewport(position, size)
    position = constrained.position
    size = constrained.size
  }

  const newWindow: OsWindow = {
    id: app.id,
    app,
    display: "default",
    position,
    size,
  }

  setOpenApps("apps", openApps.apps.length, newWindow)

  focus(newWindow)
}

export const getWindow = (id: string) => openApps.apps.find((w) => w.id === id)

export const closeApp = (app: App | string) => {
  const appId = typeof app === "string" ? app : app.id
  setOpenApps("apps", (apps) => apps.filter((w) => w.id !== appId))
  removeFromStack(appId)
}

export const minimizeApp = (app: App | string) => {
  const appId = typeof app === "string" ? app : app.id
  setOpenApps("apps", (w) => w.id === appId, "display", "minimized")
  removeFromStack(appId)
}

export { getZIndex } from "~/os/focus"

export const bringToFront = (item: Focusable) => {
  const id = typeof item === "string" ? item : item.id
  setOpenApps(
    "apps",
    (w) => w.id === id,
    "display",
    (d) => (d === "minimized" ? "default" : d),
  )
  focus(item)
}
