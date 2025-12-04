import { Router } from "@solidjs/router"
import { FileRoutes } from "@solidjs/start/router"
import { Suspense, onMount, createSignal, Show } from "solid-js"
import "./app.css"
import "~/os/apps"
import { initWindowPersistence } from "~/os/windows/open-windows"
import { getCookie } from "vinxi/http"
import { ColorModeProvider, ColorModeScript, cookieStorageManagerSSR } from "@kobalte/core"
import { isServer } from "solid-js/web"

const getServerCookies = () => {
  "use server"
  const colorMode = getCookie("kb-color-mode")
  return colorMode ? `kb-color-mode=${colorMode}` : ""
}

export default function App() {
  const storageManager = cookieStorageManagerSSR(isServer ? getServerCookies() : document.cookie)
  const [mounted, setMounted] = createSignal(false)

  onMount(() => {
    initWindowPersistence()
    setMounted(true)
  })

  return (
    <Router
      root={(props) => (
        <>
          <ColorModeScript storageType={storageManager.type} />
          <ColorModeProvider storageManager={storageManager} initialColorMode="system" disableTransitionOnChange>
            <Show when={mounted()}>
              <Suspense>{props.children}</Suspense>
            </Show>
          </ColorModeProvider>
        </>
      )}
    >
      <FileRoutes />
    </Router>
  )
}
