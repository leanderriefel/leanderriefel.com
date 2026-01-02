import { type Accessor, type Setter, Show } from "solid-js"
import {
  Button,
  Tooltip,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
  DialogClose,
  Switch,
  Input,
  FormField,
  Separator,
  Kbd,
} from "~/components/core"
import { EyeIcon, EyeOffIcon, SettingsIcon } from "lucide-solid"

type ControlsRowProps = {
  isVisible: Accessor<boolean>
  setIsVisible: Setter<boolean>
  dialogOpen: Accessor<boolean>
  setDialogOpen: Setter<boolean>
  darkMode: Accessor<boolean>
  setDarkMode: Setter<boolean>
}

export const ControlsRow = (props: ControlsRowProps) => {
  return (
    <div class="flex flex-wrap gap-2">
      <Tooltip content={props.isVisible() ? "Hide counter section" : "Show counter section"}>
        <Button
          variant="ghost"
          leftIcon={
            <Show when={props.isVisible()} fallback={<EyeIcon class="size-4" />}>
              <EyeOffIcon class="size-4" />
            </Show>
          }
          onClick={() => props.setIsVisible(!props.isVisible())}
        >
          <Show when={props.isVisible()} fallback={"Show"}>
            Hide
          </Show>{" "}
          Counter
        </Button>
      </Tooltip>

      <Dialog open={props.dialogOpen()} onOpenChange={props.setDialogOpen}>
        <DialogTrigger>
          <Button leftIcon={<SettingsIcon class="size-4" />}>Open Settings</Button>
        </DialogTrigger>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>Configure your preferences</DialogDescription>
          </DialogHeader>
          <DialogBody class="space-y-4">
            <FormField label="Username" inputId="username-input">
              <Input id="username-input" placeholder="Enter your username..." />
            </FormField>
            <div class="flex items-center justify-between">
              <span class="text-sm text-muted-foreground">Dark Mode</span>
              <Switch checked={props.darkMode()} onCheckedChange={props.setDarkMode} />
            </div>
            <Separator />
            <p class="text-xs text-muted-foreground">
              Press <Kbd>Esc</Kbd> to close this dialog
            </p>
          </DialogBody>
          <DialogFooter>
            <DialogClose>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <Button variant="primary" onClick={() => props.setDialogOpen(false)}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
