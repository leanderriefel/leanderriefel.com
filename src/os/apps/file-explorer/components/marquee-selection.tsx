import { createSignal, onCleanup, onMount, type JSX, Show } from "solid-js"

export type MarqueeRect = {
  x: number
  y: number
  width: number
  height: number
}

export type MarqueeSelectionProps = {
  /** Container element ref */
  containerRef: () => HTMLElement | undefined
  /** Called when selection changes during drag */
  onSelectionChange: (rect: MarqueeRect) => void
  /** Called when selection ends */
  onSelectionEnd: (rect: MarqueeRect) => void
  /** Called when selection is cleared (click without drag) */
  onClear?: () => void
  /** Whether marquee selection is enabled */
  enabled?: boolean
  /** Minimum drag distance to start selection (default: 5px) */
  threshold?: number
  /** Children to render inside the selection area */
  children?: JSX.Element
}

export const MarqueeSelection = (props: MarqueeSelectionProps) => {
  const [isSelecting, setIsSelecting] = createSignal(false)
  const [startPos, setStartPos] = createSignal({ x: 0, y: 0 })
  const [currentPos, setCurrentPos] = createSignal({ x: 0, y: 0 })
  const [hasDragged, setHasDragged] = createSignal(false)

  const threshold = () => props.threshold ?? 5
  const enabled = () => props.enabled !== false

  const getRect = (): MarqueeRect => {
    const start = startPos()
    const current = currentPos()

    const x = Math.min(start.x, current.x)
    const y = Math.min(start.y, current.y)
    const width = Math.abs(current.x - start.x)
    const height = Math.abs(current.y - start.y)

    return { x, y, width, height }
  }

  const getRelativePosition = (e: MouseEvent): { x: number; y: number } => {
    const container = props.containerRef()
    if (!container) return { x: 0, y: 0 }

    const rect = container.getBoundingClientRect()
    return {
      x: e.clientX - rect.left + container.scrollLeft,
      y: e.clientY - rect.top + container.scrollTop,
    }
  }

  const handleMouseDown = (e: MouseEvent) => {
    if (!enabled()) return
    if (e.button !== 0) return // Only left click

    const container = props.containerRef()
    if (!container) return

    // Check if clicking on an interactive element
    const target = e.target as HTMLElement
    if (target.closest("button, a, [data-no-marquee]")) return

    const pos = getRelativePosition(e)
    setStartPos(pos)
    setCurrentPos(pos)
    setIsSelecting(true)
    setHasDragged(false)

    e.preventDefault()
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isSelecting()) return

    const pos = getRelativePosition(e)
    setCurrentPos(pos)

    const start = startPos()
    const distance = Math.sqrt(Math.pow(pos.x - start.x, 2) + Math.pow(pos.y - start.y, 2))

    if (distance >= threshold()) {
      if (!hasDragged()) {
        setHasDragged(true)
      }
      props.onSelectionChange(getRect())
    }
  }

  const handleMouseUp = () => {
    if (!isSelecting()) return

    if (hasDragged()) {
      props.onSelectionEnd(getRect())
    } else {
      // It was just a click, not a drag
      props.onClear?.()
    }

    setIsSelecting(false)
    setHasDragged(false)
  }

  onMount(() => {
    const container = props.containerRef()
    if (!container) return

    container.addEventListener("mousedown", handleMouseDown)
    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)

    onCleanup(() => {
      container.removeEventListener("mousedown", handleMouseDown)
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    })
  })

  const selectionStyle = (): JSX.CSSProperties => {
    const rect = getRect()
    return {
      position: "absolute",
      left: `${rect.x}px`,
      top: `${rect.y}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      "pointer-events": "none",
    }
  }

  return (
    <Show when={isSelecting() && hasDragged()}>
      <div class="z-50 border border-primary/50 bg-primary/10" style={selectionStyle()} />
    </Show>
  )
}

/**
 * Hook to use marquee selection with a container
 */
export const useMarqueeSelection = (
  containerRef: () => HTMLElement | undefined,
  options: {
    onSelectionChange: (rect: MarqueeRect) => void
    onSelectionEnd: (rect: MarqueeRect) => void
    onClear?: () => void
    enabled?: () => boolean
    threshold?: number
  },
) => {
  const [isSelecting, setIsSelecting] = createSignal(false)
  const [startPos, setStartPos] = createSignal({ x: 0, y: 0 })
  const [currentPos, setCurrentPos] = createSignal({ x: 0, y: 0 })
  const [hasDragged, setHasDragged] = createSignal(false)

  const threshold = options.threshold ?? 5
  const enabled = () => options.enabled?.() !== false

  const getRect = (): MarqueeRect => {
    const start = startPos()
    const current = currentPos()

    const x = Math.min(start.x, current.x)
    const y = Math.min(start.y, current.y)
    const width = Math.abs(current.x - start.x)
    const height = Math.abs(current.y - start.y)

    return { x, y, width, height }
  }

  const getRelativePosition = (e: MouseEvent): { x: number; y: number } => {
    const container = containerRef()
    if (!container) return { x: 0, y: 0 }

    const rect = container.getBoundingClientRect()
    return {
      x: e.clientX - rect.left + container.scrollLeft,
      y: e.clientY - rect.top + container.scrollTop,
    }
  }

  const handleMouseDown = (e: MouseEvent) => {
    if (!enabled()) return
    if (e.button !== 0) return

    const container = containerRef()
    if (!container) return

    const target = e.target as HTMLElement
    if (target.closest("button, a, [data-no-marquee]")) return

    const pos = getRelativePosition(e)
    setStartPos(pos)
    setCurrentPos(pos)
    setIsSelecting(true)
    setHasDragged(false)

    e.preventDefault()
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isSelecting()) return

    const pos = getRelativePosition(e)
    setCurrentPos(pos)

    const start = startPos()
    const distance = Math.sqrt(Math.pow(pos.x - start.x, 2) + Math.pow(pos.y - start.y, 2))

    if (distance >= threshold) {
      if (!hasDragged()) {
        setHasDragged(true)
      }
      options.onSelectionChange(getRect())
    }
  }

  const handleMouseUp = () => {
    if (!isSelecting()) return

    if (hasDragged()) {
      options.onSelectionEnd(getRect())
    } else {
      options.onClear?.()
    }

    setIsSelecting(false)
    setHasDragged(false)
  }

  onMount(() => {
    const container = containerRef()
    if (!container) return

    container.addEventListener("mousedown", handleMouseDown)
    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)

    onCleanup(() => {
      container.removeEventListener("mousedown", handleMouseDown)
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    })
  })

  return {
    isSelecting,
    hasDragged,
    rect: getRect,
    selectionStyle: (): JSX.CSSProperties => {
      const rect = getRect()
      return {
        position: "absolute",
        left: `${rect.x}px`,
        top: `${rect.y}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        "pointer-events": "none",
      }
    },
  }
}

/**
 * Checks if an element intersects with a marquee rectangle
 */
export const elementIntersectsRect = (
  element: HTMLElement,
  marqueeRect: MarqueeRect,
  containerRect: DOMRect,
  scrollTop: number = 0,
  scrollLeft: number = 0,
): boolean => {
  const elRect = element.getBoundingClientRect()

  // Convert element rect to container-relative coordinates
  const elRelative = {
    left: elRect.left - containerRect.left + scrollLeft,
    top: elRect.top - containerRect.top + scrollTop,
    right: elRect.right - containerRect.left + scrollLeft,
    bottom: elRect.bottom - containerRect.top + scrollTop,
  }

  // Check intersection
  return !(
    elRelative.right < marqueeRect.x ||
    elRelative.left > marqueeRect.x + marqueeRect.width ||
    elRelative.bottom < marqueeRect.y ||
    elRelative.top > marqueeRect.y + marqueeRect.height
  )
}
