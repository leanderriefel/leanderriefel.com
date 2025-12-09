import { For, Show, createMemo, createSignal, onMount, Accessor, Signal } from "solid-js"
import { App, AppClass, appRegistry } from "~/os"
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
} from "~/components/core"
import { DownloadIcon, Trash2Icon, RefreshCwIcon, SearchIcon, FilterIcon } from "lucide-solid"
import {
  getInstalledAppIds,
  refreshInstalledApps,
  waitForInstalledApps,
  programFilePath,
  isProtectedAppId,
} from "~/os/apps/programs"
import { writeFile, remove } from "~/os/fs"
import { fuzzyMatchAny } from "~/os/utils"

type FilterOption = { value: "all" | "installed" | "not-installed"; label: string }

const filterOptions: FilterOption[] = [
  { value: "all", label: "All Apps" },
  { value: "installed", label: "Installed" },
  { value: "not-installed", label: "Not Installed" },
]

export class AppStoreApp extends App {
  static appId = "app-store"
  static appName = "App Store"
  static appIcon = "store"
  static appDescription = "Install or uninstall available apps."
  static appColor = "blue"
  static appProtected = true

  id = AppStoreApp.appId
  name = AppStoreApp.appName
  icon = AppStoreApp.appIcon
  description = AppStoreApp.appDescription
  color = AppStoreApp.appColor
  defaultSize = { width: 900, height: 640 }

  private loading: Signal<boolean>
  private actioning: Signal<string | null>
  private confirmOpen: Signal<boolean>
  private confirmTarget: Signal<{ id: string; name: string } | null>
  private searchQuery: Signal<string>
  private filterStatus: Signal<FilterOption>
  private installedIds: Accessor<Set<string>>
  private filteredApps: Accessor<AppClass[]>

  constructor() {
    super()

    this.loading = createSignal(true)
    this.actioning = createSignal<string | null>(null)
    this.confirmOpen = createSignal(false)
    this.confirmTarget = createSignal<{ id: string; name: string } | null>(null)
    this.searchQuery = createSignal("")
    this.filterStatus = createSignal<FilterOption>(filterOptions[0])
    this.installedIds = createMemo(() => getInstalledAppIds())

    this.filteredApps = createMemo(() => {
      const query = this.searchQuery[0]().trim()
      const filter = this.filterStatus[0]()
      const installed = this.installedIds()

      return [...appRegistry]
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

  private renderAction = (appClass: AppClass, installed: boolean, protectedApp: boolean, busy: boolean) => {
    return (
      <Show when={!protectedApp} fallback={<span class="text-sm text-muted-foreground">Protected</span>}>
        <Button
          variant={installed ? "ghost" : "primary"}
          size="sm"
          disabled={busy}
          onClick={() => (installed ? this.requestUninstall(appClass) : void this.installApp(appClass))}
        >
          <Show
            when={installed}
            fallback={
              <>
                <DownloadIcon class="mr-2 size-4" />
                Install
              </>
            }
          >
            <>
              <Trash2Icon class="mr-2 size-4" />
              Uninstall
            </>
          </Show>
        </Button>
      </Show>
    )
  }

  render = () => {
    return (
      <div class="flex h-full flex-col gap-4 bg-background p-6">
        <div class="flex items-center justify-between gap-3">
          <div>
            <div class="text-lg font-semibold text-foreground">App Store</div>
            <div class="text-sm text-muted-foreground">Install or uninstall available apps</div>
          </div>
          <Button size="sm" onClick={() => void refreshInstalledApps()} disabled={this.loading[0]()}>
            <RefreshCwIcon class="mr-2 size-4" />
            Refresh
          </Button>
        </div>

        <div class="grid grid-cols-1 grid-rows-2 gap-3 @md:grid-cols-[3fr_1fr] @md:grid-rows-1">
          <div class="relative w-full">
            <SearchIcon class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search apps..."
              value={this.searchQuery[0]()}
              onInput={(e) => this.searchQuery[1](e.currentTarget.value)}
              class="pl-9"
            />
          </div>
          <Select<FilterOption>
            value={this.filterStatus[0]()}
            onChange={(val) => val && this.filterStatus[1](val)}
            options={filterOptions}
            optionValue="value"
            optionTextValue="label"
            itemComponent={(props) => <SelectItem item={props.item}>{props.item.rawValue.label}</SelectItem>}
          >
            <SelectTrigger class="w-full @md:w-44">
              <FilterIcon class="mr-2 size-4 text-muted-foreground" />
              <SelectValue<FilterOption>>{(state) => state.selectedOption().label}</SelectValue>
            </SelectTrigger>
            <SelectContent />
          </Select>
        </div>

        <Separator />

        <Show when={!this.loading[0]()} fallback={<div class="text-sm text-muted-foreground">Loading apps…</div>}>
          <Show
            when={this.filteredApps().length > 0}
            fallback={
              <div class="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
                <SearchIcon class="size-8 opacity-50" />
                <span class="text-sm">No apps found matching your criteria</span>
              </div>
            }
          >
            <div class="grid gap-3 @lg:grid-cols-2">
              <For each={this.filteredApps()}>
                {(appClass) => {
                  const installed = createMemo(() => this.isInstalled(appClass.appId))
                  const protectedApp = isProtectedAppId(appClass.appId)
                  const busy = createMemo(() => this.actioning[0]() === appClass.appId)

                  return (
                    <div class="flex flex-col gap-2 rounded-xl border border-border/60 bg-secondary/40 p-4 shadow-sm">
                      <div class="flex items-center justify-between gap-2">
                        <span class="text-base font-semibold text-foreground">{appClass.appName}</span>
                        {this.renderAction(appClass, installed(), protectedApp, busy())}
                      </div>

                      <p class="text-sm leading-relaxed text-muted-foreground">{appClass.appDescription}</p>
                    </div>
                  )
                }}
              </For>
            </div>
          </Show>
        </Show>

        <Dialog
          open={this.confirmOpen[0]()}
          onOpenChange={(open) => {
            this.confirmOpen[1](open)
            if (!open) this.confirmTarget[1](null)
          }}
        >
          <DialogContent size="sm">
            <DialogHeader>
              <DialogTitle>Uninstall app</DialogTitle>
            </DialogHeader>
            <DialogBody>
              Are you sure you want to uninstall{" "}
              <span class="font-semibold text-foreground">{this.confirmTarget[0]()?.name}</span>? This removes its
              `.app` file from Programs.
            </DialogBody>
            <DialogFooter>
              <Button variant="ghost" onClick={() => this.confirmOpen[1](false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => void this.confirmUninstall()}>
                Uninstall
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }
}
