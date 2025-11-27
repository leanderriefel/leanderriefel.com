import { Router } from "@solidjs/router"
import { FileRoutes } from "@solidjs/start/router"
import { Suspense, onMount } from "solid-js"
import "./app.css"
import "~/os/apps"
import { initWindowPersistence } from "~/os/windows/open-windows"

export default function App() {
  onMount(() => {
    initWindowPersistence()
  })

  return (
    <Router
      root={(props) => (
        <>
          <Suspense>{props.children}</Suspense>
        </>
      )}
    >
      <FileRoutes />
    </Router>
  )
}
