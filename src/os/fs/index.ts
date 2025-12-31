import Dexie, { Table } from "dexie"
import { createEffect, createResource, onCleanup, type Accessor } from "solid-js"

const DB_NAME = "os-fs"
const DB_VERSION = 1
const META_STORE = "meta"
const CHUNK_STORE = "chunks"
const DEFAULT_CHUNK_SIZE = 256 * 1024

type EntryType = "link" | "file" | "dir"

export type FsPath = `/` | `/${string}`

export type FileContent =
  | string
  | ArrayBuffer
  | Uint8Array
  | Blob
  | ReadableStream<Uint8Array>
  | AsyncIterable<Uint8Array>

export interface BaseEntry {
  path: FsPath
  created: number
  type: EntryType
}

export interface FileEntry extends BaseEntry {
  type: "file"
  modified: number
  size: number
  mimeType?: string
}

export interface DirEntry extends BaseEntry {
  type: "dir"
}

export interface LinkEntry extends BaseEntry {
  type: "link"
  target: FsPath
  modified: number
}

export type FsEntry = FileEntry | DirEntry | LinkEntry

type StoredEntry = FsEntry & {
  parent: FsPath
  chunkCount?: number
}

type StoredChunk = {
  key: string
  path: FsPath
  index: number
  data: Blob
}

type WriteOptions = {
  mimeType?: string
  chunkSize?: number
  parents?: boolean
}

type ReadOptions = {
  as?: "arrayBuffer" | "text" | "blob"
}

type ReadFileAs = NonNullable<ReadOptions["as"]>
type ReadFileResult<TAs extends ReadFileAs | undefined> = TAs extends "text"
  ? string | undefined
  : TAs extends "blob"
    ? Blob | undefined
    : ArrayBuffer | undefined

type RemoveOptions = {
  recursive?: boolean
}

type MoveOptions = {
  overwrite?: boolean
}

type CopyOptions = {
  overwrite?: boolean
  followSymlinks?: boolean
}

class FsDexie extends Dexie {
  meta!: Table<StoredEntry, string>
  chunks!: Table<StoredChunk, string>

  constructor() {
    super(DB_NAME)
    this.version(DB_VERSION).stores({
      [META_STORE]: "&path,parent",
      [CHUNK_STORE]: "&key,path,index",
    })
  }
}

// -----------------------------------------------------------------------------
// Internal Helpers (Hoisted)
// -----------------------------------------------------------------------------

function ensureClient() {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB is not available in this environment")
  }
}

const db = new FsDexie()

async function ensureDbOpen(): Promise<FsDexie> {
  ensureClient()
  if (!db.isOpen()) {
    await db.open()
  }
  return db
}

function normalizePath(input: string): FsPath {
  const raw = input.trim()
  if (raw === "" || raw === "/") return "/"

  const segments = raw.split("/").filter((part) => part.length > 0 && part !== ".")
  const stack: string[] = []

  for (const part of segments) {
    if (part === "..") {
      stack.pop()
      continue
    }
    stack.push(part)
  }

  return `/${stack.join("/")}` as FsPath
}

export const parentPath = (path: FsPath): FsPath => {
  if (path === "/") return "/"
  const idx = path.lastIndexOf("/")
  if (idx <= 0) return "/"
  return (path.slice(0, idx) || "/") as FsPath
}

export const entryName = (path: FsPath): string => {
  if (path === "/") return ""
  const idx = path.lastIndexOf("/")
  return path.slice(idx + 1)
}

const chunkKey = (path: FsPath, index: number) => `${path}::${index.toString().padStart(8, "0")}`

const subscribers = new Map<FsPath, Map<string, (entry: FsEntry | undefined) => void>>()

function notifySubscribers<T extends FsEntry>(path: FsPath, entry: T | undefined) {
  const pathSubscribers = subscribers.get(path)

  if (pathSubscribers) {
    for (const callback of pathSubscribers.values()) {
      callback(entry)
    }
  }
}

