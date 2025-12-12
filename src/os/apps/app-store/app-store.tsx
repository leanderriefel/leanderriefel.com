import { For, Show, createMemo, createSignal, onMount, Accessor, Signal } from "solid-js"
import { App, AppClass, appRegistry } from "~/os"
import { Separator } from "~/components/core"
import {
  getInstalledAppIds,
  refreshInstalledApps,
  waitForInstalledApps,
  programFilePath,
  isProtectedAppId,
} from "~/os/fs/programs"
import { writeFile, remove } from "~/os/fs"
import { fuzzyMatchAny } from "~/os/utils"

import type { FilterOption } from "./types"
import { FILTER_OPTIONS } from "./constants"
import { Header, SearchFilter, AppCard, UninstallDialog, EmptyState } from "./components"

export class AppStoreApp extends App {
  static appId = "app-store"
  static appName = "App Store"
  static appIcon = "store"
  static appDescription = "Install or uninstall available apps."
  static appColor = "blue"
  static appProtected = true
  static supportedFileTypes: readonly string[] = []

  id = AppStoreApp.appId
  name = AppStoreApp.appName
  icon = AppStoreApp.appIcon
  description = AppStoreApp.appDescription
  color = AppStoreApp.appColor
  defaultSize = { width: 900, height: 640 }

  private loading!: Signal<boolean>
  private actioning!: Signal<string | null>
  private confirmOpen!: Signal<boolean>
  private confirmTarget!: Signal<{ id: string; name: string } | null>
  private searchQuery!: Signal<string>
  private filterStatus!: Signal<FilterOption>
  private installedIds!: Accessor<Set<string>>
  private filteredApps!: Accessor<AppClass[]>

  constructor() {
    super()
  }

  onLaunch = () => {
    this.loading = createSignal(true)
    this.actioning = createSignal<string | null>(null)
    this.confirmOpen = createSignal(false)
    this.confirmTarget = createSignal<{ id: string; name: string } | null>(null)
    this.searchQuery = createSignal("")
    this.filterStatus = createSignal<FilterOption>(FILTER_OPTIONS[0])
    this.installedIds = createMemo(() => getInstalledAppIds())

    this.filteredApps = createMemo(() => {
      const query = this.searchQuery[0]().trim()
      const filter = this.filterStatus[0]()
      const installed = this.installedIds()

      return appRegistry
        .filter((app) => {
          if (query && !fuzzyMatchAny(query, [app.appName, app.appDescription])) {
            return false
          }
          if (filter.value === "installed" && !installed.has(app.appId)) return false
          if (filter.value === "not-installed" && installed.has(app.appId)) return false
          return true
        })
        .sort((a, b) => a.appName.localeCompare(b.appName))
    })

    onMount(() => {
      void (async () => {
        await waitForInstalledApps()
        this.loading[1](false)
      })()
    })
  }

  private isInstalled = (appId: string) => this.installedIds().has(appId)

  private installApp = async (appClass: AppClass) => {
    if (isProtectedAppId(appClass.appId)) return
    this.actioning[1](appClass.appId)
    try {
      await writeFile(programFilePath(appClass.appId), JSON.stringify(appClass.getMetadata(), null, 2), {
        parents: true,
        mimeType: "application/json",
      })
      await refreshInstalledApps()
    } catch (err) {
      console.error("Failed to install app:", err)
    } finally {
      this.actioning[1](null)
    }
  }

  private requestUninstall = (appClass: AppClass) => {
    if (isProtectedAppId(appClass.appId)) return
    this.confirmTarget[1]({ id: appClass.appId, name: appClass.appName })
    this.confirmOpen[1](true)
  }

  private confirmUninstall = async () => {
    const target = this.confirmTarget[0]()
    this.confirmOpen[1](false)
    if (!target) return

    this.actioning[1](target.id)
    try {
      await remove(programFilePath(target.id))
      await refreshInstalledApps()
    } catch (err) {
      console.error("Failed to uninstall app:", err)
    } finally {
      this.actioning[1](null)
      this.confirmTarget[1](null)
    }
  }

  render = () => {
    return (
      <div class="flex h-full flex-col gap-4 bg-background p-6">
        <Header loading={this.loading[0]} onRefresh={() => void refreshInstalledApps()} />

        <SearchFilter
          searchQuery={this.searchQuery[0]}
          setSearchQuery={this.searchQuery[1]}
          filterStatus={this.filterStatus[0]}
          setFilterStatus={this.filterStatus[1]}
        />

        <Separator />

        <Show when={!this.loading[0]()} fallback={<div class="text-sm text-muted-foreground">Loading apps…</div>}>
          <Show when={this.filteredApps().length > 0} fallback={<EmptyState />}>
            <div class="grid gap-3 @lg:grid-cols-2">
              <For each={this.filteredApps()}>
                {(appClass) => {
                  const installed = createMemo(() => this.isInstalled(appClass.appId))
                  const busy = createMemo(() => this.actioning[0]() === appClass.appId)

                  return (
                    <AppCard
                      appClass={appClass}
                      isInstalled={installed}
                      isBusy={busy}
                      onInstall={() => void this.installApp(appClass)}
                      onUninstall={() => this.requestUninstall(appClass)}
                    />
                  )
                }}
              </For>
            </div>
          </Show>
        </Show>

        <UninstallDialog
          open={this.confirmOpen[0]}
          onOpenChange={(open) => {
            this.confirmOpen[1](open)
            if (!open) this.confirmTarget[1](null)
          }}
          targetName={() => this.confirmTarget[0]()?.name}
          onConfirm={() => void this.confirmUninstall()}
          onCancel={() => this.confirmOpen[1](false)}
        />
      </div>
    )
  }
}
