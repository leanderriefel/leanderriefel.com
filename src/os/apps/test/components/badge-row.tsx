import { Badge } from "~/components/core"

export const BadgeRow = () => {
  return (
    <div class="flex flex-wrap gap-2">
      <Badge>Default</Badge>
      <Badge variant="primary">Primary</Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="warning">Warning</Badge>
      <Badge variant="destructive">Destructive</Badge>
    </div>
  )
}
