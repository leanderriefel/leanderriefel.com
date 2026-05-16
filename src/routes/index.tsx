import { LegalInfo } from "~/components/legal-info"

const Home = () => {
  return (
    <>
      <script>{`document.documentElement.dataset.kbTheme = "dark";`}</script>
      <div class="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-desktop-background p-8 font-mono text-foreground">
        <h1 class="text-xl font-bold">Leander Riefel</h1>
        <h2 class="text-center">
          Full-stack Software Developer
          <br />
          Currently studying Computer Science (B.Sc.) at TU Berlin in Germany.
        </h2>
        <h3>
          <a href="https://react.dev" target="_blank" rel="noreferrer">
            React
          </a>
          /
          <a href="https://www.solidjs.com" target="_blank" rel="noreferrer">
            Solid
          </a>
          {" | "}
          <a href="https://kotlinlang.org" target="_blank" rel="noreferrer">
            Kotlin
          </a>
          /
          <a href="https://www.java.com" target="_blank" rel="noreferrer">
            Java
          </a>
        </h3>
        <div class="w-full max-w-fit space-y-4 text-left max-sm:text-sm">
          <div>
            <p>
              Currently building:{" "}
              <a
                href="https://quieter.email"
                target="_blank"
                rel="noreferrer"
                class="text-primary underline underline-offset-4"
              >
                quieter.email
              </a>{" "}
              /{" "}
              <a
                href="https://github.com/quieter-email/quieter"
                target="_blank"
                rel="noreferrer"
                class="text-primary underline underline-offset-4"
              >
                GitHub
              </a>
            </p>
          </div>
          <div>
            <p>Contact:</p>
            <ul>
              <li class="ml-4 list-disc">
                Email:{" "}
                <a
                  href="mailto:riefel.leander@gmail.com"
                  target="_blank"
                  rel="noreferrer"
                  class="text-primary underline underline-offset-4"
                >
                  riefel.leander@gmail.com
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p>Socials:</p>
            <ul>
              <li class="ml-4 list-disc">
                GitHub:{" "}
                <a
                  href="https://github.com/leanderriefel"
                  target="_blank"
                  rel="noreferrer"
                  class="text-primary underline underline-offset-4"
                >
                  https://github.com/leanderriefel
                </a>
              </li>
              <li class="ml-4 list-disc">
                Twitter (X):{" "}
                <a
                  href="https://x.com/leanderriefel"
                  target="_blank"
                  rel="noreferrer"
                  class="text-primary underline underline-offset-4"
                >
                  https://x.com/leanderriefel
                </a>
              </li>
            </ul>
          </div>
        </div>
        <LegalInfo />
      </div>
    </>
  )
}

export default Home
