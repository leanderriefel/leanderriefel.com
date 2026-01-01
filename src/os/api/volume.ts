import { createRegistrySignal } from "~/os/registry"

export const useVolume = () => createRegistrySignal("volume", 50)
