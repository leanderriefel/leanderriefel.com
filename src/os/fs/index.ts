const DB_NAME = "os-fs"
const DB_VERSION = 1
const META_STORE = "meta"
const CHUNK_STORE = "chunks"
const DEFAULT_CHUNK_SIZE = 256 * 1024

type EntryType = "file" | "dir"

export type FsPath = string

export type FileContent =
  | string
  | ArrayBuffer
  | Uint8Array
  | Blob
  | ReadableStream<Uint8Array>
  | AsyncIterable<Uint8Array>

export interface BaseEntry {
  path: FsPath
  name: string
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

export type FsEntry = FileEntry | DirEntry

type StoredEntry = (FileEntry | DirEntry) & {
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

let dbPromise: Promise<IDBDatabase> | null = null

const ensureClient = () => {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB is not available in this environment")
  }
}

const openDb = (): Promise<IDBDatabase> => {
  ensureClient()

  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error ?? new Error("Failed to open fs database"))

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(META_STORE)) {
        const metaStore = db.createObjectStore(META_STORE, { keyPath: "path" })
        metaStore.createIndex("byParent", "parent", { unique: false })
      }
      if (!db.objectStoreNames.contains(CHUNK_STORE)) {
        const chunkStore = db.createObjectStore(CHUNK_STORE, { keyPath: "key" })
        chunkStore.createIndex("byPath", "path", { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
  })

  return dbPromise
}

export const initFs = async () => {
  await openDb()
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

  return "/" + stack.join("/")
}

const parentPath = (path: FsPath): FsPath => {
  if (path === "/") return "/"
  const idx = path.lastIndexOf("/")
  if (idx <= 0) return "/"
  return path.slice(0, idx) || "/"
}

const entryName = (path: FsPath): string => {
  if (path === "/") return ""
  const idx = path.lastIndexOf("/")
  return path.slice(idx + 1)
}

const chunkKey = (path: FsPath, index: number) => `${path}::${index.toString().padStart(8, "0")}`

const withStore = <T>(
  storeName: string | string[],
  mode: IDBTransaction["mode"],
  handler: (tx: IDBTransaction) => Promise<T>,
): Promise<T> =>
  openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, mode)
        const done = new Promise<void>((res, rej) => {
          tx.oncomplete = () => res()
          tx.onabort = () => rej(tx.error ?? new Error("IndexedDB transaction aborted"))
          tx.onerror = () => rej(tx.error ?? new Error("IndexedDB transaction failed"))
        })

        handler(tx)
          .then((result) => done.then(() => resolve(result)))
          .catch((err) => {
            tx.abort()
            reject(err)
          })
      }),
  )

const getEntry = async (path: FsPath): Promise<StoredEntry | undefined> => {
  return withStore(META_STORE, "readonly", async (tx) => {
    const store = tx.objectStore(META_STORE)
    const request = store.get(path)
    return new Promise((resolve, reject) => {
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result as StoredEntry | undefined)
    })
  })
}

