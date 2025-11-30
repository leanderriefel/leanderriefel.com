import { createSignal, createSelector } from "solid-js"
import { createStore } from "solid-js/store"

// Types
export type FocusableId = string
export type Focusable = FocusableId | { id: FocusableId }

const getId = (item: Focusable): string => (typeof item === "string" ? item : item.id)

// Focus State
export const [focusedId, setFocusedId] = createSignal<string | null>(null)
export const isFocused = createSelector(focusedId)

// Z-Index / Focus Stack Management
export const [focusStack, setFocusStack] = createStore<{
  stack: string[]
}>({ stack: [] })

export const focus = (item: Focusable) => {
  const id = getId(item)
  setFocusStack("stack", (s) => {
    const filtered = s.filter((i) => i !== id)
    return [...filtered, id]
  })
  setFocusedId(id)
}

export const blur = (item: Focusable) => {
  const id = getId(item)
  if (focusedId() === id) {
    setFocusedId(null)
  }
}

export const removeFromStack = (item: Focusable) => {
  const id = getId(item)
  setFocusStack("stack", (s) => s.filter((i) => i !== id))
  if (focusedId() === id) {
    // Focus the next top-most item
    const last = focusStack.stack[focusStack.stack.length - 1]
    setFocusedId(last || null)
  }
}

export const getZIndex = (item: Focusable, baseIndex = 10) => {
  const id = getId(item)
  const index = focusStack.stack.indexOf(id)
  return index === -1 ? baseIndex : baseIndex + index + 1
}
