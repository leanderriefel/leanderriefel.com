import { createRoot, JSX, Signal } from "solid-js"
import type { FsPath } from "~/os/fs"

export type LaunchContext = {
  filePath?: FsPath
  args?: Record<string, unknown>
}

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
  /**
   * Extensions (e.g. ".txt") that the app can open.
   * Use "*" to allow any extension.
   */
  supportedFileTypes?: readonly string[]
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
  launchContext?: LaunchContext

  onLaunch?(context: LaunchContext): void

  static appId: string
  static appName: string
  static appIcon: string
  static appDescription: string
  static appColor?: string
  static appProtected?: boolean
  static supportedFileTypes?: readonly string[]

  static getMetadata() {
    return {
      id: this.appId,
      name: this.appName,
      icon: this.appIcon,
      description: this.appDescription,
      color: this.appColor,
      protected: this.appProtected ?? false,
      supportedFileTypes: this.supportedFileTypes ?? [],
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
  supportedFileTypes?: readonly string[]
  getMetadata(): {
    id: string
    name: string
    icon: string
    description: string
    color?: string
    protected?: boolean
    supportedFileTypes: readonly string[]
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

export const createAppInstance = (AppClass: AppClass, context?: LaunchContext): App => {
  let app!: App
  createRoot((disposer) => {
    app = new AppClass()
    app.dispose = disposer
    if (context) {
      app.launchContext = context
      app.onLaunch?.(context)
    }
  })
  return app
}
