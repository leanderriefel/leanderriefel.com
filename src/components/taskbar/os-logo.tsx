export const OsLogo = () => {
  return (
    <div class="relative flex h-6 w-6 items-center justify-center">
      <div class="absolute inset-0 rounded-full bg-linear-to-br from-primary/25 via-primary/15 to-transparent opacity-90 blur-[2px]" />
      <div class="absolute inset-[2px] rounded-full border border-primary/25 bg-background/40 shadow-[0_4px_16px_rgba(59,130,246,0.35)] backdrop-blur-sm" />
      <div class="relative flex h-3.5 w-3.5 items-center justify-center rounded-full bg-linear-to-br from-primary to-primary/70 shadow-[0_6px_18px_rgba(59,130,246,0.55)]">
        <div class="h-1.5 w-1.5 rounded-full bg-background/85 shadow-[0_0_8px_rgba(255,255,255,0.45)]" />
      </div>
    </div>
  )
}
