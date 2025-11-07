import { Signal, createSignal } from "solid-js"
import { App } from "~/os"

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

  constructor() {
    super()
    this.count = createSignal(0)
    this.message = createSignal("Hello from Test App!")
    this.isVisible = createSignal(true)
  }

  render = () => {
    const [count, setCount] = this.count
    const [message] = this.message
    const [isVisible, setIsVisible] = this.isVisible

    return (
      <div class="space-y-4 p-10">
        <h2 class="text-lg font-bold text-white @sm:text-xl @md:text-2xl @lg:text-3xl">{message()}</h2>

        {isVisible() && (
          <div class="space-y-2">
            <p class="text-sm text-white @md:text-base">Count: {count()}</p>
            <div class="flex flex-col gap-2 @sm:flex-row">
              <button
                onClick={() => setCount(count() + 1)}
                class="rounded bg-blue-500 px-3 py-2 text-sm text-white hover:bg-blue-600 @sm:px-4 @md:text-base"
              >
                Increment
              </button>
              <button
                onClick={() => setCount(count() - 1)}
                class="rounded bg-red-500 px-3 py-2 text-sm text-white hover:bg-red-600 @sm:px-4 @md:text-base"
              >
                Decrement
              </button>
            </div>
          </div>
        )}

        <button
          onClick={() => setIsVisible(!isVisible())}
          class="rounded bg-gray-500 px-3 py-2 text-sm text-white hover:bg-gray-600 @sm:px-4 @md:text-base"
        >
          {isVisible() ? "Hide" : "Show"} Counter
        </button>
      </div>
    )
  }
}
