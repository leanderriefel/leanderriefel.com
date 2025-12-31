import Dexie, { Table } from "dexie"
import { createSignal, onCleanup, Accessor } from "solid-js"

// All types supported by IndexedDB's structured clone algorithm
export type Primitive = null | undefined | boolean | number | bigint | string

export type StructuredCloneable =
  | Primitive
  | Date
  | RegExp
  | ArrayBuffer
  | DataView
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array
  | BigInt64Array
  | BigUint64Array
  | Blob
  | File
  | Map<StructuredCloneable, StructuredCloneable>
  | Set<StructuredCloneable>
  | StructuredCloneable[]
  | { [key: string]: StructuredCloneable }

export type RegistryValue = StructuredCloneable

const DB_NAME = "os-registry"
const DB_VERSION = 2
const STORE_NAME = "state"

type Subscriber<T extends RegistryValue> = (value: T | undefined) => void
type SubscriberMap = Map<string, Set<Subscriber<RegistryValue>>>

const subscribers: SubscriberMap = new Map()

class RegistryDexie extends Dexie {
  state!: Table<RegistryValue, string>

  constructor() {
    super(DB_NAME)
    this.version(DB_VERSION).stores({
      [STORE_NAME]: "",
    })
  }
}

const ensureClient = () => {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB is not available in this environment")
  }
}

const db = new RegistryDexie()

const ensureDbOpen = async (): Promise<RegistryDexie> => {
  ensureClient()
  if (!db.isOpen()) {
    await db.open()
  }
  return db
}

const notifySubscribers = <T extends RegistryValue>(key: string, value: T | undefined): void => {
  const keySubscribers = subscribers.get(key)
  if (keySubscribers) {
    for (const callback of keySubscribers) {
      callback(value)
    }
  }
}

// -----------------------------------------------------------------------------
// Initialization
// -----------------------------------------------------------------------------

let registryInitPromise: Promise<void> | null = null

export const initRegistry = async () => {
  if (!registryInitPromise) {
    registryInitPromise = (async () => {
      await ensureDbOpen()
    })()
  }
  return registryInitPromise
}

// -----------------------------------------------------------------------------
// Internal Core Operations (No Init Check)
// -----------------------------------------------------------------------------

const _write = async <T extends RegistryValue>(key: string, value: T): Promise<void> => {
  const database = await ensureDbOpen()
  await database.state.put(value, key)
  notifySubscribers(key, value)
}

const _read = async <T extends RegistryValue>(key: string): Promise<T | undefined> => {
  const database = await ensureDbOpen()
  return (await database.state.get(key)) as T | undefined
}

const _remove = async (key: string): Promise<void> => {
  const database = await ensureDbOpen()
  await database.state.delete(key)
  notifySubscribers(key, undefined)
}

const _clear = async (): Promise<void> => {
  const database = await ensureDbOpen()
  await database.transaction("rw", database.state, async () => {
    await database.state.clear()
  })
  for (const key of subscribers.keys()) {
    notifySubscribers(key, undefined)
  }
}

const _keys = async (): Promise<string[]> => {
  const database = await ensureDbOpen()
  return (await database.state.toCollection().primaryKeys()) as string[]
}

const _writeBatch = async (entries: Array<[string, RegistryValue]>): Promise<void> => {
  if (entries.length === 0) return
  const database = await ensureDbOpen()
  await database.transaction("rw", database.state, async () => {
    for (const [key, value] of entries) {
      await database.state.put(value, key)
    }
  })
  for (const [key, value] of entries) {
    notifySubscribers(key, value)
  }
}

const _readBatch = async <T extends RegistryValue>(keys: string[]): Promise<Map<string, T | undefined>> => {
  const database = await ensureDbOpen()
  const results = new Map<string, T | undefined>()
  if (keys.length === 0) return results

  const values = await database.state.bulkGet(keys)
  keys.forEach((key, index) => {
    results.set(key, values[index] as T | undefined)
  })

  return results
}

// -----------------------------------------------------------------------------
// Public API (Waits for Init)
// -----------------------------------------------------------------------------

export const write = async <T extends RegistryValue>(key: string, value: T): Promise<void> => {
  await initRegistry()
  return _write(key, value)
}

export const read = async <T extends RegistryValue>(key: string): Promise<T | undefined> => {
  await initRegistry()
  return _read(key)
}

export const remove = async (key: string): Promise<void> => {
  await initRegistry()
  return _remove(key)
}

export const clear = async (): Promise<void> => {
  await initRegistry()
  return _clear()
}

export const keys = async (): Promise<string[]> => {
  await initRegistry()
  return _keys()
}

export const subscribe = <T extends RegistryValue>(key: string, callback: Subscriber<T>): (() => void) => {
  if (!subscribers.has(key)) {
    subscribers.set(key, new Set())
  }
  subscribers.get(key)!.add(callback as Subscriber<RegistryValue>)

  return () => {
    const keySubscribers = subscribers.get(key)
    if (keySubscribers) {
      keySubscribers.delete(callback as Subscriber<RegistryValue>)
      if (keySubscribers.size === 0) {
        subscribers.delete(key)
      }
    }
  }
}

export const createRegistrySignal = <T extends RegistryValue>(
  key: string,
  defaultValue: T,
): [Accessor<T>, (value: T | ((prev: T) => T)) => Promise<void>] => {
  const [value, setValue] = createSignal<T>(defaultValue)

  // Initial read checks initRegistry via the public 'read' wrapper
  read<T>(key).then((stored) => {
    if (stored !== undefined) {
      setValue(() => stored)
    }
  })

  const unsubscribe = subscribe<T>(key, (newValue) => {
    if (newValue !== undefined) {
      setValue(() => newValue)
    } else {
      setValue(() => defaultValue)
    }
  })

  onCleanup(unsubscribe)

  const setRegistryValue = async (newValue: T | ((prev: T) => T)): Promise<void> => {
    const resolvedValue = typeof newValue === "function" ? (newValue as (prev: T) => T)(value()) : newValue
    setValue(() => resolvedValue)
    await write(key, resolvedValue)
  }

  return [value, setRegistryValue]
}

export const writeBatch = async (entries: Array<[string, RegistryValue]>): Promise<void> => {
  await initRegistry()
  return _writeBatch(entries)
}

export const readBatch = async <T extends RegistryValue>(keys: string[]): Promise<Map<string, T | undefined>> => {
  await initRegistry()
  return _readBatch(keys)
}
