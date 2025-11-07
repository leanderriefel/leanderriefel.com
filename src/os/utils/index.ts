import { Signal } from "solid-js"

const isSignal = <T>(value: T | Signal<T>): value is Signal<T> => {
  return (
    Array.isArray(value) &&
    value.length >= 1 &&
    typeof value[0] === "function" &&
    (value[0] as () => unknown).length === 0
  )
}

export const getValue = <T>(value: T | Signal<T>): T => {
  return isSignal(value) ? (value[0] as () => T)() : value
}
