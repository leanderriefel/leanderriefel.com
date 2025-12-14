import { createResource, onCleanup, onMount, For } from "solid-js"
import { DirEntry, entryName, list, subscribe } from "~/os/fs"

export const Desktop = () => {
  const [files, { refetch }] = createResource(async () => {
    return await list("/Desktop")
  })

  let unsubscribe: (() => void) | undefined

  onMount(async () => {
    unsubscribe = subscribe<DirEntry>("/Desktop", () => {
      refetch()
    })
  })

  onCleanup(() => {
    unsubscribe?.()
  })

  return (
    <div class="absolute inset-0 bottom-24">
      <For each={files()}>{(file) => <div>{entryName(file.path)}</div>}</For>
    </div>
  )
}
