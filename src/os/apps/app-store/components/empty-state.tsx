import { SearchIcon } from "lucide-solid"

export const EmptyState = () => {
  return (
    <div class="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
      <SearchIcon class="size-8 opacity-50" />
      <span class="text-sm">No apps found matching your criteria</span>
    </div>
  )
}
