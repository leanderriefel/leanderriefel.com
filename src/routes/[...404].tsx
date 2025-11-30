import { A } from "@solidjs/router"

export default function NotFound() {
  return (
    <main class="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div class="text-center">
        <h1 class="mb-8 text-4xl font-light">404</h1>
        <p class="mb-8 text-muted-foreground">Page not found</p>
        <A href="/" class="text-muted-foreground transition-colors hover:text-foreground">
          ← Home
        </A>
      </div>
    </main>
  )
}
