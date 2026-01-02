import { createRegistrySignal, read, write } from "~/os/registry"

// -----------------------------------------------------------------------------
// Registry Keys
// -----------------------------------------------------------------------------

const VOLUME_KEY = "audio.volume"
const MUTED_KEY = "audio.muted"

// -----------------------------------------------------------------------------
// Defaults
// -----------------------------------------------------------------------------

const DEFAULT_VOLUME: number = 50
const DEFAULT_MUTED = false

// -----------------------------------------------------------------------------
// Hooks
// -----------------------------------------------------------------------------

/**
 * Reactive signal for volume level (0-100).
 */
export const useVolume = () => createRegistrySignal(VOLUME_KEY, DEFAULT_VOLUME)

/**
 * Reactive signal for mute state.
 */
export const useMuted = () => createRegistrySignal<boolean>(MUTED_KEY, DEFAULT_MUTED)

/**
 * Combined audio hook providing volume, mute controls, and computed effective volume.
 */
export const useAudio = () => {
  const [volume, setVolume] = useVolume()
  const [muted, setMuted] = useMuted()

  const toggleMute = async () => {
    const newMuted = !muted()
    await setMuted(newMuted)
    return newMuted
  }

  /**
   * Effective volume considering mute state.
   * Returns 0 when muted, otherwise returns actual volume.
   */
  const effectiveVolume = () => (muted() ? 0 : volume())

  return {
    volume,
    setVolume,
    muted,
    setMuted,
    toggleMute,
    effectiveVolume,
  }
}

// -----------------------------------------------------------------------------
// Direct Functions (non-reactive)
// -----------------------------------------------------------------------------

/**
 * Get the current volume level.
 */
export const getVolume = async (): Promise<number> => {
  const value = await read<number>(VOLUME_KEY)
  return value ?? DEFAULT_VOLUME
}

/**
 * Set the volume level (0-100).
 */
export const setVolume = async (value: number): Promise<void> => {
  const clamped = Math.max(0, Math.min(100, value))
  await write(VOLUME_KEY, clamped)
}

/**
 * Get the current mute state.
 */
export const getMuted = async (): Promise<boolean> => {
  const value = await read<boolean>(MUTED_KEY)
  return value ?? DEFAULT_MUTED
}

/**
 * Set the mute state.
 */
export const setMuted = async (value: boolean): Promise<void> => {
  await write(MUTED_KEY, value)
}

/**
 * Toggle the mute state and return the new state.
 */
export const toggleMute = async (): Promise<boolean> => {
  const current = await getMuted()
  const newMuted = !current
  await setMuted(newMuted)
  return newMuted
}
