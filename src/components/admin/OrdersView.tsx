'use client'

/**
 * ADMIN — Bandeja de pedidos (virtualizada con @tanstack/react-virtual):
 * el DOM solo renderiza los pedidos visibles, aunque haya miles.
 * Acciones: cambiar estado y generar factura (OWNER).
 */
import { useRef, useState } from 'react'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Inbox, Loader2, MessageCircle, Receipt, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api, apiErrMessage } from '@/lib/api-client'
import { formatQuitoDateTime } from '@/lib/quito-time'
import { useAuthStore } from '@/store/auth'
import { InvoiceDetailDialog, type InvoiceDetail } from './InvoicesView'

interface OrderRow {
  id: string
  customerName: string
  customerPhone: string
  customerEmail: string | null
  items: { serviceId: string; name: string; price: number; qty: number }[]
  total: number
  status: string
  whatsappSentAt: string | null
  createdAt: string
}

const STATUS_STYLES: Record<string, string> = {
  NEW: 'bg-amber-100 text-amber-800 border-amber-200',
  CONTACTED: 'bg-sky-100 text-sky-800 border-sky-200',
  COMPLETED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  CANCELLED: 'bg-neutral-100 text-neutral-500 border-neutral-200',
}

export function OrdersView() {
  const parentRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()
  const session = useAuthStore((s) => s.session)
  const isOwner = session?.user.role === 'OWNER'
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null)

  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage, refetch, isRefetching } = useInfiniteQuery({
    queryKey: ['admin-orders'],
    queryFn: ({ pageParam }) =>
      apiPageRequest<OrderRow>(`/api/admin/orders?limit=20${pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ''}`),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  })

  const orders = data?.pages.flatMap((p) => p.data) ?? []

  const virtualizer = useVirtualizer({
    count: orders.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 132,
    overscan: 6,
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api(`/api/admin/orders/${id}`, { method: 'PUT', body: JSON.stringify({ status }) }),
    onSuccess: () => {
      toast.success('Estado actualizado')
      void queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
      void queryClient.invalidateQueries({ queryKey: ['admin-overview'] })
    },
    onError: (e) => toast.error(apiErrMessage(e)),
  })

  const invoiceMutation = useMutation({
    mutationFn: (orderId: string) =>
      api<InvoiceDetail>('/api/admin/invoices', { method: 'POST', body: JSON.stringify({ orderId }) }),
    onSuccess: (inv, _orderId, ctx) => {
      const created = (ctx as { created?: boolean } | undefined)?.created
      toast.success(created === false ? 'Factura existente' : 'Factura generada', {
        description: `Nº ${inv.number} · Total $${inv.total.toFixed(2)}`,
      })
      setInvoice(inv)
      void queryClient.invalidateQueries({ queryKey: ['admin-invoices'] })
    },
    onError: (e) => toast.error(apiErrMessage(e)),
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Lista virtualizada (@tanstack/react-virtual) — render en DOM: {virtualizer.getVirtualItems().length} de {orders.length}
        </p>
        <Button size="sm" variant="outline" onClick={() => void refetch()} disabled={isRefetching}>
          <RefreshCw className={`size-3.5 ${isRefetching ? 'animate-spin' : ''}`} aria-hidden /> Actualizar
        </Button>
      </div>

      <div
        ref={parentRef}
        className="max-h-[calc(100vh-16rem)] overflow-y-auto nice-scroll rounded-2xl border bg-white divide-y"
        role="list"
        aria-label="Pedidos"
      >
        {isLoading ? (
          <div className="py-16 grid place-items-center text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center">
            <Inbox className="size-10 text-neutral-200 mx-auto" aria-hidden />
            <p className="text-sm text-muted-foreground mt-3">No hay pedidos todavía.</p>
          </div>
        ) : (
          <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
            {virtualizer.getVirtualItems().map((vRow) => {
              const order = orders[vRow.index]
              return (
                <div
                  key={order.id}
                  role="listitem"
                  ref={virtualizer.measureElement}
                  data-index={vRow.index}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${vRow.start}px)` }}
                  className="p-4 sm:p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{order.customerName}</span>
                        <span className="font-mono text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </span>
                        <Badge className={`border ${STATUS_STYLES[order.status] ?? ''}`}>{order.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        📞 {order.customerPhone} · {formatQuitoDateTime(new Date(order.createdAt))}
                      </p>
                      <ul className="mt-2.5 flex flex-wrap gap-1.5">
                        {order.items.map((it) => (
                          <li
                            key={it.serviceId}
                            className="text-[11px] rounded-full bg-muted border px-2 py-0.5 text-neutral-600"
                          >
                            {it.name} ×{it.qty} — ${(it.price * it.qty).toFixed(2)}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="flex flex-col items-end gap-2.5 shrink-0">
                      <p className="font-heading font-extrabold text-lg tabular-nums">${order.total.toFixed(2)}</p>
                      <div className="flex items-center gap-2">
                        {isOwner && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-full text-xs"
                            disabled={invoiceMutation.isPending}
                            onClick={() => invoiceMutation.mutate(order.id)}
                          >
                            <Receipt className="size-3.5" aria-hidden />
                            {invoiceMutation.isPending ? 'Generando…' : 'Generar factura'}
                          </Button>
                        )}
                        <Select
                          value={order.status}
                          onValueChange={(status) => statusMutation.mutate({ id: order.id, status })}
                        >
                          <SelectTrigger className="h-8 w-36 text-xs rounded-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NEW">Nuevo</SelectItem>
                            <SelectItem value="CONTACTED">Contactado</SelectItem>
                            <SelectItem value="COMPLETED">Completado</SelectItem>
                            <SelectItem value="CANCELLED">Cancelado</SelectItem>
                          </SelectContent>
                        </Select>
                        <a
                          href={`https://wa.me/${order.customerPhone.replace(/\D/g, '').replace(/^0/, '593')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="grid place-items-center size-8 rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
                          title="Escribir por WhatsApp"
                        >
                          <MessageCircle className="size-4" aria-hidden />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {hasNextPage && (
        <div className="text-center">
          <Button variant="outline" onClick={() => void fetchNextPage()} disabled={isFetchingNextPage}>
            {isFetchingNextPage ? 'Cargando…' : 'Cargar más pedidos'}
          </Button>
        </div>
      )}

      <InvoiceDetailDialog invoice={invoice} onClose={() => setInvoice(null)} />
    </div>
  )
}

/** Helper local de página (data + nextCursor). */
async function apiPageRequest<T>(path: string): Promise<{ data: T[]; nextCursor: string | null }> {
  const res = await fetch(path)
  const body = await res.json()
  if (!res.ok) throw new Error(body?.error?.message ?? 'Error')
  return { data: body.data ?? [], nextCursor: body.meta?.nextCursor ?? null }
}
