import { For, Show, type Accessor, type Setter } from "solid-js"
import type { FsEntry, FsPath } from "~/os/fs"
import { entryName as fsEntryName } from "~/os/fs"
import { getExtension } from "~/os/fs/file-associations"
import type { AppClass } from "~/os"
import { cn } from "~/os/utils"
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  Input,
  Switch,
} from "~/components/core"
import { AppWindowIcon } from "lucide-solid"

type NewItemDialogProps = {
  open: Accessor<boolean>
  onOpenChange: Setter<boolean>
  title: string
  placeholder: string
  itemName: Accessor<string>
  setItemName: Setter<string>
  onSubmit: () => void
}

export const NewItemDialog = (props: NewItemDialogProps) => {
  return (
    <Dialog open={props.open()} onOpenChange={props.onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{props.title}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <Input
            placeholder={props.placeholder}
            value={props.itemName()}
            onInput={(e) => props.setItemName(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") props.onSubmit()
            }}
          />
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => props.onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={props.onSubmit}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type RenameDialogProps = {
  open: Accessor<boolean>
  onOpenChange: Setter<boolean>
  itemName: Accessor<string>
  setItemName: Setter<string>
  onSubmit: () => void
}

export const RenameDialog = (props: RenameDialogProps) => {
  return (
    <Dialog open={props.open()} onOpenChange={props.onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Rename</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <Input
            placeholder="New name"
            value={props.itemName()}
            onInput={(e) => props.setItemName(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") props.onSubmit()
            }}
          />
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => props.onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={props.onSubmit}>
            Rename
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type DeleteConfirmDialogProps = {
  open: Accessor<boolean>
  onOpenChange: (open: boolean) => void
  target: Accessor<FsEntry | null>
  message: Accessor<string>
  onConfirm: () => void
  onClose: () => void
}

export const DeleteConfirmDialog = (props: DeleteConfirmDialogProps) => {
  return (
    <Dialog open={props.open()} onOpenChange={props.onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{props.target() ? "Uninstall app" : "Cannot uninstall app"}</DialogTitle>
        </DialogHeader>
        <DialogBody>{props.message()}</DialogBody>
        <DialogFooter>
          <Show
            when={props.target()}
            fallback={
              <Button variant="primary" onClick={props.onClose}>
                Close
              </Button>
            }
          >
            <Button variant="ghost" onClick={props.onClose}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={props.onConfirm}>
              Uninstall
            </Button>
          </Show>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type OpenWithDialogProps = {
  open: Accessor<boolean>
  onOpenChange: (open: boolean) => void
  target: Accessor<FsEntry | null>
  availableApps: AppClass[]
  selectedApp: Accessor<string | null>
  setSelectedApp: Setter<string | null>
  remember: Accessor<boolean>
  setRemember: Setter<boolean>
  onSubmit: () => void
  onCancel: () => void
}

export const OpenWithDialog = (props: OpenWithDialogProps) => {
  return (
    <Dialog open={props.open()} onOpenChange={props.onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Open with...</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <Show when={props.target()}>
            {(target) => (
              <div class="space-y-4">
                <p class="text-sm text-muted-foreground">
                  Choose an app to open <span class="font-medium text-foreground">{fsEntryName(target().path)}</span>
                </p>
                <div class="max-h-64 space-y-1 overflow-y-auto rounded-md border border-border p-1">
                  <For
                    each={props.availableApps}
                    fallback={
                      <div class="py-4 text-center text-sm text-muted-foreground">
                        No apps available for this file type
                      </div>
                    }
                  >
                    {(appClass) => (
                      <button
                        class={cn(
                          "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors",
                          props.selectedApp() === appClass.appId
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-accent",
                        )}
                        onClick={() => props.setSelectedApp(appClass.appId)}
                        onDblClick={() => {
                          props.setSelectedApp(appClass.appId)
                          props.onSubmit()
                        }}
                      >
                        <AppWindowIcon class="size-5 shrink-0" />
                        <div class="min-w-0 flex-1">
                          <div class="truncate text-sm font-medium">{appClass.appName}</div>
                          <div
                            class={cn(
                              "truncate text-xs",
                              props.selectedApp() === appClass.appId
                                ? "text-primary-foreground/70"
                                : "text-muted-foreground",
                            )}
                          >
                            {appClass.appDescription}
                          </div>
                        </div>
                      </button>
                    )}
                  </For>
                </div>
                <Show when={getExtension(target().path as FsPath)}>
                  {(ext) => (
                    <div class="flex items-center justify-between gap-2">
                      <label for="remember-association" class="text-sm text-muted-foreground">
                        Always use this app for <span class="font-medium text-foreground">{ext()}</span> files
                      </label>
                      <Switch
                        id="remember-association"
                        checked={props.remember()}
                        onCheckedChange={props.setRemember}
                      />
                    </div>
                  )}
                </Show>
              </div>
            )}
          </Show>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={props.onCancel}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!props.selectedApp()} onClick={props.onSubmit}>
            Open
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