async function notifyPathChanged(inputPath: FsPath) {
  const path = normalizePath(inputPath)

  const { resolved, entry } = await _resolveLink(path)
  notifySubscribers(path, entry as FsEntry | undefined)

  // If this is a symlink, also notify the resolved target
  if (resolved !== path) {
    notifySubscribers(resolved, entry as FsEntry | undefined)
  }

  // Notify parent directory (for listing updates)
  const p = parentPath(path)
  if (p !== path) {
    const parentEntry = await _getEntry(p)
    notifySubscribers(p, parentEntry as FsEntry | undefined)

    // If a directory is symlinked, changes inside the target directory should also
    // invalidate subscribers of the symlink path (so listing resources for symlink
    // dirs update just like normal dirs).
    const symlinksToParent = await findSymlinksToTarget(p)
    for (const symlinkEntry of symlinksToParent) {
      notifySubscribers(symlinkEntry.path, parentEntry as FsEntry | undefined)
    }
  }

  // Reverse symlink notification: notify all symlinks pointing to this path
  const symlinksToThis = await findSymlinksToTarget(path)
  for (const symlinkEntry of symlinksToThis) {
    notifySubscribers(symlinkEntry.path, entry as FsEntry | undefined)
  }
}

async function findSymlinksToTarget(targetPath: FsPath): Promise<StoredEntry[]> {
  const database = await ensureDbOpen()
  const allEntries = await database.meta.toArray()
  return allEntries.filter(
    (entry): entry is StoredEntry & { type: "link" } =>
      entry.type === "link" && normalizePath(entry.target) === targetPath,
  )
}

async function updateSymlinksPointingTo(oldTarget: FsPath, newTarget: FsPath): Promise<number> {
  const symlinks = await findSymlinksToTarget(oldTarget)
  const database = await ensureDbOpen()

  for (const symlink of symlinks) {
    if (symlink.type === "link") {
      await database.meta.put({
        ...symlink,
        target: newTarget,
      })
    }
  }

  return symlinks.length
}

// -----------------------------------------------------------------------------
// Internal Core Operations (No Init Check)
// -----------------------------------------------------------------------------

async function _getEntry(path: FsPath): Promise<StoredEntry | undefined> {
  const database = await ensureDbOpen()
  return database.meta.get(path)
}

async function _getEntryRaw(path: FsPath): Promise<StoredEntry | undefined> {
  const database = await ensureDbOpen()
  return database.meta.get(path)
}

async function _getChildren(dir: FsPath): Promise<StoredEntry[]> {
  const database = await ensureDbOpen()
  const children = await database.meta.where("parent").equals(dir).toArray()
  return children ?? []
}

const MAX_SYMLINK_DEPTH = 40

async function _resolveLinkFully(
  path: FsPath,
  maxDepth: number = MAX_SYMLINK_DEPTH,
): Promise<{ resolved: FsPath; entry: StoredEntry | undefined }> {
  const visited = new Set<FsPath>()
  let currentPath = normalizePath(path)

  for (let depth = 0; depth < maxDepth; depth++) {
    if (visited.has(currentPath)) {
      throw new Error(`Symlink cycle detected at ${currentPath}`)
    }
    visited.add(currentPath)

    const entry = await _getEntry(currentPath)
    if (!entry) return { resolved: currentPath, entry: undefined }
    if (entry.type !== "link") return { resolved: currentPath, entry }

    currentPath = normalizePath(entry.target)
  }

  throw new Error(`Symlink chain too deep (exceeded ${maxDepth} hops) starting from ${path}`)
}

async function _resolveLink(path: FsPath): Promise<{ resolved: FsPath; entry: StoredEntry | undefined }> {
  return _resolveLinkFully(path)
}

async function _ensureDirExists(path: FsPath, { parents }: { parents?: boolean }) {
  if (path === "/") return

  // Resolve symlinks to check if the path already exists as a directory
  const { entry: existing } = await _resolveLinkFully(path)
  if (existing) {
    if (existing.type !== "dir") throw new Error(`Path ${path} exists and is not a directory`)
    return
  }

  // Check if there's a broken symlink at this path
  const rawEntry = await _getEntryRaw(path)
  if (rawEntry && rawEntry.type === "link") {
    throw new Error(`Path ${path} is a broken symlink`)
  }

  const parent = parentPath(path)
  if (parent !== "/") {
    // Resolve symlinks in parent path
    const { entry: parentEntry, resolved: parentResolved } = await _resolveLinkFully(parent)
    if (!parentEntry) {
      if (!parents) throw new Error(`Parent directory ${parent} does not exist`)
      await _ensureDirExists(parent, { parents: true })
    } else if (parentEntry.type !== "dir") {
      throw new Error(`Parent path ${parent} (resolved to ${parentResolved}) is not a directory`)
    }
  }

  const now = Date.now()
  const dir: StoredEntry = {
    path,
    parent,
    type: "dir",
    created: now,
  }
  const database = await ensureDbOpen()
  await database.meta.put(dir)
}

