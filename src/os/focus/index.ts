import { createSignal, createSelector, createRoot, Accessor } from "solid-js"
import { createStore, SetStoreFunction } from "solid-js/store"

// Types
export type FocusableId = string
export type Focusable = FocusableId | { id: FocusableId }

const getId = (item: Focusable): string => (typeof item === "string" ? item : item.id)

// Focus State (wrapped in createRoot to avoid ownerless computations)
let focusedId: Accessor<string | null>
let setFocusedId: (value: string | null) => void
let isFocused: (id: string) => boolean
let focusStack: { stack: string[] }
let setFocusStack: SetStoreFunction<{ stack: string[] }>

createRoot(() => {
  const [_focusedId, _setFocusedId] = createSignal<string | null>(null)
  focusedId = _focusedId
  setFocusedId = _setFocusedId
  isFocused = createSelector(focusedId)

  const [_focusStack, _setFocusStack] = createStore<{ stack: string[] }>({ stack: [] })
  focusStack = _focusStack
  setFocusStack = _setFocusStack
})

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
