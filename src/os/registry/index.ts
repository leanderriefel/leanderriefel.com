import { createSignal, onCleanup, Accessor } from "solid-js"

export type Primitive = null | undefined | boolean | number | string

const DB_NAME = "os-registry"
const DB_VERSION = 1
const STORE_NAME = "state"

type Subscriber<T extends Primitive> = (value: T | undefined) => void
type SubscriberMap = Map<string, Set<Subscriber<Primitive>>>

let dbInstance: IDBDatabase | null = null
let dbPromise: Promise<IDBDatabase> | null = null
const subscribers: SubscriberMap = new Map()

const openDb = (): Promise<IDBDatabase> => {
  if (dbInstance) return Promise.resolve(dbInstance)
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)

    request.onsuccess = () => {
      dbInstance = request.result
      resolve(dbInstance)
    }

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
  })

  return dbPromise
}

const notifySubscribers = <T extends Primitive>(key: string, value: T | undefined): void => {
  const keySubscribers = subscribers.get(key)
  if (keySubscribers) {
    for (const callback of keySubscribers) {
      callback(value)
    }
  }
}

export const write = async <T extends Primitive>(key: string, value: T): Promise<void> => {
  const db = await openDb()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite")
    const store = tx.objectStore(STORE_NAME)
    const request = store.put(value, key)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      notifySubscribers(key, value)
      resolve()
    }
  })
}

export const read = async <T extends Primitive>(key: string): Promise<T | undefined> => {
  const db = await openDb()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly")
    const store = tx.objectStore(STORE_NAME)
    const request = store.get(key)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result as T | undefined)
  })
}

export const remove = async (key: string): Promise<void> => {
  const db = await openDb()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite")
    const store = tx.objectStore(STORE_NAME)
    const request = store.delete(key)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      notifySubscribers(key, undefined)
      resolve()
    }
  })
}

export const clear = async (): Promise<void> => {
  const db = await openDb()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite")
    const store = tx.objectStore(STORE_NAME)
    const request = store.clear()

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      for (const key of subscribers.keys()) {
        notifySubscribers(key, undefined)
      }
      resolve()
    }
  })
}

export const keys = async (): Promise<string[]> => {
  const db = await openDb()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly")
    const store = tx.objectStore(STORE_NAME)
    const request = store.getAllKeys()

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      resolve(request.result as string[])
    }
  })
}

export const subscribe = <T extends Primitive>(key: string, callback: Subscriber<T>): (() => void) => {
  if (!subscribers.has(key)) {
    subscribers.set(key, new Set())
  }
  subscribers.get(key)!.add(callback as Subscriber<Primitive>)

  return () => {
    const keySubscribers = subscribers.get(key)
    if (keySubscribers) {
      keySubscribers.delete(callback as Subscriber<Primitive>)
      if (keySubscribers.size === 0) {
        subscribers.delete(key)
      }
    }
  }
}

export const createPersistedSignal = <T extends Primitive>(
  key: string,
  defaultValue: T,
): [Accessor<T>, (value: T | ((prev: T) => T)) => Promise<void>] => {
  const [value, setValue] = createSignal<T>(defaultValue)

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

  const setPersistedValue = async (newValue: T | ((prev: T) => T)): Promise<void> => {
    const resolvedValue = typeof newValue === "function" ? (newValue as (prev: T) => T)(value()) : newValue
    setValue(() => resolvedValue)
    await write(key, resolvedValue)
  }

  return [value, setPersistedValue]
}

export const writeBatch = async (entries: Array<[string, Primitive]>): Promise<void> => {
  const db = await openDb()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite")
    const store = tx.objectStore(STORE_NAME)

    tx.onerror = () => reject(tx.error)
    tx.oncomplete = () => {
      for (const [key, value] of entries) {
        notifySubscribers(key, value)
      }
      resolve()
    }

    for (const [key, value] of entries) {
      store.put(value, key)
    }
  })
}

export const readBatch = async <T extends Primitive>(keys: string[]): Promise<Map<string, T | undefined>> => {
  const db = await openDb()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly")
    const store = tx.objectStore(STORE_NAME)
    const results = new Map<string, T | undefined>()
    let pending = keys.length

    if (pending === 0) {
      resolve(results)
      return
    }

    tx.onerror = () => reject(tx.error)

    for (const key of keys) {
      const request = store.get(key)
      request.onsuccess = () => {
        results.set(key, request.result as T | undefined)
        pending--
        if (pending === 0) {
          resolve(results)
        }
      }
    }
  })
}
