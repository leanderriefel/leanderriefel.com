import { Show, createMemo, type Accessor } from "solid-js"
import type { AppClass } from "~/os"
import { Button } from "~/components/core"
import { DownloadIcon, Trash2Icon } from "lucide-solid"
import { isProtectedAppId } from "~/os/fs/programs"

type AppCardProps = {
  appClass: AppClass
  isInstalled: Accessor<boolean>
  isBusy: Accessor<boolean>
  onInstall: () => void
  onUninstall: () => void
}

export const AppCard = (props: AppCardProps) => {
  const protectedApp = createMemo(() => isProtectedAppId(props.appClass.appId))

  const renderAction = () => {
    return (
      <Show when={!protectedApp()} fallback={<span class="text-sm text-muted-foreground">Protected</span>}>
        <Button
          variant={props.isInstalled() ? "ghost" : "primary"}
          size="sm"
          disabled={props.isBusy()}
          onClick={() => (props.isInstalled() ? props.onUninstall() : props.onInstall())}
        >
          <Show
            when={props.isInstalled()}
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

  return (
    <div class="flex flex-col gap-2 rounded-xl border border-border/60 bg-secondary/40 p-4 shadow-sm">
      <div class="flex items-center justify-between gap-2">
        <span class="text-base font-semibold text-foreground">{props.appClass.appName}</span>
        {renderAction()}
      </div>
      <p class="text-sm leading-relaxed text-muted-foreground">{props.appClass.appDescription}</p>
    </div>
  )
}

