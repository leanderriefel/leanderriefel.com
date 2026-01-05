import { createSignal, For, onMount, Show } from "solid-js"
import { createAppInstance } from "~/os"
import { InformationApp } from "~/os/apps/information"
import { initFs } from "~/os/fs"
import { read, write } from "~/os/registry"
import { getValue } from "~/os/utils"
import { getInstalledAppIds, getInstalledApps, waitForInstalledApps } from "~/os/fs/programs"
import { initWindowPersistence, openApp, openApps, waitForWindowHydration } from "~/os/windows/open-windows"
import { WindowManager } from "~/os/windows/window-manager"
import { ClockBar, StartMenuButton, TaskbarButton, TaskbarButtons, TaskbarControls } from "~/components/taskbar"
import { clientOnly } from "@solidjs/start"
import { cn } from "~/os/utils"
import { initRegistry } from "~/os/registry"
import { Desktop } from "~/os/desktop/desktop"
import { ColorModeProvider, ColorModeScript, cookieStorageManagerSSR } from "@kobalte/core"
import { getCookie } from "vinxi/http"
import { isServer } from "solid-js/web"

const INFO_AUTOLAUNCH_KEY = "os_information_autolaunched"

const getServerCookies = () => {
  "use server"
  const colorMode = getCookie("kb-color-mode")
  return colorMode ? `kb-color-mode=${colorMode}` : ""
}

const OSContent = clientOnly(
  async () => ({
    default: (props: { onReady: () => void }) => {
      onMount(() => {
        void (async () => {
          await Promise.all([initWindowPersistence(), initFs(), initRegistry()])
          await waitForInstalledApps()
          await waitForWindowHydration()

          props.onReady()

          const hasInformationOpen = openApps.apps.some((w) => w.app instanceof InformationApp)
          if (hasInformationOpen) return

          if (!getInstalledAppIds().has(InformationApp.appId)) return

          const alreadyAutolaunched = await read<boolean>(INFO_AUTOLAUNCH_KEY)
          if (alreadyAutolaunched) return

          const infoApp = createAppInstance(InformationApp)
          const size = infoApp.defaultSize ? getValue(infoApp.defaultSize) : { width: 500, height: 500 }
          const position = {
            x: Math.max(0, Math.round((window.innerWidth - size.width) / 2)),
            y: Math.max(0, Math.round((window.innerHeight - size.height) / 2)),
          }

          openApp(infoApp, { position })
          await write(INFO_AUTOLAUNCH_KEY, true)
        })()
      })

      return (
        <div class="relative h-screen w-screen overflow-hidden bg-background selection:bg-primary/20">
          <div class="relative h-dvh w-dvw">
            <Desktop />
            <div
              class="absolute inset-0 z-0"
              style={{
                background: `
              radial-gradient(ellipse 110% 70% at 25% 80%, rgba(147, 51, 234, var(--gradient-alpha-purple)), transparent 55%),
              radial-gradient(ellipse 130% 60% at 75% 15%, rgba(59, 130, 246, var(--gradient-alpha-blue)), transparent 65%),
              radial-gradient(ellipse 80% 90% at 20% 30%, rgba(236, 72, 153, var(--gradient-alpha-pink)), transparent 50%),
              radial-gradient(ellipse 100% 40% at 60% 70%, rgba(16, 185, 129, var(--gradient-alpha-green)), transparent 45%),
              var(--color-desktop-background)
            `,
              }}
            />

            <WindowManager />

            {/* Taskbar */}
            <div
              class="absolute inset-x-0 bottom-4 z-50 grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4"
              data-taskbar
            >
              <div class="flex w-full items-center justify-start gap-3">
                <TaskbarControls />
              </div>
              <div
                class={cn(
                  "flex h-12 w-[90vw] items-center justify-center gap-x-3 rounded-2xl px-4 sm:w-[55vw] sm:max-w-4xl",
                  "bg-background/50",
                )}
              >
                <TaskbarButtons>
                  <StartMenuButton />
                  <For each={getInstalledApps()}>{(appClass) => <TaskbarButton appClass={appClass} />}</For>
                </TaskbarButtons>
              </div>
              <div class="flex w-full items-center justify-end gap-3">
                <ClockBar />
              </div>
            </div>
          </div>
        </div>
      )
    },
  }),
  { lazy: true },
)

export const LoadingScreen = () => {
  return (
    <div class="flex h-screen w-screen items-center justify-center bg-background">
      <div class="font-mono text-foreground">
        Loading{" "}
        <span class="inline-flex w-[3ch]">
          <span class="animate-[dot_2s_steps(1)_infinite]">.</span>
          <span class="animate-[dot_2s_steps(1)_infinite_0.2s]">.</span>
          <span class="animate-[dot_2s_steps(1)_infinite_0.4s]">.</span>
          <span class="animate-[dot_2s_steps(1)_infinite_0.6s]">.</span>
          <span class="animate-[dot_2s_steps(1)_infinite_0.8s]">.</span>
        </span>
      </div>
    </div>
  )
}

export default function Home() {
  const storageManager = cookieStorageManagerSSR(isServer ? getServerCookies() : document.cookie)
  const [isReady, setIsReady] = createSignal(false)

  return (
    <>
      <ColorModeScript storageType={storageManager.type} />
      <ColorModeProvider storageManager={storageManager} initialColorMode="system" disableTransitionOnChange>
        <Show when={!isReady()}>
          <LoadingScreen />
        </Show>
        <OSContent onReady={() => setIsReady(true)} />
      </ColorModeProvider>
    </>
  )
}
