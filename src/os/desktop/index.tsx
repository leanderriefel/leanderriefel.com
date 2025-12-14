import { createResource, onCleanup, onMount, For } from "solid-js"
import { DirEntry, entryName, list, subscribe } from "~/os/fs"
import { read, write } from "~/os/registry"

const DESKTOP_LOCATIONS_KEY = "desktop_locations"

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

  const [locations] = createResource(async () => {
    if (files.state !== "ready") return

    let locations = await read<Map<string, { x: number; y: number }>>(DESKTOP_LOCATIONS_KEY)
    let updated = false

    if (!locations) {
      locations = new Map()
      updated = true
    }

    const f = files()

    for (const file of f) {
      const location = locations.get(file.path)
      if (!location) {
        locations.set(file.path, { x: 0, y: 0 })
        updated = true
      }
    }

    if (updated) {
      await write(DESKTOP_LOCATIONS_KEY, locations)
    }

    return Array.from(locations.entries()).map(([key, value]) => ({
      file: f.find((f) => f.path === key)!,
      ...value,
    }))
  })

  return (
    <div class="absolute inset-0 bottom-24">
      <For each={locations()}>{(file) => <div>{entryName(file.file.path)}</div>}</For>
    </div>
  )
}
