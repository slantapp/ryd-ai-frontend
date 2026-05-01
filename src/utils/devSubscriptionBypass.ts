/**
 * Opt-in bypass for dashboard subscription blocking while developing locally.
 *
 * Enable: add `VITE_DEV_SKIP_SUBSCRIPTION_GATE=true` to `.env.local` (or `.env`)
 * and restart `npm run dev`.
 *
 * Safety: only applies when `import.meta.env.DEV` is true, so production builds
 * never honor this flag even if it is set by mistake.
 */
export const devSkipSubscriptionGate =
  import.meta.env.DEV && import.meta.env.VITE_DEV_SKIP_SUBSCRIPTION_GATE === "true";