async function _mkdir(inputPath: FsPath, options: { parents?: boolean } = {}) {
  const path = normalizePath(inputPath)
  if (path === "/") return
  await _ensureDirExists(path, { parents: options.parents })
  await notifyPathChanged(path)
}

async function _getChunks(path: FsPath): Promise<StoredChunk[]> {
  const database = await ensureDbOpen()
  const chunks = await database.chunks.where("path").equals(path).sortBy("index")
  return chunks ?? []
}

async function _writeFile(inputPath: FsPath, data: FileContent, options: WriteOptions = {}) {
  const inputNormalized = normalizePath(inputPath)

  const rawEntry = await _getEntryRaw(inputNormalized)
  const isLink = rawEntry?.type === "link"
  const { resolved: path, entry: existing } = await _resolveLink(inputNormalized)

  const now = Date.now()
  const parent = isLink ? parentPath(path) : parentPath(inputNormalized)

  if (!isLink) {
    await _ensureDirExists(parent, { parents: options.parents ?? false })
  }

  if (existing && existing.type === "dir") throw new Error(`Cannot write file, ${path} is a directory`)

  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE
  let chunkCount = 0
  let totalSize = 0

  const database = await ensureDbOpen()
  await database.transaction("rw", database.meta, database.chunks, async () => {
    await database.chunks.where("path").equals(path).delete()

    for await (const chunk of toAsyncIterable(data, chunkSize)) {
      const bytes = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk)
      totalSize += bytes.byteLength
      const arrayBuffer =
        bytes.buffer instanceof ArrayBuffer
          ? bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
          : (() => {
              const clone = new ArrayBuffer(bytes.byteLength)
              new Uint8Array(clone).set(bytes)
              return clone
            })()
      const record: StoredChunk = {
        key: chunkKey(path, chunkCount),
        path,
        index: chunkCount,
        data: new Blob([arrayBuffer]),
      }
      await database.chunks.put(record)
      chunkCount++
    }

    const fileEntry: StoredEntry = {
      path,
      parent,
      type: "file",
      created: existing?.created ?? now,
      modified: now,
      size: totalSize,
      mimeType: options.mimeType,
      chunkCount,
    }

    await database.meta.put(fileEntry)
  })

  await notifyPathChanged(path)
}

async function _remove(inputPath: FsPath, options: RemoveOptions = {}) {
  const path = normalizePath(inputPath)
  if (path === "/") throw new Error("Cannot remove root directory")
  const entry = await _getEntryRaw(path)
  if (!entry) return

  const database = await ensureDbOpen()

  if (entry.type === "link") {
    await database.meta.delete(path)
    await notifyPathChanged(path)
    return
  }

  if (entry.type === "file") {
    await database.transaction("rw", database.meta, database.chunks, async () => {
      await database.chunks.where("path").equals(path).delete()
      await database.meta.delete(path)
    })
    await notifyPathChanged(path)
    return
  }

  const children = await _getChildren(path)
  if (children.length > 0 && !options.recursive) {
    throw new Error(`Directory ${path} is not empty`)
  }

  for (const child of children) {
    await _remove(child.path, options)
  }

  await database.meta.delete(path)
  await notifyPathChanged(path)
}

// -----------------------------------------------------------------------------
// Initialization
// -----------------------------------------------------------------------------

export const DEFAULT_FOLDERS: FsPath[] = ["/Programs", "/Documents", "/Pictures", "/Music", "/Videos", "/Downloads"]

let fsInitPromise: Promise<void> | null = null

async function ensureDefaultFolders() {
  for (const folderPath of DEFAULT_FOLDERS) {
    const existing = await _getEntry(folderPath)
    if (!existing) {
      await _mkdir(folderPath, { parents: true })
    }
  }
}

export const initFs = async () => {
  if (!fsInitPromise) {
    fsInitPromise = (async () => {
      await ensureDbOpen()
      await ensureDefaultFolders()
    })()
  }
  return fsInitPromise
}

// -----------------------------------------------------------------------------
// Public API (Waits for Init)
// -----------------------------------------------------------------------------

export const subscribe = <T extends FsEntry>(path: FsPath, callback: (entry: T | undefined) => void) => {
  const key = crypto.randomUUID()

  if (!subscribers.has(path)) {
    subscribers.set(path, new Map())
  }
  subscribers.get(path)!.set(key, callback as (entry: FsEntry | undefined) => void)

  return () => {
    const pathSubscribers = subscribers.get(path)

    if (pathSubscribers) {
      pathSubscribers.delete(key)

      if (pathSubscribers.size === 0) {
        subscribers.delete(path)
      }
    }
  }
}

