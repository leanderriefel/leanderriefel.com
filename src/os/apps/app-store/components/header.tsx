import type { Accessor } from "solid-js"
import { Button } from "~/components/core"
import { RefreshCwIcon } from "lucide-solid"

type HeaderProps = {
  loading: Accessor<boolean>
  onRefresh: () => void
}

export const Header = (props: HeaderProps) => {
  return (
    <div class="flex items-center justify-between gap-3">
      <div>
        <div class="text-lg font-semibold text-foreground">App Store</div>
        <div class="text-sm text-muted-foreground">Install or uninstall available apps</div>
      </div>
      <Button size="sm" onClick={props.onRefresh} disabled={props.loading()}>
        <RefreshCwIcon class="mr-2 size-4" />
        Refresh
      </Button>
    </div>
  )
}

