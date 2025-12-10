import type { Accessor } from "solid-js"
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/core"

type UninstallDialogProps = {
  open: Accessor<boolean>
  onOpenChange: (open: boolean) => void
  targetName: Accessor<string | undefined>
  onConfirm: () => void
  onCancel: () => void
}

export const UninstallDialog = (props: UninstallDialogProps) => {
  return (
    <Dialog open={props.open()} onOpenChange={props.onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Uninstall app</DialogTitle>
        </DialogHeader>
        <DialogBody>
          Are you sure you want to uninstall{" "}
          <span class="font-semibold text-foreground">{props.targetName()}</span>? This removes its `.app` file from
          Programs.
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={props.onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={props.onConfirm}>
            Uninstall
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

