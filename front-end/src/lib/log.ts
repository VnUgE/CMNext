/**
 * Centralized dev-only logging. User-facing errors go through the toaster;
 * this is for diagnostics that should never leak into production consoles.
 * All other `console` uses should route through here.
 */
export const logError = (...args: unknown[]): void => {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console -- this is the single sanctioned console site
    console.error(...args);
  }
};
