import { createSignal, createSelector, createRoot, Accessor, Setter } from "solid-js"
import { createStore, SetStoreFunction } from "solid-js/store"

// Types
export type FocusableId = string
export type Focusable = FocusableId | { id: FocusableId }

const getId = (item: Focusable): string => (typeof item === "string" ? item : item.id)

type FocusState = {
  focusedId: Accessor<string | null>
  setFocusedId: Setter<string | null>
  isFocused: (id: string) => boolean
  focusStack: { stack: string[] }
  setFocusStack: SetStoreFunction<{ stack: string[] }>
}

// HMR-safe state getter
const getFocusState = (): FocusState => {
  if (!globalThis.__osFocusState) {
    globalThis.__osFocusState = createRoot(() => {
      const [focusedId, setFocusedId] = createSignal<string | null>(null)
      const isFocused = createSelector(focusedId)
      const [focusStack, setFocusStack] = createStore<{ stack: string[] }>({ stack: [] })

      return { focusedId, setFocusedId, isFocused, focusStack, setFocusStack }
    })
  }
  return globalThis.__osFocusState
}

const focusState = getFocusState()

const { focusedId, setFocusedId, isFocused, focusStack, setFocusStack } = focusState

export { focusedId, setFocusedId, isFocused, focusStack, setFocusStack }

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
