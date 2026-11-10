/** Browser-only resource limits; the CLI retains its larger shared limits. */
export const playgroundLimits = {
  bytes: 1024 ** 2,
  files: 16,
  timeoutMs: 5000,
} as const;
