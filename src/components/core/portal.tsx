import { onMount, createSignal, Show, ParentProps } from "solid-js"
import { Portal as SolidPortal } from "solid-js/web"

export interface PortalProps extends ParentProps {
  mount?: HTMLElement | null
}

export const Portal = (props: PortalProps) => {
  const [mounted, setMounted] = createSignal(false)

  onMount(() => {
    setMounted(true)
  })

  return (
    <Show when={mounted()}>
      <SolidPortal mount={props.mount ?? document.body}>{props.children}</SolidPortal>
    </Show>
  )
}
