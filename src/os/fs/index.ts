import Dexie, { Table } from "dexie"

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

type RemoveOptions = {
  recursive?: boolean
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

const ensureClient = () => {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB is not available in this environment")
  }
}

const db = new FsDexie()

const ensureDbOpen = async (): Promise<FsDexie> => {
  ensureClient()
  if (!db.isOpen()) {
    await db.open()
  }
  return db
}

/**
 * Default top-level folders created during {@link initFs}.
 */
export const DEFAULT_FOLDERS: FsPath[] = [
  "/Programs",
  "/Desktop",
  "/Documents",
  "/Pictures",
  "/Music",
  "/Videos",
  "/Downloads",
]

const subscribers = new Map<FsPath, Map<string, (entry: FsEntry | undefined) => void>>()

/**
 * Subscribe to changes for a specific path.
 *
 * Subscribers are notified whenever {@link notifySubscribers} is called for that path.
 *
 * @typeParam T - The expected entry type for the subscription callback (e.g. FileEntry, DirEntry).
 * @param path - Path to subscribe to.
 * @param callback - Called with the latest entry (or `undefined` if removed or missing).
 * @returns A function that unsubscribes this callback.
 */
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

const notifySubscribers = <T extends FsEntry>(path: FsPath, entry: T | undefined) => {
  const pathSubscribers = subscribers.get(path)

  if (pathSubscribers) {
    for (const callback of pathSubscribers.values()) {
      callback(entry)
    }
  }
}

/**
 * Finds all symlinks that point to the given target path.
 *
 * @param targetPath - The path that symlinks might be pointing to.
 * @returns Array of symlink entries that have this target.
 */
const findSymlinksToTarget = async (targetPath: FsPath): Promise<StoredEntry[]> => {
  const database = await ensureDbOpen()
  const allEntries = await database.meta.toArray()
  return allEntries.filter(
    (entry): entry is StoredEntry & { type: "link" } =>
      entry.type === "link" && normalizePath(entry.target) === targetPath,
  )
}

const notifyPathChanged = async (inputPath: FsPath) => {
  const path = normalizePath(inputPath)

  const { resolved, entry } = await resolveLink(path)
  notifySubscribers(path, entry as FsEntry | undefined)

  // If this is a symlink, also notify the resolved target
  if (resolved !== path) {
    notifySubscribers(resolved, entry as FsEntry | undefined)
  }

  // Notify parent directory (for listing updates)
  const p = parentPath(path)
  if (p !== path) {
    const parentEntry = await getEntryRaw(p)
    notifySubscribers(p, parentEntry as FsEntry | undefined)
  }

  // Reverse symlink notification: notify all symlinks pointing to this path
  const symlinksToThis = await findSymlinksToTarget(path)
  for (const symlinkEntry of symlinksToThis) {
    notifySubscribers(symlinkEntry.path, entry as FsEntry | undefined)
  }
}

/**
 * Initializes the filesystem database and ensures {@link DEFAULT_FOLDERS} exist.
 *
 * @returns Resolves once the DB is open and default folders are present.
 */
export const initFs = async () => {
  await ensureDbOpen()
  await ensureDefaultFolders()
}

const ensureDefaultFolders = async () => {
  for (const folderPath of DEFAULT_FOLDERS) {
    const existing = await getEntry(folderPath)
    if (!existing) {
      await mkdir(folderPath, { parents: true })
    }
  }
}