export const getEntry = async (path: FsPath): Promise<StoredEntry | undefined> => {
  await initFs()
  return _getEntry(path)
}

export const putEntry = async (entry: StoredEntry) => {
  await initFs()
  const database = await ensureDbOpen()
  await database.meta.put(entry)
}

export const deleteEntry = async (path: FsPath) => {
  await initFs()
  const database = await ensureDbOpen()
  await database.meta.delete(path)
}

export const getChildren = async (dir: FsPath): Promise<StoredEntry[]> => {
  await initFs()
  return _getChildren(dir)
}

export const deleteChunks = async (path: FsPath) => {
  await initFs()
  const database = await ensureDbOpen()
  await database.chunks.where("path").equals(path).delete()
}

export const putChunk = async (chunk: StoredChunk) => {
  await initFs()
  const database = await ensureDbOpen()
  await database.chunks.put(chunk)
}

export const getChunks = async (path: FsPath): Promise<StoredChunk[]> => {
  await initFs()
  return _getChunks(path)
}

export const resolveLinkFully = async (
  path: FsPath,
  maxDepth: number = MAX_SYMLINK_DEPTH,
): Promise<{ resolved: FsPath; entry: StoredEntry | undefined }> => {
  await initFs()
  return _resolveLinkFully(path, maxDepth)
}

export const resolveLink = async (path: FsPath): Promise<{ resolved: FsPath; entry: StoredEntry | undefined }> => {
  await initFs()
  return _resolveLink(path)
}

export const resolveLinkSingle = async (
  path: FsPath,
): Promise<{ resolved: FsPath; entry: StoredEntry | undefined }> => {
  await initFs()
  const entry = await _getEntry(path)
  if (!entry) return { resolved: path, entry: undefined }
  if (entry.type !== "link") return { resolved: path, entry }

  const targetPath = normalizePath(entry.target)
  const targetEntry = await _getEntry(targetPath)
  return { resolved: targetPath, entry: targetEntry }
}

export const exists = async (inputPath: FsPath): Promise<boolean> => {
  await initFs()
  const path = normalizePath(inputPath)
  try {
    const { entry } = await _resolveLinkFully(path)
    return entry !== undefined
  } catch {
    return false
  }
}

export const lexists = async (inputPath: FsPath): Promise<boolean> => {
  await initFs()
  const path = normalizePath(inputPath)
  const entry = await _getEntryRaw(path)
  return entry !== undefined
}

export const getEntryRaw = async (path: FsPath): Promise<StoredEntry | undefined> => {
  await initFs()
  return _getEntryRaw(path)
}

export const ensureDirExists = async (path: FsPath, { parents }: { parents?: boolean }) => {
  await initFs()
  return _ensureDirExists(path, { parents })
}

export const mkdir = async (inputPath: FsPath, options: { parents?: boolean } = {}) => {
  await initFs()
  await _mkdir(inputPath, options)
}

export const symlink = async (linkPath: FsPath, targetPath: FsPath, options: { parents?: boolean } = {}) => {
  await initFs()
  const link = normalizePath(linkPath)
  const target = normalizePath(targetPath)

  if (link === "/") throw new Error("Cannot create symlink at root")

  const parent = parentPath(link)
  await _ensureDirExists(parent, { parents: options.parents ?? false })

  const existingLink = await _getEntry(link)
  if (existingLink) {
    if (existingLink.type === "dir") throw new Error(`Cannot create symlink, ${link} is a directory`)
    if (existingLink.type === "file") throw new Error(`Cannot create symlink, ${link} is a file`)
    throw new Error(`Symlink already exists at ${link}`)
  }

  const targetEntry = await _getEntryRaw(target)
  if (targetEntry && targetEntry.type === "link") {
    throw new Error(`Cannot create symlink to another symlink (${target})`)
  }

  const now = Date.now()
  const linkEntry: StoredEntry = {
    path: link,
    parent,
    type: "link",
    target,
    created: now,
    modified: now,
  }
  const database = await ensureDbOpen()
  await database.meta.put(linkEntry)
  await notifyPathChanged(link)
}

