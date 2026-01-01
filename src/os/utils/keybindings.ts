import { onCleanup, onMount } from "solid-js"

export type KeyModifiers = {
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  meta?: boolean
}

export type KeyBinding = {
  key: string
  modifiers?: KeyModifiers
  handler: (event: KeyboardEvent) => void
  preventDefault?: boolean
}

export type KeyBindingConfig = {
  /** The key to bind (e.g., "c", "v", "Delete", "Escape") */
  key: string
  /** Modifier keys required */
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  meta?: boolean
  /** Handler function called when the key combination is pressed */
  handler: (event: KeyboardEvent) => void
  /** Whether to prevent the default browser action (default: true) */
  preventDefault?: boolean
}

/**
 * Normalizes a key string to handle cross-platform differences
 */
const normalizeKey = (key: string): string => {
  return key.toLowerCase()
}

/**
 * Checks if the event matches the keybinding configuration
 */
const matchesBinding = (event: KeyboardEvent, binding: KeyBindingConfig): boolean => {
  const eventKey = normalizeKey(event.key)
  const bindingKey = normalizeKey(binding.key)

  if (eventKey !== bindingKey) return false

  // Check modifiers - treat ctrl and meta as interchangeable for cross-platform support
  const ctrlOrMeta = event.ctrlKey || event.metaKey
  const wantsCtrlOrMeta = binding.ctrl || binding.meta

  if (wantsCtrlOrMeta && !ctrlOrMeta) return false
  if (!wantsCtrlOrMeta && ctrlOrMeta) return false

  if (binding.shift && !event.shiftKey) return false
  if (!binding.shift && event.shiftKey) return false

  if (binding.alt && !event.altKey) return false
  if (!binding.alt && event.altKey) return false

  return true
}

/**
 * Creates a keybinding handler for a specific element or the document
 * @param bindings Array of keybinding configurations
 * @param target Optional target element (defaults to document)
 * @returns Cleanup function
 */
export const createKeybindings = (bindings: KeyBindingConfig[], target: EventTarget = document): (() => void) => {
  const handler = (event: KeyboardEvent) => {
    // Don't handle if user is typing in an input/textarea
    const activeElement = document.activeElement
    if (
      activeElement instanceof HTMLInputElement ||
      activeElement instanceof HTMLTextAreaElement ||
      (activeElement as HTMLElement)?.isContentEditable
    ) {
      return
    }

    for (const binding of bindings) {
      if (matchesBinding(event, binding)) {
        if (binding.preventDefault !== false) {
          event.preventDefault()
        }
        binding.handler(event)
        break
      }
    }
  }

  target.addEventListener("keydown", handler as EventListener)

  return () => {
    target.removeEventListener("keydown", handler as EventListener)
  }
}

/**
 * SolidJS hook for keybindings that automatically cleans up on unmount
 * @param bindings Array of keybinding configurations
 * @param target Optional target element (defaults to document)
 */
export const useKeybindings = (
  bindings: () => KeyBindingConfig[],
  target: () => EventTarget = () => document,
): void => {
  onMount(() => {
    const cleanup = createKeybindings(bindings(), target())
    onCleanup(cleanup)
  })
}

/**
 * Creates a scoped keybinding handler that only works when the element is focused
 * or contains the focused element
 * @param element The element to scope the keybindings to
 * @param bindings Array of keybinding configurations
 */
export const useScopedKeybindings = (
  element: () => HTMLElement | undefined,
  bindings: () => KeyBindingConfig[],
): void => {
  onMount(() => {
    const handler = (event: KeyboardEvent) => {
      const el = element()
      if (!el) return

      // Check if the element or any of its children are focused
      if (!el.contains(document.activeElement) && document.activeElement !== el) {
        return
      }

      // Don't handle if user is typing in an input/textarea
      const activeElement = document.activeElement
      if (
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        (activeElement as HTMLElement)?.isContentEditable
      ) {
        return
      }

      for (const binding of bindings()) {
        if (matchesBinding(event, binding)) {
          if (binding.preventDefault !== false) {
            event.preventDefault()
          }
          binding.handler(event)
          break
        }
      }
    }

    document.addEventListener("keydown", handler)
    onCleanup(() => document.removeEventListener("keydown", handler))
  })
}

/**
 * Common keybinding presets
 */
export const KeyBindings = {
  copy: (handler: () => void): KeyBindingConfig => ({
    key: "c",
    ctrl: true,
    handler,
  }),
  cut: (handler: () => void): KeyBindingConfig => ({
    key: "x",
    ctrl: true,
    handler,
  }),
  paste: (handler: () => void): KeyBindingConfig => ({
    key: "v",
    ctrl: true,
    handler,
  }),
  delete: (handler: () => void): KeyBindingConfig => ({
    key: "Delete",
    handler,
  }),
  selectAll: (handler: () => void): KeyBindingConfig => ({
    key: "a",
    ctrl: true,
    handler,
  }),
  escape: (handler: () => void): KeyBindingConfig => ({
    key: "Escape",
    handler,
  }),
  enter: (handler: () => void): KeyBindingConfig => ({
    key: "Enter",
    handler,
  }),
  rename: (handler: () => void): KeyBindingConfig => ({
    key: "F2",
    handler,
  }),
  refresh: (handler: () => void): KeyBindingConfig => ({
    key: "F5",
    handler,
  }),
  newFolder: (handler: () => void): KeyBindingConfig => ({
    key: "n",
    ctrl: true,
    shift: true,
    handler,
  }),
} as const
