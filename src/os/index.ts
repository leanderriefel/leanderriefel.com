import { JSX, Signal } from "solid-js"

export abstract class App {
  id: string
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

  static appName: string
  static appIcon: string
  static appColor?: string

  constructor() {
    this.id = crypto.randomUUID()
  }

  static getMetadata() {
    return {
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
  appName: string
  appIcon: string
  appColor?: string
  getMetadata(): {
    name: string
    icon: string
    color?: string
  }
}

export const appRegistry: Array<AppClass> = []

export const registerApp = (AppClass: AppClass) => {
  if (appRegistry.some((app) => app === AppClass)) return
  appRegistry.push(AppClass)
}

export const getAllAppMetadata = () => {
  return appRegistry.map((AppClass) => AppClass.getMetadata())
}

export const createAppInstance = (AppClass: AppClass): App => {
  return new AppClass()
}
