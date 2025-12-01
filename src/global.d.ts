/// <reference types="@solidjs/start/env" />

import type { AppClass } from "~/os"

declare global {
  // Stores registered apps across hot reloads in development

  var __osAppRegistry: Array<AppClass> | undefined
}

export {}
