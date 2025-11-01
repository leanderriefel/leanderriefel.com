import { A } from "@solidjs/router";

export default function NotFound() {
  return (
    <main class="flex min-h-screen items-center justify-center bg-black text-white">
      <div class="text-center">
        <h1 class="mb-8 text-4xl font-light">404</h1>
        <p class="mb-8 text-gray-400">Page not found</p>
        <A href="/" class="text-gray-400 transition-colors hover:text-white">
          ← Home
        </A>
      </div>
    </main>
  );
}