const putEntry = async (entry: StoredEntry) => {
  return withStore(META_STORE, "readwrite", async (tx) => {
    const store = tx.objectStore(META_STORE)
    const request = store.put(entry)
    return new Promise<void>((resolve, reject) => {
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  })
}

const deleteEntry = async (path: FsPath) => {
  return withStore(META_STORE, "readwrite", async (tx) => {
    const store = tx.objectStore(META_STORE)
    const request = store.delete(path)
    return new Promise<void>((resolve, reject) => {
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  })
}

const getChildren = async (dir: FsPath): Promise<StoredEntry[]> => {
  return withStore(META_STORE, "readonly", async (tx) => {
    const store = tx.objectStore(META_STORE)
    const index = store.index("byParent")
    const request = index.getAll(dir)
    return new Promise((resolve, reject) => {
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve((request.result as StoredEntry[] | undefined) ?? [])
    })
  })
}

const deleteChunks = async (path: FsPath) => {
  return withStore(CHUNK_STORE, "readwrite", async (tx) => {
    const store = tx.objectStore(CHUNK_STORE)
    const index = store.index("byPath")
    const request = index.getAllKeys(path)
    const keys = await new Promise<string[]>((resolve, reject) => {
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve((request.result as string[]) ?? [])
    })

    for (const key of keys) {
      store.delete(key)
    }
  })
}

const putChunk = async (chunk: StoredChunk) => {
  return withStore(CHUNK_STORE, "readwrite", async (tx) => {
    const store = tx.objectStore(CHUNK_STORE)
    const request = store.put(chunk)
    return new Promise<void>((resolve, reject) => {
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  })
}

const getChunks = async (path: FsPath): Promise<StoredChunk[]> => {
  return withStore(CHUNK_STORE, "readonly", async (tx) => {
    const store = tx.objectStore(CHUNK_STORE)
    const index = store.index("byPath")
    const request = index.getAll(path)
    return new Promise((resolve, reject) => {
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const result = (request.result as StoredChunk[] | undefined) ?? []
        resolve(result.sort((a, b) => a.index - b.index))
      }
    })
  })
}

const encoder = new TextEncoder()

const toAsyncIterable = async function* (
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

const sliceBuffer = function* (data: Uint8Array, chunkSize: number) {
  for (let offset = 0; offset < data.byteLength; offset += chunkSize) {
    yield data.subarray(offset, Math.min(offset + chunkSize, data.byteLength))
  }
}

const isReadableStream = (value: unknown): value is ReadableStream<Uint8Array> => {
  return typeof value === "object" && value !== null && typeof (value as ReadableStream).getReader === "function"
}

const readableStreamToAsyncIterable = async function* (stream: ReadableStream<Uint8Array>) {
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

const ensureDirExists = async (path: FsPath, { parents }: { parents?: boolean }) => {
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
    name: entryName(path),
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

export const stat = async (inputPath: FsPath): Promise<FsEntry | undefined> => {
  const path = normalizePath(inputPath)
  const entry = await getEntry(path)
  return entry ?? undefined
}

export const list = async (inputPath: FsPath = "/"): Promise<FsEntry[]> => {
  const path = normalizePath(inputPath)
  if (path !== "/") {
    const dir = await getEntry(path)
    if (!dir) throw new Error(`Directory ${path} does not exist`)
    if (dir.type !== "dir") throw new Error(`${path} is not a directory`)
  }
  const children = await getChildren(path)
  return children.sort((a, b) => a.name.localeCompare(b.name))
}

const writeChunks = async (
  path: FsPath,
  content: FileContent,
  chunkSize: number,
): Promise<{ size: number; chunkCount: number }> => {
  let chunkCount = 0
  let totalSize = 0

  await deleteChunks(path)

  for await (const chunk of toAsyncIterable(content, chunkSize)) {
    const data = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk)
    const bytes = data.slice()
    totalSize += bytes.byteLength
    const record: StoredChunk = {
      key: chunkKey(path, chunkCount),
      path,
      index: chunkCount,
      data: new Blob([bytes]),
    }
    await putChunk(record)
    chunkCount++
  }

  return { size: totalSize, chunkCount }
}

export const writeFile = async (inputPath: FsPath, data: FileContent, options: WriteOptions = {}) => {
  const path = normalizePath(inputPath)
  const now = Date.now()
  const parent = parentPath(path)

  await ensureDirExists(parent, { parents: options.parents ?? false })

  const existing = await getEntry(path)
  if (existing && existing.type === "dir") throw new Error(`Cannot write file, ${path} is a directory`)

  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE
  const { size, chunkCount } = await writeChunks(path, data, chunkSize)

  const fileEntry: StoredEntry = {
    path,
    name: entryName(path),
    parent,
    type: "file",
    created: existing?.created ?? now,
    modified: now,
    size,
    mimeType: options.mimeType,
    chunkCount,
  }

  await putEntry(fileEntry)
}

export const writeFileStream = async (
  inputPath: FsPath,
  source: ReadableStream<Uint8Array> | AsyncIterable<Uint8Array>,
  options: WriteOptions = {},
) => {
  return writeFile(inputPath, source, options)
}

const concatChunks = async (chunks: StoredChunk[]): Promise<Uint8Array> => {
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
  const path = normalizePath(inputPath)
  const entry = await getEntry(path)
  if (!entry) return undefined
  if (entry.type !== "file") throw new Error(`${path} is a directory`)

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
  const path = normalizePath(inputPath)
  const entry = await getEntry(path)
  if (!entry) throw new Error(`File ${path} not found`)
  if (entry.type !== "file") throw new Error(`${path} is a directory`)

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
  const entry = await getEntry(path)
  if (!entry) return

  if (entry.type === "file") {
    await deleteChunks(path)
    await deleteEntry(path)
    return
  }

  const children = await getChildren(path)
  if (children.length > 0 && !options.recursive) {
    throw new Error(`Directory ${path} is not empty`)
  }

  for (const child of children) {
    await remove(child.path, options)
  }

  await deleteEntry(path)
}

export const clear = async () => {
  await withStore([META_STORE, CHUNK_STORE], "readwrite", async (tx) => {
    tx.objectStore(META_STORE).clear()
    tx.objectStore(CHUNK_STORE).clear()
    return Promise.resolve()
  })
}