export const readlink = async (inputPath: FsPath): Promise<FsPath | undefined> => {
  await initFs()
  const path = normalizePath(inputPath)
  const entry = await _getEntryRaw(path)
  if (!entry) return undefined
  if (entry.type !== "link") throw new Error(`${path} is not a symlink`)
  return entry.target
}

export const stat = async (inputPath: FsPath): Promise<FsEntry | undefined> => {
  await initFs()
  const path = normalizePath(inputPath)
  const { entry } = await _resolveLink(path)
  return entry ?? undefined
}

export const lstat = async (inputPath: FsPath): Promise<FsEntry | undefined> => {
  await initFs()
  const path = normalizePath(inputPath)
  const entry = await _getEntryRaw(path)
  return entry ?? undefined
}

export const list = async (inputPath: FsPath = "/"): Promise<FsEntry[]> => {
  await initFs()
  const path = normalizePath(inputPath)
  let targetPath = path

  if (path !== "/") {
    const { resolved, entry } = await _resolveLink(path)
    if (!entry) throw new Error(`Directory ${path} does not exist`)
    if (entry.type !== "dir") throw new Error(`${path} is not a directory`)
    targetPath = resolved
  }

  const children = await _getChildren(targetPath)
  return children.sort((a, b) => entryName(a.path).localeCompare(entryName(b.path)))
}

type DirEntriesResourceOptions = {
  initialValue?: FsEntry[]
}

export const createFsListResource = (dir: Accessor<FsPath>, options: DirEntriesResourceOptions = {}) => {
  const [resource, actions] = createResource<FsEntry[], FsPath>(
    dir,
    async (p) => {
      try {
        return await list(p)
      } catch {
        return []
      }
    },
    { initialValue: options.initialValue ?? [] },
  )

  createEffect(() => {
    const unsubscribe = subscribe<FsEntry>(dir(), () => {
      void actions.refetch()
    })
    onCleanup(unsubscribe)
  })

  return [resource, actions] as const
}

export const writeFile = async (inputPath: FsPath, data: FileContent, options: WriteOptions = {}) => {
  await initFs()
  return _writeFile(inputPath, data, options)
}

export const writeFileStream = async (
  inputPath: FsPath,
  source: ReadableStream<Uint8Array> | AsyncIterable<Uint8Array>,
  options: WriteOptions = {},
) => {
  return writeFile(inputPath, source, options)
}

export const readFile = async (
  inputPath: FsPath,
  options: ReadOptions = {},
): Promise<ArrayBuffer | string | Blob | undefined> => {
  await initFs()
  const inputNormalized = normalizePath(inputPath)
  const { resolved: path, entry } = await _resolveLink(inputNormalized)
  if (!entry) return undefined
  if (entry.type !== "file") throw new Error(`${path} is not a file`)

  const chunks = await _getChunks(path)
  const merged = await concatChunks(chunks)
  const owned = merged.byteOffset === 0 && merged.byteLength === merged.buffer.byteLength ? merged : merged.slice()
  const arrayBuffer =
    owned.buffer instanceof ArrayBuffer
      ? owned.buffer.slice(owned.byteOffset, owned.byteOffset + owned.byteLength)
      : owned.slice().buffer

  const as = options.as ?? "arrayBuffer"
  if (as === "text") return new TextDecoder().decode(owned)
  if (as === "blob") return new Blob([arrayBuffer], { type: entry.mimeType })
  return arrayBuffer
}

type FileResourceOptions<TAs extends ReadFileAs | undefined> = {
  as?: TAs
  initialValue?: ReadFileResult<TAs>
}

export const createFsReadResource = <TAs extends ReadFileAs | undefined = undefined>(
  path: Accessor<FsPath>,
  options: FileResourceOptions<TAs> = {},
) =>
  (() => {
    const [resource, actions] = createResource<ReadFileResult<TAs>, FsPath>(
      path,
      async (p) => {
        try {
          const result = await readFile(p, { as: options.as })
          return result as ReadFileResult<TAs>
        } catch {
          return undefined as ReadFileResult<TAs>
        }
      },
      { initialValue: options.initialValue as ReadFileResult<TAs> | undefined },
    )

    createEffect(() => {
      const current = path()
      const unsubscribe = subscribe<FsEntry>(current, () => {
        void actions.refetch()
      })
      onCleanup(unsubscribe)
    })

    return [resource, actions] as const
  })()

