'use client'

/**
 * PÚBLICO — Carrito de servicios (drawer). "Enviar pedido por WhatsApp":
 * 1) POST /api/[slug]/orders → el pedido queda en la bandeja del admin.
 * 2) Se abre WhatsApp con el mensaje pre-armado que devuelve el backend.
 */
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Loader2, MessageCircle, ShoppingBag, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useUiStore } from '@/store/ui'
import { useCartStore, cartSubtotal } from '@/store/cart'
import { api, apiErrMessage } from '@/lib/api-client'
import { QtyStepper } from './ServiceCard'
import { translator } from '@/lib/i18n'
import type { PublicTenant } from './types'

interface OrderResponse {
  orderId: string
  total: number
  whatsappUrl: string
  message: string
}

export function CartDrawer({ tenant }: { tenant: PublicTenant }) {
  const lang = useUiStore((s) => s.lang)
  const t = translator(lang)
  const open = useUiStore((s) => s.cartOpen)
  const setOpen = useUiStore((s) => s.setCartOpen)
  const { items, customerName, customerPhone, setCustomer, setQty, clear } = useCartStore()
  const subtotal = useCartStore(cartSubtotal)
  const iva = (subtotal * tenant.ivaPercent) / 100
  const total = subtotal + iva
  const [sent, setSent] = useState<OrderResponse | null>(null)
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await api<OrderResponse>(`/api/${tenant.slug}/orders`, {
        method: 'POST',
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          items: items.map((i) => ({ serviceId: i.serviceId, qty: i.qty })),
        }),
      })
      return res
    },
    onSuccess: (res) => {
      setSent(res)
      toast.success('Pedido registrado', {
        description: 'Apareció en la bandeja del panel admin. Ahora ábrelo en WhatsApp.',
      })
      // La bandeja del admin debe refrescarse
      void queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
    },
    onError: (err) => toast.error(apiErrMessage(err)),
  })

  const canSend = items.length > 0 && customerName.trim().length >= 3 && customerPhone.trim().length >= 7 && !mutation.isPending

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) setSent(null)
      }}
    >
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="p-5 border-b">
          <SheetTitle className="font-heading flex items-center gap-2 text-lg">
            <ShoppingBag className="size-5 t-text-primary" aria-hidden /> {t('cart.title')}
          </SheetTitle>
        </SheetHeader>

        {sent ? (
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto nice-scroll p-6 space-y-5">
              <div className="grid place-items-center size-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto">
                <CheckCircle2 className="size-8" />
              </div>
              <div className="text-center">
                <h3 className="font-heading font-bold text-lg">{t('cart.sent')}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Ref. <span className="font-mono font-semibold">{sent.orderId.slice(0, 8).toUpperCase()}</span> · Total{' '}
                  ${sent.total.toFixed(2)}
                </p>
              </div>
              <div className="rounded-xl border bg-muted/40 p-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Mensaje pre-armado (lo construye el backend)
                </p>
                <pre className="text-[11px] leading-relaxed whitespace-pre-wrap font-mono text-neutral-700 max-h-40 overflow-y-auto nice-scroll">
                  {sent.message}
                </pre>
              </div>
            </div>
            <div className="border-t p-5 space-y-2 bg-white">
              <a
                href={sent.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3.5 text-sm font-bold transition-colors"
              >
                <MessageCircle className="size-4.5" aria-hidden /> {t('cart.openWa')}
              </a>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                  clear()
                  setSent(null)
                  setOpen(false)
                }}
              >
                Listo
              </Button>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="flex-1 grid place-items-center p-8">
            <div className="text-center">
              <ShoppingBag className="size-12 text-neutral-200 mx-auto" aria-hidden />
              <p className="mt-4 text-sm text-muted-foreground">{t('cart.empty')}</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto nice-scroll p-5 space-y-3">
              {items.map((item) => (
                <div key={item.serviceId} className="flex items-center gap-3 rounded-2xl border bg-white p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">${item.price.toFixed(2)} c/u</p>
                  </div>
                  <QtyStepper small qty={item.qty} onChange={(q) => setQty(item.serviceId, q)} />
                  <button
                    onClick={() => setQty(item.serviceId, 0)}
                    className="grid place-items-center size-7 rounded-full text-neutral-300 hover:text-destructive hover:bg-destructive/10 transition-colors"
                    aria-label={`Quitar ${item.name}`}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="border-t p-5 space-y-4 bg-white">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground" htmlFor="cart-name">
                    {t('cart.name')}
                  </label>
                  <Input
                    id="cart-name"
                    className="mt-1 h-10"
                    placeholder="Ej: María Pérez"
                    value={customerName}
                    onChange={(e) => setCustomer(e.target.value, customerPhone)}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground" htmlFor="cart-phone">
                    {t('cart.phone')}
                  </label>
                  <Input
                    id="cart-phone"
                    className="mt-1 h-10"
                    placeholder="099 123 4567"
                    value={customerPhone}
                    onChange={(e) => setCustomer(customerName, e.target.value)}
                  />
                </div>
              </div>

              <div className="rounded-2xl t-bg-soft border t-border/20 p-4 text-sm space-y-1.5">
                <div className="flex justify-between text-muted-foreground">
                  <span>{t('cart.subtotal')}</span>
                  <span className="tabular-nums">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>
                    {t('cart.iva')} ({tenant.ivaPercent}%)
                  </span>
                  <span className="tabular-nums">${iva.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-base pt-1.5 border-t border-dashed border-neutral-300">
                  <span>{t('cart.total')}</span>
                  <span className="tabular-nums t-text-primary">${total.toFixed(2)}</span>
                </div>
              </div>

              <Button
                disabled={!canSend}
                onClick={() => mutation.mutate()}
                className="w-full h-12 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Enviando…
                  </>
                ) : (
                  <>
                    <MessageCircle className="size-4.5" aria-hidden /> {t('cart.send')}
                  </>
                )}
              </Button>
              <p className="text-[11px] text-center text-muted-foreground">
                El pedido se registra en el panel del consultorio y luego se abre WhatsApp.
              </p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
