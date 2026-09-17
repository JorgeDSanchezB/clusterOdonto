'use client'

/** ADMIN — Helper de mutación con toasts de éxito/error (DRY). */
import { useMutation, type UseMutationOptions } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiErrMessage } from '@/lib/api-client'

/** Mutación con toast de éxito y error humanizado. */
export function useMutationWithToast<TData>(
  mutationFn: () => Promise<TData>,
  opts: { success?: string; onDone?: () => void },
) {
  return useMutation({
    mutationFn,
    onSuccess: () => {
      if (opts.success) toast.success(opts.success)
      opts.onDone?.()
    },
    onError: (err) => toast.error(apiErrMessage(err)),
  } satisfies UseMutationOptions<TData, Error, void, unknown>)
}
