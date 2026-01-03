import { createSignal } from "solid-js"
import { InfoIcon } from "lucide-solid"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, Tooltip } from "~/components/core"

export const LegalInfo = () => {
  const [open, setOpen] = createSignal(false)

  return (
    <>
      <Tooltip content="Legal & Privacy">
        <button
          onClick={() => setOpen(true)}
          class="fixed right-3 bottom-3 z-40 flex size-10 items-center justify-center rounded-full bg-background/30 text-muted-foreground/60 backdrop-blur-sm transition-colors hover:bg-background/50 hover:text-muted-foreground"
          aria-label="Legal & Privacy Information"
        >
          <InfoIcon class="size-5" />
        </button>
      </Tooltip>

      <Dialog open={open()} onOpenChange={setOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Legal & Privacy</DialogTitle>
          </DialogHeader>
          <DialogBody class="space-y-4 text-sm text-muted-foreground">
            <section>
              <h3 class="mb-1.5 font-medium text-foreground">Privacy</h3>
              <p>
                This website does not collect or store any personalized data in cookies. The only preference stored is
                your color mode setting.
              </p>
              <p class="mt-2">
                Any files, documents, or data you create within the /os environment (such as files in the file explorer
                or app data) are stored locally in your browser's storage and are not transmitted to any server.
              </p>
            </section>

            <section>
              <h3 class="mb-1.5 font-medium text-foreground">Contact</h3>
              <p class="mb-2">Leander Timon Riefel</p>
              <ul class="space-y-1">
                <li>
                  <a
                    href="https://github.com/leanderriefel/leanderriefel.com/issues"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-primary hover:underline"
                  >
                    GitHub Issues
                  </a>
                </li>
                <li>
                  <a href="mailto:leander@leanderriefel.com" class="text-primary hover:underline">
                    leander@leanderriefel.com
                  </a>
                </li>
                <li>
                  <a
                    href="https://x.com/leanderriefel"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-primary hover:underline"
                  >
                    @leanderriefel on X
                  </a>
                </li>
              </ul>
            </section>
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  )
}
