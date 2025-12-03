import { JSX, Signal } from "solid-js"

export abstract class App {
  abstract id: string
  abstract name: Signal<string> | string
  abstract icon: Signal<string> | string
  abstract render: () => JSX.Element

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

  static appId: string
  static appName: string
  static appIcon: string
  static appColor?: string

  static getMetadata() {
    return {
      id: this.appId,
      name: this.appName,
      icon: this.appIcon,
      color: this.appColor,
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
  appColor?: string
  getMetadata(): {
    id: string
    name: string
    icon: string
    color?: string
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
  return new AppClass()
}
