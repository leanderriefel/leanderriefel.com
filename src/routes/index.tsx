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
            <p>Projects:</p>
            <ul>
              <li class="ml-4 list-disc">
                Leander's OS:{" "}
                <a
                  href={
                    process.env.NODE_ENV === "development"
                      ? "http://localhost:3000/os"
                      : "https://www.leanderriefel.com/os"
                  }
                  target={process.env.NODE_ENV === "development" ? "_self" : "_blank"}
                  rel="noreferrer"
                  class="text-primary underline underline-offset-4"
                >
                  {process.env.NODE_ENV === "development"
                    ? "http://localhost:3000/os"
                    : "https://www.leanderriefel.com/os"}
                </a>{" "}
                /{" "}
                <a
                  href="https://github.com/leanderriefel/leanderriefel.com"
                  target="_blank"
                  rel="noreferrer"
                  class="text-primary underline underline-offset-4"
                >
                  GitHub
                </a>
              </li>
              <li class="ml-4 list-disc">
                motion-solid:{" "}
                <a
                  href="https://motion-solid.leanderriefel.com"
                  target="_blank"
                  rel="noreferrer"
                  class="text-primary underline underline-offset-4"
                >
                  https://motion-solid.leanderriefel.com
                </a>{" "}
                /{" "}
                <a
                  href="https://github.com/leanderriefel/motion-solid"
                  target="_blank"
                  rel="noreferrer"
                  class="text-primary underline underline-offset-4"
                >
                  GitHub
                </a>
              </li>
              <li class="ml-4 list-disc">
                Ignita:{" "}
                <a
                  href="https://www.ignita.app"
                  target="_blank"
                  rel="noreferrer"
                  class="text-primary underline underline-offset-4"
                >
                  https://www.ignita.app
                </a>{" "}
                /{" "}
                <a
                  href="https://github.com/leanderriefel/ignita"
                  target="_blank"
                  rel="noreferrer"
                  class="text-primary underline underline-offset-4"
                >
                  GitHub
                </a>
              </li>
              <li class="ml-4 list-disc">
                Speedcube Timer:{" "}
                <a
                  href="https://speedcube.vercel.app"
                  target="_blank"
                  rel="noreferrer"
                  class="text-primary underline underline-offset-4"
                >
                  https://speedcube.vercel.app
                </a>{" "}
                /{" "}
                <a
                  href="https://github.com/leanderriefel/speedcube"
                  target="_blank"
                  rel="noreferrer"
                  class="text-primary underline underline-offset-4"
                >
                  GitHub
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p>Contact:</p>
            <ul>
              <li class="ml-4 list-disc">
                Email:{" "}
                <a
                  href="mailto:leander@leanderriefel.com"
                  target="_blank"
                  rel="noreferrer"
                  class="text-primary underline underline-offset-4"
                >
                  leander@leanderriefel.com
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
