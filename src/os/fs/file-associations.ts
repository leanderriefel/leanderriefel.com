import { createSignal } from "solid-js"
import type { AppClass } from "~/os"
import { getInstalledApps } from "~/os/fs/programs"
import { read, write } from "~/os/registry"

const FILE_ASSOCIATIONS_REGISTRY_KEY = "os_file_associations"

export type FileAssociations = Record<string, string>

const DEFAULT_ASSOCIATIONS: FileAssociations = {
  ".app": "__system__",
  ".txt": "text-editor",
  ".dash": "terminal",
}

const [associations, setAssociations] = createSignal<FileAssociations>({})
let associationsLoaded = false
let associationsLoadPromise: Promise<void> | null = null

const isClient = () => typeof window !== "undefined"

const normalizeExtension = (ext: string): string => {
  const trimmed = ext.trim()
  if (!trimmed) return ""
  const lower = trimmed.toLowerCase()
  return lower.startsWith(".") ? lower : `.${lower}`
}

export const appSupportsExtension = (app: AppClass, ext: string): boolean => {
  const normalizedExt = normalizeExtension(ext)
  if (!normalizedExt) return false

  const supported = app.supportedFileTypes ?? []
  return supported.some((type) => {
    if (!type) return false
    if (type === "*" || type === ".*") return true
    return normalizeExtension(type) === normalizedExt
  })
}

export const getAppsForExtension = (ext: string): AppClass[] => {
  const normalizedExt = normalizeExtension(ext)
  if (!normalizedExt) return []
  return getInstalledApps().filter((app) => appSupportsExtension(app, normalizedExt))
}

const loadAssociations = async (): Promise<void> => {
  if (!isClient()) return

  try {
    const stored = await read<FileAssociations>(FILE_ASSOCIATIONS_REGISTRY_KEY)
    const merged = { ...DEFAULT_ASSOCIATIONS, ...stored }
    setAssociations(merged)
  } catch (e) {
    console.error("Failed to load file associations:", e)
    setAssociations({ ...DEFAULT_ASSOCIATIONS })
  } finally {
    associationsLoaded = true
  }
}

export const waitForAssociations = async (): Promise<void> => {
  if (!isClient()) return
  if (associationsLoaded) return

  if (!associationsLoadPromise) {
    associationsLoadPromise = loadAssociations()
  }

  await associationsLoadPromise
}

const persistAssociations = async (): Promise<void> => {
  if (!isClient()) return

  try {
    await write(FILE_ASSOCIATIONS_REGISTRY_KEY, associations())
  } catch (e) {
    console.error("Failed to save file associations:", e)
  }
}

export const getExtension = (path: string): string => {
  const lastSlash = path.lastIndexOf("/")
  const filename = lastSlash >= 0 ? path.slice(lastSlash + 1) : path
  const dotIndex = filename.lastIndexOf(".")
  if (dotIndex <= 0) return ""
  return normalizeExtension(filename.slice(dotIndex))
}

export const getAssociations = (): FileAssociations => associations()

export const getAssociationForExtension = (ext: string): string | undefined => {
  const normalized = normalizeExtension(ext)
  if (!normalized) return undefined
  return associations()[normalized]
}

export const resolveAppForPath = (path: string): string | undefined => {
  const ext = getExtension(path)
  if (!ext) return undefined
  const appId = getAssociationForExtension(ext)
  if (!appId) return undefined
  if (isSystemAssociation(appId)) return appId

  const installedApp = getInstalledApps().find((app) => app.appId === appId)
  if (!installedApp) return undefined

  return appSupportsExtension(installedApp, ext) ? appId : undefined
}

export const setAssociation = async (ext: string, appId: string): Promise<void> => {
  const normalized = normalizeExtension(ext)
  if (!normalized) return

  if (!isSystemAssociation(appId)) {
    const installedApp = getInstalledApps().find((app) => app.appId === appId)
    if (!installedApp || !appSupportsExtension(installedApp, normalized)) {
      console.warn(`App ${appId} cannot open ${normalized} files`)
      return
    }
  }

  setAssociations((prev) => ({ ...prev, [normalized]: appId }))
  await persistAssociations()
}

export const removeAssociation = async (ext: string): Promise<void> => {
  const normalized = normalizeExtension(ext)
  if (!normalized) return

  setAssociations((prev) => {
    const next = { ...prev }
    delete next[normalized]
    return next
  })
  await persistAssociations()
}

export const isSystemAssociation = (appId: string): boolean => appId === "__system__"
