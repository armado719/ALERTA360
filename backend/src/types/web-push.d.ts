/** Declarations mínimas para `web-push` (no incluye tipos propios). */
declare module 'web-push' {
  // Paquete CommonJS: en ESM todo llega por el export por defecto.
  const webpush: {
    setVapidDetails(mailTo: string, publicKey: string, privateKey: string): void
    sendNotification(
      subscription: unknown,
      payload?: unknown,
      options?: Record<string, unknown>
    ): Promise<unknown>
  }
  export default webpush
}