const normalizePath = (input: string): FsPath => {
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

/**
 * Returns the parent directory path.
 *
 * - `"/"` -> `"/"`
 * - `"/a"` -> `"/"`
 * - `"/a/b"` -> `"/a"`
 *
 * @param path - Input path.
 * @returns The parent path.
 */
export const parentPath = (path: FsPath): FsPath => {
  if (path === "/") return "/"
  const idx = path.lastIndexOf("/")
  if (idx <= 0) return "/"
  return (path.slice(0, idx) || "/") as FsPath
}

/**
 * Returns the last path segment (basename).
 *
 * - `"/"` -> `""`
 * - `"/a"` -> `"a"`
 * - `"/a/b"` -> `"b"`
 *
 * @param path - Input path.
 * @returns The entry name (basename).
 */
export const entryName = (path: FsPath): string => {
  if (path === "/") return ""
  const idx = path.lastIndexOf("/")
  return path.slice(idx + 1)
}

const chunkKey = (path: FsPath, index: number) => `${path}::${index.toString().padStart(8, "0")}`

/**
 * Reads an entry from the metadata store by path.
 *
 * @param path - Entry path.
 * @returns The stored entry, or `undefined` if it does not exist.
 */
export const getEntry = async (path: FsPath): Promise<StoredEntry | undefined> => {
  const database = await ensureDbOpen()
  return database.meta.get(path)
}

/**
 * Inserts or updates an entry in the metadata store.
 *
 * @param entry - Entry to persist.
 * @returns Resolves when the write is committed.
 */
export const putEntry = async (entry: StoredEntry) => {
  const database = await ensureDbOpen()
  await database.meta.put(entry)
}

/**
 * Deletes an entry from the metadata store by path.
 *
 * This does not delete file chunks; use {@link deleteChunks} if needed.
 *
 * @param path - Entry path.
 * @returns Resolves when deletion is committed.
 */
export const deleteEntry = async (path: FsPath) => {
  const database = await ensureDbOpen()
  await database.meta.delete(path)
}

/**
 * Lists direct children of a directory (by `parent` field).
 *
 * @param dir - Directory path.
 * @returns Array of stored entries that have `parent === dir`.
 */
export const getChildren = async (dir: FsPath): Promise<StoredEntry[]> => {
  const database = await ensureDbOpen()
  const children = await database.meta.where("parent").equals(dir).toArray()
  return children ?? []
}

/**
 * Deletes all stored file chunks for a given file path.
 *
 * @param path - File path whose chunks should be removed.
 * @returns Resolves when deletion is committed.
 */
export const deleteChunks = async (path: FsPath) => {
  const database = await ensureDbOpen()
  await database.chunks.where("path").equals(path).delete()
}

/**
 * Inserts or updates a single chunk record.
 *
 * @param chunk - Chunk record to persist.
 * @returns Resolves when the write is committed.
 */
export const putChunk = async (chunk: StoredChunk) => {
  const database = await ensureDbOpen()
  await database.chunks.put(chunk)
}

/**
 * Reads all chunks for a file path, sorted by chunk index.
 *
 * @param path - File path.
 * @returns Chunk records in ascending index order.
 */
export const getChunks = async (path: FsPath): Promise<StoredChunk[]> => {
  const database = await ensureDbOpen()
  const chunks = await database.chunks.where("path").equals(path).sortBy("index")
  return chunks ?? []
}

/**
 * Maximum number of symlink hops to follow before detecting a cycle.
 */
const MAX_SYMLINK_DEPTH = 40

/**
 * Resolves symlinks fully, following chains until a non-link entry is found.
 *
 * Includes cycle detection to prevent infinite loops.
 *
 * @param path - Path to resolve.
 * @param maxDepth - Maximum number of hops (defaults to {@link MAX_SYMLINK_DEPTH}).
 * @returns Object containing `resolved` path and `entry` at that resolved path.
 * @throws If a symlink cycle is detected.
 */
export const resolveLinkFully = async (
  path: FsPath,
  maxDepth: number = MAX_SYMLINK_DEPTH,
): Promise<{ resolved: FsPath; entry: StoredEntry | undefined }> => {
  const visited = new Set<FsPath>()
  let currentPath = normalizePath(path)

  for (let depth = 0; depth < maxDepth; depth++) {
    if (visited.has(currentPath)) {
      throw new Error(`Symlink cycle detected at ${currentPath}`)
    }
    visited.add(currentPath)

    const entry = await getEntry(currentPath)
    if (!entry) return { resolved: currentPath, entry: undefined }
    if (entry.type !== "link") return { resolved: currentPath, entry }

    currentPath = normalizePath(entry.target)
  }

  throw new Error(`Symlink chain too deep (exceeded ${maxDepth} hops) starting from ${path}`)
}

/**
 * Resolves symlinks fully, following chains until a non-link entry is found.
 *
 * This is an alias for {@link resolveLinkFully} for convenience.
 *
 * @param path - Path to resolve.
 * @returns Object containing `resolved` path and `entry` at that resolved path.
 */
export const resolveLink = async (path: FsPath): Promise<{ resolved: FsPath; entry: StoredEntry | undefined }> => {
  return resolveLinkFully(path)
}

/**
 * Resolves only a single symlink hop (does not follow chains).
 *
 * @param path - Path to resolve.
 * @returns Object containing `resolved` path (one hop) and `entry` at that path.
 */
export const resolveLinkSingle = async (
  path: FsPath,
): Promise<{ resolved: FsPath; entry: StoredEntry | undefined }> => {
  const entry = await getEntry(path)
  if (!entry) return { resolved: path, entry: undefined }
  if (entry.type !== "link") return { resolved: path, entry }

  const targetPath = normalizePath(entry.target)
  const targetEntry = await getEntry(targetPath)
  return { resolved: targetPath, entry: targetEntry }
}

/**
 * Updates all symlinks that point to `oldTarget` to point to `newTarget`.
 *
 * @param oldTarget - The old target path.
 * @param newTarget - The new target path.
 * @returns The number of symlinks updated.
 */
const updateSymlinksPointingTo = async (oldTarget: FsPath, newTarget: FsPath): Promise<number> => {
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

/**
 * Checks if a path exists (resolving symlinks).
 *
 * @param inputPath - Path to check.
 * @returns `true` if the path exists (after resolving symlinks), `false` otherwise.
 */
export const exists = async (inputPath: FsPath): Promise<boolean> => {
  const path = normalizePath(inputPath)
  try {
    const { entry } = await resolveLinkFully(path)
    return entry !== undefined
  } catch {
    // Cycle detection throws, treat as non-existent
    return false
  }
}

/**
 * Checks if a path exists without resolving symlinks.
 *
 * @param inputPath - Path to check.
 * @returns `true` if the path exists (including broken symlinks), `false` otherwise.
 */
export const lexists = async (inputPath: FsPath): Promise<boolean> => {
  const path = normalizePath(inputPath)
  const entry = await getEntryRaw(path)
  return entry !== undefined
}

/**
 * Reads an entry from the metadata store without link resolution.
 *
 * @param path - Entry path.
 * @returns The stored entry, or `undefined` if it does not exist.
 */
export const getEntryRaw = async (path: FsPath): Promise<StoredEntry | undefined> => {
  const database = await ensureDbOpen()
  return database.meta.get(path)
}

/**
 * Shared UTF-8 encoder used by {@link toAsyncIterable} when the input is a string.
 */
export const encoder = new TextEncoder()

/**
 * Converts supported file content inputs into an async iterable of byte chunks.
 *
 * @param input - File content: string, ArrayBuffer, Uint8Array, Blob, ReadableStream, or AsyncIterable of Uint8Array.
 * @param chunkSize - Chunk size used for string/ArrayBuffer/Uint8Array slicing.
 * @returns An async generator yielding Uint8Array chunks.
 */
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

/**
 * Slices a Uint8Array into subarrays of at most `chunkSize`.
 *
 * @param data - Source byte array.
 * @param chunkSize - Maximum chunk size in bytes.
 * @returns A sync generator yielding Uint8Array views into `data`.
 */
export const sliceBuffer = function* (data: Uint8Array, chunkSize: number) {
  for (let offset = 0; offset < data.byteLength; offset += chunkSize) {
    yield data.subarray(offset, Math.min(offset + chunkSize, data.byteLength))
  }
}

/**
 * Type guard for `ReadableStream<Uint8Array>`.
 *
 * @param value - Value to test.
 * @returns `true` if the value looks like a ReadableStream (has `getReader()`), otherwise `false`.
 */
export const isReadableStream = (value: unknown): value is ReadableStream<Uint8Array> => {
  return typeof value === "object" && value !== null && typeof (value as ReadableStream).getReader === "function"
}

/**
 * Converts a `ReadableStream<Uint8Array>` into an `AsyncIterable<Uint8Array>`.
 *
 * @param stream - ReadableStream to consume.
 * @returns An async generator yielding Uint8Array chunks from the stream.
 */
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

/**
 * Ensures that a directory exists at `path`.
 *
 * If the directory is missing, it is created. If `parents` is true, parent directories are created as needed.
 * Resolves symlinks when checking for existing directories.
 * Throws if the path exists and is not a directory.
 *
 * @param path - Directory path to ensure.
 * @param options.parents - If true, recursively create missing parents.
 * @returns Resolves when the directory exists.
 */
export const ensureDirExists = async (path: FsPath, { parents }: { parents?: boolean }) => {
  if (path === "/") return

  // Resolve symlinks to check if the path already exists as a directory
  const { entry: existing } = await resolveLinkFully(path)
  if (existing) {
    if (existing.type !== "dir") throw new Error(`Path ${path} exists and is not a directory`)
    return
  }

  // Check if there's a broken symlink at this path
  const rawEntry = await getEntryRaw(path)
  if (rawEntry && rawEntry.type === "link") {
    throw new Error(`Path ${path} is a broken symlink`)
  }

  const parent = parentPath(path)
  if (parent !== "/") {
    // Resolve symlinks in parent path
    const { entry: parentEntry, resolved: parentResolved } = await resolveLinkFully(parent)
    if (!parentEntry) {
      if (!parents) throw new Error(`Parent directory ${parent} does not exist`)
      await ensureDirExists(parent, { parents: true })
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
  await putEntry(dir)
}

/**
 * Creates a directory.
 *
 * This normalizes the input path and creates the directory if missing.
 * If `parents` is true, missing parent directories are created.
 *
 * @param inputPath - Directory path.
 * @param options.parents - If true, recursively create missing parents.
 * @returns Resolves when the directory exists.
 */
export const mkdir = async (inputPath: FsPath, options: { parents?: boolean } = {}) => {
  const path = normalizePath(inputPath)
  if (path === "/") return
  await ensureDirExists(path, { parents: options.parents })
  await notifyPathChanged(path)
}

/**
 * Creates a symlink entry at `linkPath` pointing to `targetPath`.
 *
 * - Requires the parent directory of the link to exist (or be created if `parents` is true).
 * - Disallows creating symlinks at root (`"/"`).
 * - Disallows linking to another symlink.
 *
 * @param linkPath - Where the symlink entry should be created.
 * @param targetPath - Target path the link points to.
 * @param options.parents - If true, create missing parent directories for `linkPath`.
 * @returns Resolves when the symlink is created.
 */
export const symlink = async (linkPath: FsPath, targetPath: FsPath, options: { parents?: boolean } = {}) => {
  const link = normalizePath(linkPath)
  const target = normalizePath(targetPath)

  if (link === "/") throw new Error("Cannot create symlink at root")

  const parent = parentPath(link)
  await ensureDirExists(parent, { parents: options.parents ?? false })

  const existingLink = await getEntry(link)
  if (existingLink) {
    if (existingLink.type === "dir") throw new Error(`Cannot create symlink, ${link} is a directory`)
    if (existingLink.type === "file") throw new Error(`Cannot create symlink, ${link} is a file`)
    throw new Error(`Symlink already exists at ${link}`)
  }

  const targetEntry = await getEntryRaw(target)
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
  }
  await putEntry(linkEntry)
  await notifyPathChanged(link)
}

/**
 * Reads a symlink target without resolving it.
 *
 * @param inputPath - Path expected to be a symlink.
 * @returns The stored target path, or `undefined` if the entry does not exist.
 * @throws If the entry exists but is not a symlink.
 */
export const readlink = async (inputPath: FsPath): Promise<FsPath | undefined> => {
  const path = normalizePath(inputPath)
  const entry = await getEntryRaw(path)
  if (!entry) return undefined
  if (entry.type !== "link") throw new Error(`${path} is not a symlink`)
  return entry.target
}

/**
 * Returns metadata for a path, resolving a single symlink hop if present.
 *
 * @param inputPath - Path to stat.
 * @returns The resolved entry, or `undefined` if it does not exist.
 */
export const stat = async (inputPath: FsPath): Promise<FsEntry | undefined> => {
  const path = normalizePath(inputPath)
  const { entry } = await resolveLink(path)
  return entry ?? undefined
}

/**
 * Returns metadata for a path without resolving symlinks.
 *
 * @param inputPath - Path to lstat.
 * @returns The raw entry, or `undefined` if it does not exist.
 */
export const lstat = async (inputPath: FsPath): Promise<FsEntry | undefined> => {
  const path = normalizePath(inputPath)
  const entry = await getEntryRaw(path)
  return entry ?? undefined
}

/**
 * Lists directory contents (direct children), sorted by basename.
 *
 * If `inputPath` is a symlink, it is resolved and the target directory is listed.
 *
 * @param inputPath - Directory path to list. Defaults to `"/"`.
 * @returns Array of entries under the directory.
 * @throws If the directory does not exist or the path is not a directory.
 */
export const list = async (inputPath: FsPath = "/"): Promise<FsEntry[]> => {
  const path = normalizePath(inputPath)
  let targetPath = path

  if (path !== "/") {
    const { resolved, entry } = await resolveLink(path)
    if (!entry) throw new Error(`Directory ${path} does not exist`)
    if (entry.type !== "dir") throw new Error(`${path} is not a directory`)
    targetPath = resolved
  }

  const children = await getChildren(targetPath)
  return children.sort((a, b) => entryName(a.path).localeCompare(entryName(b.path)))
}

/**
 * Writes file content to a path (creating or overwriting).
 *
 * Data is stored chunked in the chunks store and metadata is stored in the meta store.
 * If the target path is a symlink, the symlink is resolved and the target file is written.
 *
 * @param inputPath - File path to write to.
 * @param data - File content to write (string, bytes, Blob, stream, or async iterable).
 * @param options.mimeType - MIME type stored with the file metadata.
 * @param options.chunkSize - Chunk size used for chunking (defaults to {@link DEFAULT_CHUNK_SIZE}).
 * @param options.parents - If true, create missing parent directories.
 * @returns Resolves when the write transaction is committed.
 * @throws If the path resolves to a directory.
 */
export const writeFile = async (inputPath: FsPath, data: FileContent, options: WriteOptions = {}) => {
  const inputNormalized = normalizePath(inputPath)

  const rawEntry = await getEntryRaw(inputNormalized)
  const isLink = rawEntry?.type === "link"
  const { resolved: path, entry: existing } = await resolveLink(inputNormalized)

  const now = Date.now()
  const parent = isLink ? parentPath(path) : parentPath(inputNormalized)

  if (!isLink) {
    await ensureDirExists(parent, { parents: options.parents ?? false })
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

/**
 * Writes a file from a stream or async iterable of bytes.
 *
 * This is a convenience wrapper around {@link writeFile}.
 *
 * @param inputPath - File path to write to.
 * @param source - ReadableStream or AsyncIterable that yields Uint8Array chunks.
 * @param options - See {@link writeFile} options.
 * @returns Resolves when the write transaction is committed.
 */
export const writeFileStream = async (
  inputPath: FsPath,
  source: ReadableStream<Uint8Array> | AsyncIterable<Uint8Array>,
  options: WriteOptions = {},
) => {
  return writeFile(inputPath, source, options)
}

/**
 * Concatenates chunk blobs into a single contiguous Uint8Array.
 *
 * @param chunks - Chunk records in the order they should be concatenated.
 * @returns A Uint8Array containing the combined bytes.
 */
export const concatChunks = async (chunks: StoredChunk[]): Promise<Uint8Array> => {
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

/**
 * Reads a file and returns it as ArrayBuffer (default), text, or Blob.
 *
 * If `inputPath` is a symlink, the symlink is resolved and the target file is read.
 *
 * @param inputPath - File path to read.
 * @param options.as - Output type: `"arrayBuffer"` (default), `"text"`, or `"blob"`.
 * @returns The file contents in the requested format, or `undefined` if the file does not exist.
 * @throws If the path does not resolve to a file.
 */
export const readFile = async (
  inputPath: FsPath,
  options: ReadOptions = {},
): Promise<ArrayBuffer | string | Blob | undefined> => {
  const inputNormalized = normalizePath(inputPath)
  const { resolved: path, entry } = await resolveLink(inputNormalized)
  if (!entry) return undefined
  if (entry.type !== "file") throw new Error(`${path} is not a file`)

  const chunks = await getChunks(path)
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

/**
 * Reads a file as a ReadableStream of stored chunks.
 *
 * If `inputPath` is a symlink, the symlink is resolved and the target file is read.
 *
 * @param inputPath - File path to read.
 * @returns A ReadableStream that emits file chunks in order.
 * @throws If the file does not exist or the path does not resolve to a file.
 */
export const readFileStream = async (inputPath: FsPath): Promise<ReadableStream<Uint8Array>> => {
  const inputNormalized = normalizePath(inputPath)
  const { resolved: path, entry } = await resolveLink(inputNormalized)
  if (!entry) throw new Error(`File ${inputNormalized} not found`)
  if (entry.type !== "file") throw new Error(`${path} is not a file`)

  const chunks = await getChunks(path)
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

/**
 * Removes a file, directory, or symlink.
 *
 * - Symlink: deletes only the link entry.
 * - File: deletes metadata and all chunks.
 * - Directory: deletes directory entry; if `recursive` is true, deletes the entire subtree.
 *
 * @param inputPath - Path to remove.
 * @param options.recursive - If true, remove non-empty directories recursively.
 * @returns Resolves when deletion is committed.
 * @throws If attempting to remove `"/"` or a non-empty directory without `recursive`.
 */
export const remove = async (inputPath: FsPath, options: RemoveOptions = {}) => {
  const path = normalizePath(inputPath)
  if (path === "/") throw new Error("Cannot remove root directory")
  const entry = await getEntryRaw(path)
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

  const children = await getChildren(path)
  if (children.length > 0 && !options.recursive) {
    throw new Error(`Directory ${path} is not empty`)
  }

  for (const child of children) {
    await remove(child.path, options)
  }

  await database.meta.delete(path)
  await notifyPathChanged(path)
}

/**
 * Clears the entire filesystem database (all entries and chunks).
 *
 * @returns Resolves when the clear transaction is committed.
 */
export const clear = async () => {
  const database = await ensureDbOpen()
  await database.transaction("rw", database.meta, database.chunks, async () => {
    await database.meta.clear()
    await database.chunks.clear()
  })
}

/**
 * Renames an entry (file, directory, or symlink) to `newName` within the same parent directory.
 *
 * For directories, this updates all descendant paths and chunk records.
 * For files, this updates chunk keys/paths and metadata.
 *
 * @param oldPath - Existing path to rename.
 * @param newName - New basename (no slashes).
 * @returns Resolves when the rename transaction is committed.
 * @throws If `oldPath` is `"/"`, missing, or the target path already exists.
 */
export const rename = async (oldPath: FsPath, newName: string): Promise<void> => {
  const normalizedOld = normalizePath(oldPath)
  if (normalizedOld === "/") throw new Error("Cannot rename root directory")

  const entry = await getEntryRaw(normalizedOld)
  if (!entry) throw new Error(`Path ${normalizedOld} does not exist`)

  const parent = parentPath(normalizedOld)
  const newPath = (parent === "/" ? `/${newName}` : `${parent}/${newName}`) as FsPath

  const existingAtNew = await getEntryRaw(newPath)
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
      const children = await getChildren(currentPath)
      for (const child of children) {
        const childName = entryName(child.path)
        const newChildPath = `${newBasePath}/${childName}` as FsPath
        await collectPaths(child.path, newChildPath)
      }
    }
    await collectPaths(normalizedOld, newPath)

    const renameRecursive = async (currentPath: FsPath, newBasePath: FsPath) => {
      const children = await getChildren(currentPath)

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

type MoveOptions = {
  /** If true, overwrite existing destination. */
  overwrite?: boolean
}

/**
 * Moves a file, directory, or symlink to a new location.
 *
 * Unlike {@link rename}, this supports moving to a different parent directory.
 * Symlinks pointing to the source are updated to point to the destination.
 *
 * @param srcPath - Source path to move.
 * @param destPath - Destination path.
 * @param options.overwrite - If true, overwrite existing destination.
 * @returns Resolves when the move is complete.
 * @throws If source doesn't exist, or destination exists and overwrite is false.
 */
export const move = async (srcPath: FsPath, destPath: FsPath, options: MoveOptions = {}): Promise<void> => {
  const src = normalizePath(srcPath)
  const dest = normalizePath(destPath)

  if (src === "/") throw new Error("Cannot move root directory")
  if (dest === "/") throw new Error("Cannot move to root directory")
  if (src === dest) return

  // Check if dest is inside src (would create a cycle)
  if (dest.startsWith(src + "/")) {
    throw new Error(`Cannot move ${src} into itself (${dest})`)
  }

  const srcEntry = await getEntryRaw(src)
  if (!srcEntry) throw new Error(`Source path ${src} does not exist`)

  const destEntry = await getEntryRaw(dest)
  if (destEntry) {
    if (!options.overwrite) throw new Error(`Destination path ${dest} already exists`)
    await remove(dest, { recursive: true })
  }

  const destParent = parentPath(dest)
  await ensureDirExists(destParent, { parents: true })

  const database = await ensureDbOpen()

  // Collect all paths for symlink updates
  const pathMappings: Array<{ oldPath: FsPath; newPath: FsPath }> = []

  const collectPathsRecursive = async (currentPath: FsPath, newBasePath: FsPath) => {
    pathMappings.push({ oldPath: currentPath, newPath: newBasePath })
    const entry = await getEntryRaw(currentPath)
    if (entry?.type === "dir") {
      const children = await getChildren(currentPath)
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
    const entry = await getEntryRaw(currentPath)
    if (!entry) return

    if (entry.type === "dir") {
      const children = await getChildren(currentPath)
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

type CopyOptions = {
  /** If true, overwrite existing destination. */
  overwrite?: boolean
  /** If true, follow symlinks and copy their targets. If false, copy symlinks as symlinks. */
  followSymlinks?: boolean
}

/**
 * Copies a file, directory, or symlink to a new location.
 *
 * @param srcPath - Source path to copy.
 * @param destPath - Destination path.
 * @param options.overwrite - If true, overwrite existing destination.
 * @param options.followSymlinks - If true, copy symlink targets. If false (default), copy symlinks as symlinks.
 * @returns Resolves when the copy is complete.
 * @throws If source doesn't exist, or destination exists and overwrite is false.
 */
export const copy = async (srcPath: FsPath, destPath: FsPath, options: CopyOptions = {}): Promise<void> => {
  const src = normalizePath(srcPath)
  const dest = normalizePath(destPath)

  if (src === "/") throw new Error("Cannot copy root directory")
  if (dest === "/") throw new Error("Cannot copy to root directory")
  if (src === dest) throw new Error("Source and destination cannot be the same")

  // Check if dest is inside src (would create infinite recursion)
  if (dest.startsWith(src + "/")) {
    throw new Error(`Cannot copy ${src} into itself (${dest})`)
  }

  const srcEntry = options.followSymlinks ? (await resolveLinkFully(src)).entry : await getEntryRaw(src)

  if (!srcEntry) throw new Error(`Source path ${src} does not exist`)

  const destEntry = await getEntryRaw(dest)
  if (destEntry) {
    if (!options.overwrite) throw new Error(`Destination path ${dest} already exists`)
    await remove(dest, { recursive: true })
  }

  const destParent = parentPath(dest)
  await ensureDirExists(destParent, { parents: true })

  const database = await ensureDbOpen()
  const now = Date.now()

  const copyRecursive = async (currentSrcPath: FsPath, currentDestPath: FsPath) => {
    const entry = options.followSymlinks
      ? (await resolveLinkFully(currentSrcPath)).entry
      : await getEntryRaw(currentSrcPath)

    if (!entry) return

    if (entry.type === "link" && !options.followSymlinks) {
      // Copy symlink as-is
      const linkEntry: StoredEntry = {
        path: currentDestPath,
        parent: parentPath(currentDestPath),
        type: "link",
        target: entry.target,
        created: now,
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
      const children = await getChildren(entry.path)
      for (const child of children) {
        const childName = entryName(child.path)
        const newChildPath = `${currentDestPath}/${childName}` as FsPath
        await copyRecursive(child.path, newChildPath)
      }
    } else if (entry.type === "file") {
      // Copy file chunks
      const srcChunks = await getChunks(entry.path)
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
