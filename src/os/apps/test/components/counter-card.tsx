import type { Accessor, Setter } from "solid-js"
import { Button, Tooltip, Card, CardHeader, CardTitle, CardDescription, CardContent } from "~/components/core"
import { PlusIcon, MinusIcon } from "lucide-solid"

type CounterCardProps = {
  count: Accessor<number>
  setCount: Setter<number>
}

export const CounterCard = (props: CounterCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Counter Component</CardTitle>
        <CardDescription>A simple counter with tooltips</CardDescription>
      </CardHeader>
      <CardContent>
        <div class="flex items-center gap-4">
          <Tooltip content="Decrement the counter" side="bottom">
            <Button variant="destructive" size="icon" onClick={() => props.setCount(props.count() - 1)}>
              <MinusIcon class="size-4" />
            </Button>
          </Tooltip>

          <span class="min-w-[3ch] text-center text-2xl font-bold text-foreground tabular-nums">{props.count()}</span>

          <Tooltip content="Increment the counter" side="bottom">
            <Button variant="primary" size="icon" onClick={() => props.setCount(props.count() + 1)}>
              <PlusIcon class="size-4" />
            </Button>
          </Tooltip>
        </div>
      </CardContent>
    </Card>
  )
}