export const readFileStream = async (inputPath: FsPath): Promise<ReadableStream<Uint8Array>> => {
  await initFs()
  const inputNormalized = normalizePath(inputPath)
  const { resolved: path, entry } = await _resolveLink(inputNormalized)
  if (!entry) throw new Error(`File ${inputNormalized} not found`)
  if (entry.type !== "file") throw new Error(`${path} is not a file`)

  const chunks = await _getChunks(path)
  let index = 0

  return new ReadableStream<Uint8Array>({
    pull(controller) {
      const chunk = chunks[index]
      if (!chunk) {
        controller.close()
        return
      }
      chunk.data
        .arrayBuffer()
        .then((buf) => {
          controller.enqueue(new Uint8Array(buf))
          index += 1
        })
        .catch((err) => controller.error(err))
    },
  })
}

export const remove = async (inputPath: FsPath, options: RemoveOptions = {}) => {
  await initFs()
  return _remove(inputPath, options)
}

export const clear = async () => {
  // Not waiting for initFs since this nukes it anyway
  const database = await ensureDbOpen()
  await database.transaction("rw", database.meta, database.chunks, async () => {
    await database.meta.clear()
    await database.chunks.clear()
  })
}

export const rename = async (oldPath: FsPath, newName: string): Promise<void> => {
  await initFs()
  const normalizedOld = normalizePath(oldPath)
  if (normalizedOld === "/") throw new Error("Cannot rename root directory")

  const entry = await _getEntryRaw(normalizedOld)
  if (!entry) throw new Error(`Path ${normalizedOld} does not exist`)

  const parent = parentPath(normalizedOld)
  const newPath = (parent === "/" ? `/${newName}` : `${parent}/${newName}`) as FsPath

  const existingAtNew = await _getEntryRaw(newPath)
  if (existingAtNew) throw new Error(`Path ${newPath} already exists`)

  const database = await ensureDbOpen()

  if (entry.type === "file") {
    await database.transaction("rw", database.meta, database.chunks, async () => {
      const chunks = await database.chunks.where("path").equals(normalizedOld).toArray()

      for (const chunk of chunks) {
        const newKey = `${newPath}::${chunk.index.toString().padStart(8, "0")}`
        await database.chunks.put({
          ...chunk,
          key: newKey,
          path: newPath,
        })
        await database.chunks.delete(chunk.key)
      }

      await database.meta.put({
        ...entry,
        path: newPath,
      })
      await database.meta.delete(normalizedOld)
    })
    // Update all symlinks pointing to the old path
    await updateSymlinksPointingTo(normalizedOld, newPath)
    await notifyPathChanged(normalizedOld)
    await notifyPathChanged(newPath)
    return
  }

  if (entry.type === "dir") {
    // Collect all paths that will be renamed for symlink updates
    const pathMappings: Array<{ oldPath: FsPath; newPath: FsPath }> = []

    const collectPaths = async (currentPath: FsPath, newBasePath: FsPath) => {
      pathMappings.push({ oldPath: currentPath, newPath: newBasePath })
      const children = await _getChildren(currentPath)
      for (const child of children) {
        const childName = entryName(child.path)
        const newChildPath = `${newBasePath}/${childName}` as FsPath
        await collectPaths(child.path, newChildPath)
      }
    }
    await collectPaths(normalizedOld, newPath)

    const renameRecursive = async (currentPath: FsPath, newBasePath: FsPath) => {
      const children = await _getChildren(currentPath)

      for (const child of children) {
        const childName = entryName(child.path)
        const newChildPath = `${newBasePath}/${childName}` as FsPath

        if (child.type === "dir") {
          await renameRecursive(child.path, newChildPath)
        } else if (child.type === "file") {
          const chunks = await database.chunks.where("path").equals(child.path).toArray()

          for (const chunk of chunks) {
            const newKey = `${newChildPath}::${chunk.index.toString().padStart(8, "0")}`
            await database.chunks.put({
              ...chunk,
              key: newKey,
              path: newChildPath,
            })
            await database.chunks.delete(chunk.key)
          }
        }

        await database.meta.put({
          ...child,
          path: newChildPath,
          parent: newBasePath,
        })
        await database.meta.delete(child.path)
      }
    }

    await database.transaction("rw", database.meta, database.chunks, async () => {
      await renameRecursive(normalizedOld, newPath)
      await database.meta.put({
        ...entry,
        path: newPath,
      })
      await database.meta.delete(normalizedOld)
    })

    // Update all symlinks pointing to any of the renamed paths
    for (const mapping of pathMappings) {
      await updateSymlinksPointingTo(mapping.oldPath, mapping.newPath)
    }

    await notifyPathChanged(normalizedOld)
    await notifyPathChanged(newPath)
    return
  }

  if (entry.type === "link") {
    await database.meta.put({
      ...entry,
      path: newPath,
    })
    await database.meta.delete(normalizedOld)
    await notifyPathChanged(normalizedOld)
    await notifyPathChanged(newPath)
  }
}

