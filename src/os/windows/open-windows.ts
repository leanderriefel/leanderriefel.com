import { createStore, SetStoreFunction } from "solid-js/store"
import { App, OsWindow, AppClass, createAppInstance, LaunchContext } from "~/os"
import { getValue, constrainToViewport } from "../utils/index"
import { focus, removeFromStack, Focusable } from "~/os/focus"
import { Accessor, createEffect, createRoot, createSignal, on, Setter } from "solid-js"
import { read, StructuredCloneable, write } from "~/os/registry"
import { findInstalledAppByNameOrId, waitForInstalledApps } from "~/os/fs/programs"

const WINDOW_STATE_REGISTRY_KEY = "os_windows_state"
const LAST_GEOMETRY_REGISTRY_KEY = "os_last_window_geometry"

type OpenAppOptions = {
  position?: { x: number; y: number }
  size?: { width: number; height: number }
  context?: LaunchContext
}

type WindowGeometry = {
  position: { x: number; y: number }
  size: { width: number; height: number }
}

// HMR-safe state getters
const getOpenAppsStore = (): [{ apps: Array<OsWindow> }, SetStoreFunction<{ apps: Array<OsWindow> }>] => {
  if (!globalThis.__osOpenAppsStore) {
    globalThis.__osOpenAppsStore = createStore<{ apps: Array<OsWindow> }>({ apps: [] })
  }
  return globalThis.__osOpenAppsStore
}

const getHydrationReadySignal = (): [Accessor<boolean>, Setter<boolean>] => {
  if (!globalThis.__osHydrationReady) {
    globalThis.__osHydrationReady = createSignal(false)
  }
  return globalThis.__osHydrationReady
}

const getWindowsHydrationPromise = (): Promise<void> | null => {
  return globalThis.__osWindowsHydrationPromise ?? null
}

const setWindowsHydrationPromise = (promise: Promise<void> | null) => {
  globalThis.__osWindowsHydrationPromise = promise
}

const getLastWindowGeometry = (): Record<string, WindowGeometry> => {
  if (!globalThis.__osLastWindowGeometry) {
    globalThis.__osLastWindowGeometry = {}
  }
  return globalThis.__osLastWindowGeometry
}

const getHasLoadedLastGeometry = (): boolean => {
  return globalThis.__osHasLoadedLastGeometry ?? false
}

const setHasLoadedLastGeometry = (value: boolean) => {
  globalThis.__osHasLoadedLastGeometry = value
}

export const [openApps, setOpenApps] = getOpenAppsStore()
const [hydrationReady, setHydrationReady] = getHydrationReadySignal()

let lastGeometryLoadPromise: Promise<void> | null = null

const getAppName = (app: App) => (app.constructor as AppClass).appName

const ensureLastWindowGeometryLoaded = async () => {
  if (getHasLoadedLastGeometry() || typeof window === "undefined") return

  if (!lastGeometryLoadPromise) {
    lastGeometryLoadPromise = (async () => {
      try {
        const saved = await read<Record<string, WindowGeometry>>(LAST_GEOMETRY_REGISTRY_KEY)
        if (saved) {
          Object.assign(getLastWindowGeometry(), saved)
        }
      } catch (e) {
        console.error("Failed to load last window geometry", e)
      } finally {
        setHasLoadedLastGeometry(true)
      }
    })()
  }

  await lastGeometryLoadPromise
}

const persistLastWindowGeometry = async () => {
  if (typeof window === "undefined") return
  try {
    await write(LAST_GEOMETRY_REGISTRY_KEY, getLastWindowGeometry())
  } catch (e) {
    console.error("Failed to save last window geometry", e)
  }
}

const rememberWindowGeometry = async (appName: string, geometry: WindowGeometry) => {
  try {
    await ensureLastWindowGeometryLoaded()
    getLastWindowGeometry()[appName] = geometry
    await persistLastWindowGeometry()
  } catch (e) {
    console.error("Failed to remember window geometry", e)
  }
}

const getRememberedWindowGeometry = (appName: string) => getLastWindowGeometry()[appName]

interface SavedWindow {
  id: string
  appId?: string
  appName: string
  position: { x: number; y: number }
  size: { width: number; height: number }
  display: "default" | "minimized" | "maximized"
  [key: string]: StructuredCloneable
}

