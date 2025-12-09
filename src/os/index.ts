import { createRoot, JSX, Signal } from "solid-js"

export abstract class App {
  abstract id: string
  abstract name: Signal<string> | string
  abstract icon: Signal<string> | string
  abstract description: Signal<string> | string
  abstract render: () => JSX.Element
  /**
   * Marks the app as protected from uninstall.
   * Defaults to false when not set on the subclass.
   */
  protectedApp?: boolean

  color?: Signal<string> | string
  defaultSize?:
    | Signal<{
        width: number
        height: number
      }>
    | {
        width: number
        height: number
      }

  dispose?: () => void

  static appId: string
  static appName: string
  static appIcon: string
  static appDescription: string
  static appColor?: string
  static appProtected?: boolean

  static getMetadata() {
    return {
      id: this.appId,
      name: this.appName,
      icon: this.appIcon,
      description: this.appDescription,
      color: this.appColor,
      protected: this.appProtected ?? false,
    }
  }
}

export interface OsWindow {
  id: string
  app: App
  position: {
    x: number
    y: number
  }
  size: {
    width: number
    height: number
  }
  display: "default" | "minimized" | "maximized"
}

export type AppClass = {
  new (): App
  appId: string
  appName: string
  appIcon: string
  appDescription: string
  appColor?: string
  appProtected?: boolean
  getMetadata(): {
    id: string
    name: string
    icon: string
    description: string
    color?: string
    protected?: boolean
  }
}

type GlobalWithAppRegistry = typeof globalThis & {
  __osAppRegistry?: Array<AppClass>
}

const getGlobalAppRegistry = () => {
  const globalObject = globalThis as GlobalWithAppRegistry
  if (!globalObject.__osAppRegistry) {
    globalObject.__osAppRegistry = []
  }
  return globalObject.__osAppRegistry
}

export const appRegistry: Array<AppClass> = getGlobalAppRegistry()

export const registerApp = (AppClass: AppClass) => {
  const existingIndex = appRegistry.findIndex((app) => app === AppClass || app.appName === AppClass.appName)

  if (existingIndex !== -1) {
    appRegistry[existingIndex] = AppClass
    return
  }

  appRegistry.push(AppClass)
}

export const getAllAppMetadata = () => {
  return appRegistry.map((AppClass) => AppClass.getMetadata())
}

export const createAppInstance = (AppClass: AppClass): App => {
  let app!: App
  createRoot((disposer) => {
    app = new AppClass()
    app.dispose = disposer
  })
  return app
}
