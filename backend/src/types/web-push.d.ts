/** Declarations mínimas para `web-push` (no incluye tipos propios). */
declare module 'web-push' {
  export function setVapidDetails(
    mailTo: string,
    publicKey: string,
    privateKey: string
  ): void
  export function sendNotification(
    subscription: unknown,
    payload?: unknown,
    options?: Record<string, unknown>
  ): Promise<unknown>
}
