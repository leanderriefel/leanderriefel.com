import { createSignal } from "solid-js"
import { AppClass, appRegistry } from "~/os"
import { FsPath, entryName, list, mkdir, stat, writeFile } from "~/os/fs"
import { read, write } from "~/os/registry"

const PROGRAMS_PATH = "/Programs" as FsPath
const PROGRAM_FILE_EXT = ".app"
const SEED_REGISTRY_KEY = "os_programs_seeded_v1"

const [installedApps, setInstalledApps] = createSignal<AppClass[]>([])
const [installedAppIds, setInstalledAppIds] = createSignal<Set<string>>(new Set())

let ensureProgramsPromise: Promise<void> | null = null

const isClient = () => typeof window !== "undefined"

const programFilePath = (appId: string): FsPath => `${PROGRAMS_PATH}/${appId}${PROGRAM_FILE_EXT}` as FsPath

const getProtectedAppIds = (): Set<string> => {
  const ids = new Set<string>()
  for (const appClass of appRegistry) {
    if (appClass.appProtected) ids.add(appClass.appId)
  }
  return ids
}

const ensureProgramsDirectory = async () => {
  if (!isClient()) return
  await mkdir(PROGRAMS_PATH, { parents: true })
}

const ensureProtectedPrograms = async () => {
  const protectedIds = getProtectedAppIds()

  for (const appClass of appRegistry) {
    if (!protectedIds.has(appClass.appId)) continue
    const programPath = programFilePath(appClass.appId)
    const existing = await stat(programPath)
    if (existing) continue

    const metadata = appClass.getMetadata()
    await writeFile(programPath, JSON.stringify(metadata, null, 2), {
      parents: true,
      mimeType: "application/json",
    })
  }
}

const seedDefaultPrograms = async () => {
  if (!isClient()) return

  await ensureProgramsDirectory()

  const seeded = await read<boolean>(SEED_REGISTRY_KEY)
  if (seeded) {
    await ensureProtectedPrograms()
    return
  }

  for (const appClass of appRegistry) {
    const programPath = programFilePath(appClass.appId)
    const existing = await stat(programPath)
    if (existing) continue

    const metadata = appClass.getMetadata()
    await writeFile(programPath, JSON.stringify(metadata, null, 2), {
      parents: true,
      mimeType: "application/json",
    })
  }

  await write(SEED_REGISTRY_KEY, true)
}

const loadInstalledApps = async () => {
  if (!isClient()) {
    setInstalledAppIds(new Set<string>())
    setInstalledApps([])
    return
  }

  await ensureProgramsDirectory()

  const entries = await list(PROGRAMS_PATH).catch(() => [])
  const ids = new Set<string>()
  const apps: AppClass[] = []

  for (const entry of entries) {
    if (entry.type !== "file") continue

    const name = entryName(entry.path)
    if (!name.endsWith(PROGRAM_FILE_EXT)) continue

    const appId = name.slice(0, -PROGRAM_FILE_EXT.length)
    ids.add(appId)

    const found = appRegistry.find((app) => app.appId === appId)
    if (found) {
      apps.push(found)
    }
  }

  setInstalledAppIds(ids)
  setInstalledApps(apps)
}

export const refreshInstalledApps = async () => {
  await ensureProtectedPrograms()
  await loadInstalledApps()
}

export const waitForInstalledApps = async () => {
  if (!ensureProgramsPromise) {
    ensureProgramsPromise = (async () => {
      await seedDefaultPrograms()
      await ensureProtectedPrograms()
      await loadInstalledApps()
    })()
  }

  await ensureProgramsPromise
}

export const getInstalledApps = () => installedApps()
export const getInstalledAppIds = () => installedAppIds()
export const isProtectedAppId = (appId: string) => getProtectedAppIds().has(appId)

export const findInstalledApp = (predicate: (app: AppClass) => boolean): AppClass | undefined => {
  return installedApps().find(predicate)
}

export const findInstalledAppByNameOrId = (value: string): AppClass | undefined => {
  return installedApps().find((app) => app.appId === value || app.appName === value)
}

export { PROGRAMS_PATH, PROGRAM_FILE_EXT, programFilePath }
