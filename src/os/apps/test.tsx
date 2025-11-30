import { Signal, createSignal, Show } from "solid-js"
import { App } from "~/os"
import {
  Button,
  Badge,
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
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Kbd,
} from "~/components/core"
import { PlusIcon, MinusIcon, EyeIcon, EyeOffIcon, SettingsIcon } from "lucide-solid"

export class TestApp extends App {
  static appName = "Test"
  static appIcon = "test"
  static appColor = "red"

  name = TestApp.appName
  icon = TestApp.appIcon
  color = TestApp.appColor

  private count: Signal<number>
  private message: Signal<string>
  private isVisible: Signal<boolean>
  private dialogOpen: Signal<boolean>
  private darkMode: Signal<boolean>

  constructor() {
    super()
    this.count = createSignal(0)
    this.message = createSignal("UI Components Demo")
    this.isVisible = createSignal(true)
    this.dialogOpen = createSignal(false)
    this.darkMode = createSignal(true)
  }

  render = () => {
    const [count, setCount] = this.count
    const [message] = this.message
    const [isVisible, setIsVisible] = this.isVisible
    const [dialogOpen, setDialogOpen] = this.dialogOpen
    const [darkMode, setDarkMode] = this.darkMode

    return (
      <div class="h-full space-y-4 overflow-auto p-6">
        <h2 class="text-lg font-bold text-foreground @sm:text-xl @md:text-2xl">{message()}</h2>

        <div class="flex flex-wrap gap-2">
          <Badge>Default</Badge>
          <Badge variant="primary">Primary</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="destructive">Destructive</Badge>
        </div>

        <Separator variant="gradient" />

        <Show when={isVisible()}>
          <Card>
            <CardHeader>
              <CardTitle>Counter Component</CardTitle>
              <CardDescription>A simple counter with tooltips</CardDescription>
            </CardHeader>
            <CardContent>
              <div class="flex items-center gap-4">
                <Tooltip content="Decrement the counter" side="bottom">
                  <Button variant="destructive" size="icon" onClick={() => setCount(count() - 1)}>
                    <MinusIcon class="size-4" />
                  </Button>
                </Tooltip>

                <span class="min-w-[3ch] text-center text-2xl font-bold text-foreground tabular-nums">{count()}</span>

                <Tooltip content="Increment the counter" side="bottom">
                  <Button variant="primary" size="icon" onClick={() => setCount(count() + 1)}>
                    <PlusIcon class="size-4" />
                  </Button>
                </Tooltip>
              </div>
            </CardContent>
          </Card>
        </Show>

        <div class="flex flex-wrap gap-2">
          <Tooltip content={isVisible() ? "Hide counter section" : "Show counter section"}>
            <Button
              variant="ghost"
              leftIcon={isVisible() ? <EyeOffIcon class="size-4" /> : <EyeIcon class="size-4" />}
              onClick={() => setIsVisible(!isVisible())}
            >
              {isVisible() ? "Hide" : "Show"} Counter
            </Button>
          </Tooltip>

          <Dialog open={dialogOpen()} onOpenChange={setDialogOpen}>
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
                  <Switch checked={darkMode()} onCheckedChange={setDarkMode} />
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
                <Button variant="primary" onClick={() => setDialogOpen(false)}>
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Separator />

        <div class="space-y-2">
          <h3 class="text-sm font-medium text-muted-foreground">Button Variants</h3>
          <div class="flex flex-wrap gap-2">
            <Button variant="default" size="sm">
              Default
            </Button>
            <Button variant="primary" size="sm">
              Primary
            </Button>
            <Button variant="success" size="sm">
              Success
            </Button>
            <Button variant="warning" size="sm">
              Warning
            </Button>
            <Button variant="destructive" size="sm">
              Destructive
            </Button>
            <Button variant="ghost" size="sm">
              Ghost
            </Button>
            <Button variant="outline" size="sm">
              Outline
            </Button>
            <Button variant="glass" size="sm">
              Glass
            </Button>
          </div>
        </div>
      </div>
    )
  }
}
