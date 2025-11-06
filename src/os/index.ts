import { JSX, Signal } from "solid-js"

export interface App {
  name: Signal<string> | string
  icon: Signal<string> | string
  color: Signal<string> | string
  display: Signal<"default" | "minimized" | "maximized" | "fullscreen">
  render: () => JSX.Element
}
