'use client'

/**
 * ADMIN — Facturación: lista, detalle con PREVIEW del PDF (renderizado en el
 * navegador con el MISMO componente del servidor: InvoiceDocument),
 * descarga y envío por email (ConsoleEmailProvider en dev).
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import dynamic from 'next/dynamic'
import { Download, Loader2, Mail, Receipt, Send } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { api } from '@/lib/api-client'
import { formatQuitoDateShort } from '@/lib/quito-time'
import type { InvoiceEntity, TenantEntity } from '@/domain/entities'
import { useMutationWithToast } from './mutation-with-toast'

// El documento PDF se carga de forma diferida (solo cuando se abre el detalle)
const InvoicePdfPreview = dynamic(() => import('./InvoicePdfPreview'), {
  ssr: false,
  loading: () => (
    <div className="grid place-items-center py-16 text-muted-foreground">
      <Loader2 className="size-6 animate-spin" />
    </div>
  ),
})

export interface InvoiceDetail extends Omit<InvoiceEntity, 'createdAt' | 'updatedAt' | 'emailSentAt'> {
  createdAt: string
  updatedAt: string
  emailSentAt: string | null
}

interface TenantAdminRow extends Omit<TenantEntity, 'createdAt' | 'updatedAt' | 'config'> {
  config: { theme: { primary: string } }
  createdAt: string
  updatedAt: string
}

export function InvoicesView() {
  const { data: invoices, isLoading } = useQuery({
    queryKey: ['admin-invoices'],
    queryFn: () => api<InvoiceDetail[]>('/api/admin/invoices?limit=50'),
  })

  const [selected, setSelected] = useState<InvoiceDetail | null>(null)

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-white divide-y overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-4 py-3 bg-muted/60 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          <span>Número / Cliente</span>
          <span className="hidden sm:block w-24 text-right">Fecha</span>
          <span className="w-24 text-right">Total</span>
          <span className="w-10" aria-hidden />
        </div>
        {isLoading ? (
          <div className="py-12 grid place-items-center text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : (invoices ?? []).length === 0 ? (
          <div className="py-14 text-center">
            <Receipt className="size-10 text-neutral-200 mx-auto" aria-hidden />
            <p className="text-sm text-muted-foreground mt-3">
              Sin facturas aún — genera la primera desde un pedido en la sección <strong>Pedidos</strong>.
            </p>
          </div>
        ) : (
          (invoices ?? []).map((inv) => (
            <button
              key={inv.id}
              onClick={() => setSelected(inv)}
              className="w-full grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center px-4 py-3 hover:bg-muted/40 transition-colors text-left"
            >
              <span className="min-w-0">
                <span className="block font-mono text-xs font-semibold truncate">{inv.number}</span>
                <span className="block text-xs text-muted-foreground truncate">
                  {inv.customerName} {inv.emailSentAt ? '· ✉️ enviada' : ''}
                </span>
              </span>
              <span className="hidden sm:block w-24 text-right text-xs text-muted-foreground">{formatQuitoDateShort(new Date(inv.createdAt))}</span>
              <span className="w-24 text-right font-heading font-bold tabular-nums">${inv.total.toFixed(2)}</span>
              <span className="w-10 grid place-items-center">
                <Download className="size-4 text-muted-foreground" aria-hidden />
              </span>
            </button>
          ))
        )}
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed max-w-2xl">
        📌 Documento comercial interno (contabilidad + entrega al paciente). <strong>NO</strong> es comprobante
        electrónico ante el SRI — en v2 se añade <code className="font-mono">SriInvoiceProvider</code> implementando la
        misma interfaz <code className="font-mono">InvoiceProvider</code>, sin tocar el núcleo.
      </p>

      <InvoiceDetailDialog invoice={selected} onClose={() => setSelected(null)} />
    </div>
  )
}

export function InvoiceDetailDialog({ invoice, onClose }: { invoice: InvoiceDetail | null; onClose: () => void }) {
  const { data: tenant } = useQuery({
    queryKey: ['admin-tenant'],
    queryFn: () => api<TenantAdminRow | null>('/api/admin/tenant'),
    enabled: !!invoice,
  })

  const [emailPreview, setEmailPreview] = useState<{ to: string; subject: string; body: string } | null>(null)
  const close = () => {
    setEmailPreview(null)
    onClose()
  }

  const sendMutation = useMutationWithToast<void>(
    async () => {
      if (!invoice) return
      const res = await api<{ preview: { to: string; subject: string; body: string } }>(
        `/api/admin/invoices/${invoice.id}/send-email`,
        { method: 'POST' },
      )
      setEmailPreview(res.preview)
    },
    { success: 'Email enviado (ConsoleEmailProvider — ver consola del servidor)' },
  )

  if (!invoice) return null

  return (
    <Dialog open={!!invoice} onOpenChange={(v) => !v && close()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto nice-scroll">
        <DialogHeader>
          <DialogTitle className="font-heading flex flex-wrap items-center gap-2.5">
            Factura <span className="font-mono text-sm">{invoice.number}</span>
            <Badge variant="secondary">${invoice.total.toFixed(2)}</Badge>
            {invoice.emailSentAt && <Badge variant="outline">✉️ enviada</Badge>}
          </DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-[1fr_240px] gap-4 items-start">
          {/* Preview del PDF con el mismo componente del servidor */}
          <div className="rounded-xl border overflow-hidden bg-neutral-100 min-h-80">
            {tenant ? (
              <InvoicePdfPreview
                invoice={{ ...invoice, createdAt: new Date(invoice.createdAt) } as InvoiceEntity}
                tenant={{
                  name: tenant.name,
                  ruc: tenant.ruc,
                  address: tenant.address,
                  city: tenant.city,
                  phone: tenant.phone,
                  email: tenant.email,
                  logoUrl: tenant.logoUrl,
                }}
                primaryColor={tenant.config?.theme?.primary ?? '#0f766e'}
              />
            ) : (
              <div className="grid place-items-center py-20 text-muted-foreground">
                <Loader2 className="size-6 animate-spin" />
              </div>
            )}
          </div>

          {/* Panel lateral */}
          <div className="space-y-3">
            <div className="rounded-xl border bg-muted/40 p-4 text-sm space-y-1.5">
              <p className="font-semibold">{invoice.customerName}</p>
              <p className="text-xs text-muted-foreground">{invoice.customerEmail ?? 'Sin email registrado'}</p>
              <div className="pt-2 border-t border-dashed space-y-1 text-xs">
                {invoice.items.map((it, i) => (
                  <p key={i} className="flex justify-between gap-2">
                    <span className="truncate">{it.description} ×{it.qty}</span>
                    <span className="tabular-nums">${it.total.toFixed(2)}</span>
                  </p>
                ))}
                <p className="flex justify-between border-t border-dashed pt-1.5 text-muted-foreground">
                  <span>Subtotal</span> <span className="tabular-nums">${invoice.subtotal.toFixed(2)}</span>
                </p>
                <p className="flex justify-between text-muted-foreground">
                  <span>IVA ({invoice.ivaRate}%)</span> <span className="tabular-nums">${invoice.ivaAmount.toFixed(2)}</span>
                </p>
                <p className="flex justify-between font-bold">
                  <span>Total</span> <span className="tabular-nums">${invoice.total.toFixed(2)}</span>
                </p>
              </div>
            </div>

            <a
              href={`/api/admin/invoices/${invoice.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold hover:bg-muted transition-colors"
            >
              <Download className="size-4" aria-hidden /> Descargar PDF (servidor)
            </a>
            <Button
              className="w-full rounded-full font-semibold"
              variant="outline"
              disabled={sendMutation.isPending || !invoice.customerEmail}
              onClick={() => sendMutation.mutate()}
            >
              <Send className="size-4" aria-hidden /> {sendMutation.isPending ? 'Enviando…' : 'Enviar por email al paciente'}
            </Button>

            {emailPreview && (
              <div className="rounded-xl border border-dashed p-4 bg-white">
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <Mail className="size-3.5" aria-hidden /> Email generado (ConsoleEmailProvider)
                </p>
                <p className="text-xs mt-2"><strong>Para:</strong> {emailPreview.to}</p>
                <p className="text-xs"><strong>Asunto:</strong> {emailPreview.subject}</p>
                <pre className="text-[10px] whitespace-pre-wrap mt-2 font-mono text-neutral-600 max-h-40 overflow-y-auto nice-scroll">{emailPreview.body}</pre>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
