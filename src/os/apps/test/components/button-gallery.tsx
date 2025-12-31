import { Button } from "~/components/core"

export const ButtonGallery = () => {
  return (
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
  )
}