export const move = async (srcPath: FsPath, destPath: FsPath, options: MoveOptions = {}): Promise<void> => {
  await initFs()
  const src = normalizePath(srcPath)
  const dest = normalizePath(destPath)

  if (src === "/") throw new Error("Cannot move root directory")
  if (dest === "/") throw new Error("Cannot move to root directory")
  if (src === dest) return

  // Check if dest is inside src (would create a cycle)
  if (dest.startsWith(src + "/")) {
    throw new Error(`Cannot move ${src} into itself (${dest})`)
  }

  const srcEntry = await _getEntryRaw(src)
  if (!srcEntry) throw new Error(`Source path ${src} does not exist`)

  const destEntry = await _getEntryRaw(dest)
  if (destEntry) {
    if (!options.overwrite) throw new Error(`Destination path ${dest} already exists`)
    await _remove(dest, { recursive: true })
  }

  const destParent = parentPath(dest)
  await _ensureDirExists(destParent, { parents: true })

  const database = await ensureDbOpen()

  // Collect all paths for symlink updates
  const pathMappings: Array<{ oldPath: FsPath; newPath: FsPath }> = []

  const collectPathsRecursive = async (currentPath: FsPath, newBasePath: FsPath) => {
    pathMappings.push({ oldPath: currentPath, newPath: newBasePath })
    const entry = await _getEntryRaw(currentPath)
    if (entry?.type === "dir") {
      const children = await _getChildren(currentPath)
      for (const child of children) {
        const childName = entryName(child.path)
        const newChildPath = `${newBasePath}/${childName}` as FsPath
        await collectPathsRecursive(child.path, newChildPath)
      }
    }
  }
  await collectPathsRecursive(src, dest)

  // Move the entry and all children
  const moveRecursive = async (currentPath: FsPath, newPath: FsPath) => {
    const entry = await _getEntryRaw(currentPath)
    if (!entry) return

    if (entry.type === "dir") {
      const children = await _getChildren(currentPath)
      for (const child of children) {
        const childName = entryName(child.path)
        const newChildPath = `${newPath}/${childName}` as FsPath
        await moveRecursive(child.path, newChildPath)
      }
    } else if (entry.type === "file") {
      // Move file chunks
      const chunks = await database.chunks.where("path").equals(currentPath).toArray()
      for (const chunk of chunks) {
        const newKey = chunkKey(newPath, chunk.index)
        await database.chunks.put({
          ...chunk,
          key: newKey,
          path: newPath,
        })
        await database.chunks.delete(chunk.key)
      }
    }

    // Update the entry itself
    await database.meta.put({
      ...entry,
      path: newPath,
      parent: parentPath(newPath),
    })
    await database.meta.delete(currentPath)
  }

  await database.transaction("rw", database.meta, database.chunks, async () => {
    await moveRecursive(src, dest)
  })

  // Update all symlinks pointing to any moved paths
  for (const mapping of pathMappings) {
    await updateSymlinksPointingTo(mapping.oldPath, mapping.newPath)
  }

  await notifyPathChanged(src)
  await notifyPathChanged(dest)
}

