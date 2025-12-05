import { App } from "~/os"
import { Separator } from "~/components/core"

export class InformationApp extends App {
  static appId = "information"
  static appName = "Information"
  static appIcon = "info"
  static appColor = "purple"

  id = InformationApp.appId
  name = InformationApp.appName
  icon = InformationApp.appIcon
  color = InformationApp.appColor
  defaultSize = { width: 1000, height: 700 }

  render = () => {
    return (
      <div class="flex size-full items-center justify-center overflow-auto p-6">
        <div class="max-w-2xl space-y-4 text-sm leading-relaxed text-muted-foreground">
          <h2 class="text-lg font-bold text-foreground @sm:text-xl @md:text-2xl">Information</h2>

          <p>
            Hi! I&apos;m Leander Riefel. Full-stack Software Developer currently studying Computer Science at TU Berlin.
          </p>

          <p>
            In my free time I like to create fun websites and games, and work on my Minecraft MMORPG server which may
            release in a few hundred decades :).
          </p>

          <p>
            Coding is my passion. I&apos;ve been doing it since I was 10 years old. I&apos;m spread across many
            programming languages and am eager to learn more (Rust and Zig o.o) but specialize in Java, Kotlin, and
            TypeScript.
          </p>

          <p>
            I love to take on new challenges. Always on the lookout for new work, open source in my free time or for
            money on occasion :).
          </p>

          <p>
            I work quickly and reliably. I love to smooth out every edge until the user is happy. A product can always
            be improved.
          </p>

          <p class="text-sm leading-relaxed text-muted-foreground">
            Thanks for stopping by and reading. Feel free to reach out if you want to build something together.
          </p>

          <Separator orientation="horizontal" />

          <p>
            The site you&apos;re viewing right now is just a fun side-project I am working on. I might make it more
            personal later on and include other projects I am working on along with a portfolio. We&apos;ll see :)
          </p>

          <Separator orientation="horizontal" />

          <div class="space-y-1">
            <p>
              Twitter (yayaya it&apos;s called X):{" "}
              <a
                href="https://x.com/leanderriefel"
                target="_blank"
                rel="noreferrer"
                class="font-medium text-primary underline-offset-4 hover:underline"
              >
                @leanderriefel
              </a>
            </p>
            <p>
              Github:{" "}
              <a
                href="https://github.com/leanderriefel"
                target="_blank"
                rel="noreferrer"
                class="font-medium text-primary underline-offset-4 hover:underline"
              >
                @leanderriefel
              </a>
            </p>
          </div>
        </div>
      </div>
    )
  }
}
