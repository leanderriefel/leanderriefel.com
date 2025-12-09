import { Signal } from "solid-js"
import { twMerge } from "tailwind-merge"
import { cx } from "class-variance-authority"
import { ClassValue } from "class-variance-authority/types"

export const cn = (...inputs: ClassValue[]) => twMerge(cx(inputs))

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

export const constrainToViewport = (
  position: { x: number; y: number },
  size: { width: number; height: number },
  viewport: { width: number; height: number } = {
    width: window.innerWidth,
    height: window.innerHeight,
  },
) => {
  let { x, y } = position
  let { width, height } = size

  // Ensure size is not larger than viewport
  if (width > viewport.width) {
    width = viewport.width
    x = 0
  }
  if (height > viewport.height) {
    height = viewport.height
    y = 0
  }

  // Constrain position
  if (x < 0) x = 0
  if (y < 0) y = 0
  if (x + width > viewport.width) x = viewport.width - width
  if (y + height > viewport.height) y = viewport.height - height

  return {
    position: { x, y },
    size: { width, height },
  }
}

export * from "./fuzzy-search"
