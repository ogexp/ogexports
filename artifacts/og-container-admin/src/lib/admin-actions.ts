export async function runAdminAction(
  action: () => Promise<void>,
  opts: {
    onSuccess: (msg?: string) => void
    onError: (msg: string) => void
    reload?: () => Promise<void>
    successMessage?: string
  },
): Promise<boolean> {
  try {
    await action()
    if (opts.reload) await opts.reload()
    opts.onSuccess(opts.successMessage)
    return true
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Action failed"
    opts.onError(msg)
    return false
  }
}
