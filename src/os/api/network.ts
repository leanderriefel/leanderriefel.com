import { createRegistrySignal, read, write } from "~/os/registry"

// -----------------------------------------------------------------------------
// Registry Keys
// -----------------------------------------------------------------------------

const WIFI_ENABLED_KEY = "network.wifi.enabled"

// -----------------------------------------------------------------------------
// Defaults
// -----------------------------------------------------------------------------

const DEFAULT_WIFI_ENABLED = true

// -----------------------------------------------------------------------------
// Hooks
// -----------------------------------------------------------------------------

/**
 * Reactive signal for WiFi enabled state.
 */
export const useWifiEnabled = () => createRegistrySignal<boolean>(WIFI_ENABLED_KEY, DEFAULT_WIFI_ENABLED)

/**
 * Combined network hook providing WiFi controls.
 */
export const useNetwork = () => {
  const [enabled, setEnabled] = useWifiEnabled()

  const toggleWifi = async () => {
    const newEnabled = !enabled()
    await setEnabled(newEnabled)
    return newEnabled
  }

  return {
    enabled,
    setEnabled,
    toggleWifi,
  }
}

// -----------------------------------------------------------------------------
// Direct Functions (non-reactive)
// -----------------------------------------------------------------------------

/**
 * Get the current WiFi enabled state.
 */
export const getWifiEnabled = async (): Promise<boolean> => {
  const value = await read<boolean>(WIFI_ENABLED_KEY)
  return value ?? DEFAULT_WIFI_ENABLED
}

/**
 * Set the WiFi enabled state.
 */
export const setWifiEnabled = async (value: boolean): Promise<void> => {
  await write(WIFI_ENABLED_KEY, value)
}

/**
 * Toggle the WiFi enabled state and return the new state.
 */
export const toggleWifi = async (): Promise<boolean> => {
  const current = await getWifiEnabled()
  const newEnabled = !current
  await setWifiEnabled(newEnabled)
  return newEnabled
}
