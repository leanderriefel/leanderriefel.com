/// <reference types="@solidjs/start/env" />

import type { AppClass, OsWindow } from "~/os"
import type { SetStoreFunction } from "solid-js/store"
import type { Accessor, Setter } from "solid-js"

declare global {
  // Stores registered apps across hot reloads in development
  var __osAppRegistry: Array<AppClass> | undefined

  // HMR-safe state containers for window management
  var __osOpenAppsStore: [{ apps: Array<OsWindow> }, SetStoreFunction<{ apps: Array<OsWindow> }>] | undefined
  var __osHydrationReady: [Accessor<boolean>, Setter<boolean>] | undefined
  var __osWindowsHydrationPromise: Promise<void> | null | undefined
  var __osLastWindowGeometry:
    | Record<string, { position: { x: number; y: number }; size: { width: number; height: number } }>
    | undefined
  var __osHasLoadedLastGeometry: boolean | undefined

  // HMR-safe state containers for focus management
  var __osFocusState:
    | {
        focusedId: Accessor<string | null>
        setFocusedId: Setter<string | null>
        isFocused: (id: string) => boolean
        focusStack: { stack: string[] }
        setFocusStack: SetStoreFunction<{ stack: string[] }>
      }
    | undefined

  // HMR-safe state containers for installed apps
  var __osInstalledApps: [Accessor<AppClass[]>, Setter<AppClass[]>] | undefined
  var __osInstalledAppIds: [Accessor<Set<string>>, Setter<Set<string>>] | undefined
  var __osEnsureProgramsPromise: Promise<void> | null | undefined
}

export {}
