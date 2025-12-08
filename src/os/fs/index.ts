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

export const DEFAULT_FOLDERS: FsPath[] = ["/Desktop", "/Documents", "/Pictures", "/Music", "/Videos", "/Downloads"]

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

export const getEntry = async (path: FsPath): Promise<StoredEntry | undefined> => {
  const database = await ensureDbOpen()
  return database.meta.get(path)
}

export const putEntry = async (entry: StoredEntry) => {
  const database = await ensureDbOpen()
  await database.meta.put(entry)
}

export const deleteEntry = async (path: FsPath) => {
  const database = await ensureDbOpen()
  await database.meta.delete(path)
}

export const getChildren = async (dir: FsPath): Promise<StoredEntry[]> => {
  const database = await ensureDbOpen()
  const children = await database.meta.where("parent").equals(dir).toArray()
  return children ?? []
}

export const deleteChunks = async (path: FsPath) => {
  const database = await ensureDbOpen()
  await database.chunks.where("path").equals(path).delete()
}

export const putChunk = async (chunk: StoredChunk) => {
  const database = await ensureDbOpen()
  await database.chunks.put(chunk)
}

export const getChunks = async (path: FsPath): Promise<StoredChunk[]> => {
  const database = await ensureDbOpen()
  const chunks = await database.chunks.where("path").equals(path).sortBy("index")
  return chunks ?? []
}

export const resolveLink = async (path: FsPath): Promise<{ resolved: FsPath; entry: StoredEntry | undefined }> => {
  const entry = await getEntry(path)
  if (!entry) return { resolved: path, entry: undefined }
  if (entry.type !== "link") return { resolved: path, entry }

  const targetPath = normalizePath(entry.target)
  const targetEntry = await getEntry(targetPath)
  return { resolved: targetPath, entry: targetEntry }
}

export const getEntryRaw = async (path: FsPath): Promise<StoredEntry | undefined> => {
  const database = await ensureDbOpen()
  return database.meta.get(path)
}

export const encoder = new TextEncoder()

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

export const ensureDirExists = async (path: FsPath, { parents }: { parents?: boolean }) => {
  if (path === "/") return

  const existing = await getEntry(path)
  if (existing) {
    if (existing.type !== "dir") throw new Error(`Path ${path} exists and is not a directory`)
    return
  }

  const parent = parentPath(path)
  if (parent !== "/") {
    if (!parents) throw new Error(`Parent directory ${parent} does not exist`)
    await ensureDirExists(parent, { parents: true })
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

export const mkdir = async (inputPath: FsPath, options: { parents?: boolean } = {}) => {
  const path = normalizePath(inputPath)
  if (path === "/") return
  await ensureDirExists(path, { parents: options.parents })
}

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
}

export const readlink = async (inputPath: FsPath): Promise<FsPath | undefined> => {
  const path = normalizePath(inputPath)
  const entry = await getEntryRaw(path)
  if (!entry) return undefined
  if (entry.type !== "link") throw new Error(`${path} is not a symlink`)
  return entry.target
}

export const stat = async (inputPath: FsPath): Promise<FsEntry | undefined> => {
  const path = normalizePath(inputPath)
  const { entry } = await resolveLink(path)
  return entry ?? undefined
}

export const lstat = async (inputPath: FsPath): Promise<FsEntry | undefined> => {
  const path = normalizePath(inputPath)
  const entry = await getEntryRaw(path)
  return entry ?? undefined
}

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
}

export const writeFileStream = async (
  inputPath: FsPath,
  source: ReadableStream<Uint8Array> | AsyncIterable<Uint8Array>,
  options: WriteOptions = {},
) => {
  return writeFile(inputPath, source, options)
}

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

export const remove = async (inputPath: FsPath, options: RemoveOptions = {}) => {
  const path = normalizePath(inputPath)
  if (path === "/") throw new Error("Cannot remove root directory")
  const entry = await getEntryRaw(path)
  if (!entry) return

  const database = await ensureDbOpen()

  if (entry.type === "link") {
    await database.meta.delete(path)
    return
  }

  if (entry.type === "file") {
    await database.transaction("rw", database.meta, database.chunks, async () => {
      await database.chunks.where("path").equals(path).delete()
      await database.meta.delete(path)
    })
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
}

export const clear = async () => {
  const database = await ensureDbOpen()
  await database.transaction("rw", database.meta, database.chunks, async () => {
    await database.meta.clear()
    await database.chunks.clear()
  })
}

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
    return
  }

  if (entry.type === "dir") {
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
    return
  }

  if (entry.type === "link") {
    await database.meta.put({
      ...entry,
      path: newPath,
    })
    await database.meta.delete(normalizedOld)
  }
}