const hydrateWindowsFromRegistry = async () => {
  if (typeof window === "undefined") return

  await waitForInstalledApps()
  await ensureLastWindowGeometryLoaded()

  try {
    const savedWindows = await read<SavedWindow[]>(WINDOW_STATE_REGISTRY_KEY)
    if (savedWindows && savedWindows.length > 0) {
      const windows: OsWindow[] = []

      savedWindows.forEach((savedWin) => {
        const FoundAppClass = findInstalledAppByNameOrId(savedWin.appId ?? savedWin.appName)
        if (!FoundAppClass) return

        const app = createAppInstance(FoundAppClass)
        app.id = savedWin.id

        const { position, size } = constrainToViewport(savedWin.position, savedWin.size)

        windows.push({
          id: savedWin.id,
          app,
          display: savedWin.display,
          position,
          size,
        })
      })

      if (windows.length > 0) {
        setOpenApps("apps", windows)
      }
      setHydrationReady(true)
      return
    }
  } catch (e) {
    console.error("Failed to load window state", e)
  }

  setHydrationReady(true)
}

const ensureWindowHydration = () => {
  let promise = getWindowsHydrationPromise()
  if (!promise) {
    promise = hydrateWindowsFromRegistry()
    setWindowsHydrationPromise(promise)
  }
  return promise
}

export const waitForWindowHydration = async () => {
  if (typeof window === "undefined") return
  try {
    await ensureWindowHydration()
  } catch (e) {
    console.error("Failed to hydrate windows", e)
  }
}

const serializeWindowState = (): SavedWindow[] => {
  const apps = openApps.apps
  const result: SavedWindow[] = []
  for (let i = 0; i < apps.length; i++) {
    const w = apps[i]
    const appClass = w.app.constructor as AppClass
    result.push({
      id: w.id,
      appId: appClass.appId,
      appName: appClass.appName,
      position: { x: w.position.x, y: w.position.y },
      size: { width: w.size.width, height: w.size.height },
      display: w.display,
    })
  }
  return result
}

export const initWindowPersistence = () => {
  if (typeof window === "undefined") return

  void ensureWindowHydration()

  createRoot(() => {
    createEffect(
      on([hydrationReady, serializeWindowState], ([ready, state]) => {
        if (!ready) return

        void write(WINDOW_STATE_REGISTRY_KEY, state).catch((e) => {
          console.error("Failed to save window state", e)
        })
      }),
    )
  })
}

export const openApp = (app: App, options?: OpenAppOptions) => {
  void (async () => {
    await ensureLastWindowGeometryLoaded()

    const appName = getAppName(app)
    const rememberedGeometry = getRememberedWindowGeometry(appName)

    let size =
      options?.size ??
      rememberedGeometry?.size ??
      (app.defaultSize ? getValue(app.defaultSize) : { width: 500, height: 500 })
    let position = options?.position ?? rememberedGeometry?.position ?? { x: 100, y: 100 }

    if (typeof window !== "undefined") {
      const constrained = constrainToViewport(position, size)
      position = constrained.position
      size = constrained.size
    }

    const newWindow: OsWindow = {
      id: crypto.randomUUID(),
      app,
      display: "default",
      position,
      size,
    }

    setOpenApps("apps", openApps.apps.length, newWindow)

    focus(newWindow)
  })()
}

export const getWindow = (id: string) => openApps.apps.find((w) => w.id === id)

export const closeApp = (app: App | string) => {
  const appId = typeof app === "string" ? app : app.id
  const windowToClose = openApps.apps.find((w) => w.id === appId)
  if (windowToClose) {
    void rememberWindowGeometry(getAppName(windowToClose.app), {
      position: { x: windowToClose.position.x, y: windowToClose.position.y },
      size: { width: windowToClose.size.width, height: windowToClose.size.height },
    })
    windowToClose.app.dispose?.()
  }

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

export const openAppById = (
  appId: string,
  options?: Omit<OpenAppOptions, "context"> & { context?: LaunchContext },
): boolean => {
  const AppClass = findInstalledAppByNameOrId(appId)
  if (!AppClass) return false

  const app = createAppInstance(AppClass, options?.context)
  openApp(app, options)
  return true
}