export const copy = async (srcPath: FsPath, destPath: FsPath, options: CopyOptions = {}): Promise<void> => {
  await initFs()
  const src = normalizePath(srcPath)
  const dest = normalizePath(destPath)

  if (src === "/") throw new Error("Cannot copy root directory")
  if (dest === "/") throw new Error("Cannot copy to root directory")
  if (src === dest) throw new Error("Source and destination cannot be the same")

  // Check if dest is inside src (would create infinite recursion)
  if (dest.startsWith(src + "/")) {
    throw new Error(`Cannot copy ${src} into itself (${dest})`)
  }

  const srcEntry = options.followSymlinks ? (await _resolveLinkFully(src)).entry : await _getEntryRaw(src)

  if (!srcEntry) throw new Error(`Source path ${src} does not exist`)

  const destEntry = await _getEntryRaw(dest)
  if (destEntry) {
    if (!options.overwrite) throw new Error(`Destination path ${dest} already exists`)
    await _remove(dest, { recursive: true })
  }

  const destParent = parentPath(dest)
  await _ensureDirExists(destParent, { parents: true })

  const database = await ensureDbOpen()
  const now = Date.now()

  const copyRecursive = async (currentSrcPath: FsPath, currentDestPath: FsPath) => {
    const entry = options.followSymlinks
      ? (await _resolveLinkFully(currentSrcPath)).entry
      : await _getEntryRaw(currentSrcPath)

    if (!entry) return

    if (entry.type === "link" && !options.followSymlinks) {
      // Copy symlink as-is
      const linkEntry: StoredEntry = {
        path: currentDestPath,
        parent: parentPath(currentDestPath),
        type: "link",
        target: entry.target,
        created: now,
        modified: now,
      }
      await database.meta.put(linkEntry)
    } else if (entry.type === "dir") {
      // Create directory
      const dirEntry: StoredEntry = {
        path: currentDestPath,
        parent: parentPath(currentDestPath),
        type: "dir",
        created: now,
      }
      await database.meta.put(dirEntry)

      // Copy children
      const children = await _getChildren(entry.path)
      for (const child of children) {
        const childName = entryName(child.path)
        const newChildPath = `${currentDestPath}/${childName}` as FsPath
        await copyRecursive(child.path, newChildPath)
      }
    } else if (entry.type === "file") {
      // Copy file chunks
      const srcChunks = await _getChunks(entry.path)
      let chunkIndex = 0

      for (const srcChunk of srcChunks) {
        const newKey = chunkKey(currentDestPath, chunkIndex)
        await database.chunks.put({
          key: newKey,
          path: currentDestPath,
          index: chunkIndex,
          data: srcChunk.data,
        })
        chunkIndex++
      }

      // Create file entry
      const fileEntry: StoredEntry = {
        path: currentDestPath,
        parent: parentPath(currentDestPath),
        type: "file",
        created: now,
        modified: now,
        size: entry.size,
        mimeType: entry.mimeType,
        chunkCount: chunkIndex,
      }
      await database.meta.put(fileEntry)
    }
  }

  await database.transaction("rw", database.meta, database.chunks, async () => {
    await copyRecursive(src, dest)
  })

  await notifyPathChanged(dest)
}

// -----------------------------------------------------------------------------
// Utilities
// -----------------------------------------------------------------------------

export const encoder = new TextEncoder()

export async function concatChunks(chunks: StoredChunk[]): Promise<Uint8Array> {
  const buffers: Uint8Array[] = []
  let total = 0

  for (const chunk of chunks) {
    const buf = new Uint8Array(await chunk.data.arrayBuffer())
    buffers.push(buf)
    total += buf.byteLength
  }

  const merged = new Uint8Array(total)
  let offset = 0
  for (const buf of buffers) {
    merged.set(buf, offset)
    offset += buf.byteLength
  }
  return merged
}

export const toAsyncIterable = async function* (
  input: FileContent,
  chunkSize: number,
): AsyncGenerator<Uint8Array, void, unknown> {
  if (typeof input === "string") {
    const data = encoder.encode(input)
    yield* sliceBuffer(data, chunkSize)
    return
  }

  if (input instanceof Uint8Array) {
    yield* sliceBuffer(input, chunkSize)
    return
  }

  if (input instanceof ArrayBuffer) {
    yield* sliceBuffer(new Uint8Array(input), chunkSize)
    return
  }

  if (input instanceof Blob) {
    const stream = input.stream()
    for await (const chunk of stream as unknown as AsyncIterable<Uint8Array>) {
      yield chunk
    }
    return
  }

  if (isReadableStream(input)) {
    for await (const chunk of readableStreamToAsyncIterable(input)) {
      yield chunk
    }
    return
  }

  for await (const chunk of input as AsyncIterable<Uint8Array>) {
    yield chunk
  }
}

export const sliceBuffer = function* (data: Uint8Array, chunkSize: number) {
  for (let offset = 0; offset < data.byteLength; offset += chunkSize) {
    yield data.subarray(offset, Math.min(offset + chunkSize, data.byteLength))
  }
}

export const isReadableStream = (value: unknown): value is ReadableStream<Uint8Array> => {
  return typeof value === "object" && value !== null && typeof (value as ReadableStream).getReader === "function"
}

export const readableStreamToAsyncIterable = async function* (stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader()
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      if (value) yield value
    }
  } finally {
    reader.releaseLock()
  }
}
