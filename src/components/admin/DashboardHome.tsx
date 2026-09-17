'use client'

/** ADMIN — Resumen: métricas, próximas citas, pedidos recientes y semana. */
import { useQuery } from '@tanstack/react-query'
import { CalendarClock, Clock, Receipt, ShoppingBag, Sparkles, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api-client'
import { formatQuitoDateTime, formatQuitoDateShort, minutesToHHMM, utcToQuito } from '@/lib/quito-time'

interface Overview {
  todayAppointments: number
  pendingCount: number
  newOrders: number
  monthRevenue: number
  activeServices: number
  activeProfessionals: number
  upcoming: { id: string; start: string; status: string; patientName: string | null; service: string; professional: string }[]
  recentOrders: { id: string; customerName: string; customerPhone: string; total: number; status: string; createdAt: string }[]
  weekCounts: { date: string; count: number }[]
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  CONFIRMED: 'default',
  PENDING: 'secondary',
  CANCELLED: 'destructive',
  BLOCKED: 'outline',
  NEW: 'secondary',
  CONTACTED: 'outline',
  COMPLETED: 'default',
}

export function DashboardHome() {
  const { data, isLoading } = useQuery({ queryKey: ['admin-overview'], queryFn: () => api<Overview | null>('/api/admin/overview') })

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
    )
  }
  if (!data) return <p className="text-sm text-muted-foreground">Sin métricas disponibles.</p>

  const maxWeek = Math.max(1, ...data.weekCounts.map((w) => w.count))
  const stats = [
    { label: 'Citas de hoy', value: data.todayAppointments, icon: CalendarClock, hint: 'Confirmadas + pendientes' },
    { label: 'Por confirmar', value: data.pendingCount, icon: Clock, hint: 'Reservas web en espera' },
    { label: 'Pedidos nuevos', value: data.newOrders, icon: ShoppingBag, hint: 'Bandeja sin atender' },
    { label: 'Facturado 30d', value: `$${data.monthRevenue.toFixed(2)}`, icon: Receipt, hint: 'Suma de facturas' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="rounded-2xl border-neutral-200">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
                  <p className="font-heading text-3xl font-extrabold mt-1.5 tabular-nums">{s.value}</p>
                  <p className="text-[11px] text-muted-foreground/70 mt-1">{s.hint}</p>
                </div>
                <span className="grid place-items-center size-10 rounded-xl t-bg-soft t-text-primary">
                  <s.icon className="size-5" aria-hidden />
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Próximas citas */}
        <Card className="lg:col-span-3 rounded-2xl border-neutral-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="size-4 t-text-primary" aria-hidden /> Próximas citas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Sin próximas citas.</p>
            ) : (
              <ul className="divide-y">
                {data.upcoming.map((a) => {
                  const q = utcToQuito(new Date(a.start))
                  return (
                    <li key={a.id} className="flex items-center gap-3 py-2.5">
                      <div className="text-center shrink-0 w-14">
                        <p className="text-[10px] uppercase text-muted-foreground">{formatQuitoDateShort(new Date(a.start)).split(' ')[0]}</p>
                        <p className="font-heading font-bold tabular-nums">{minutesToHHMM(q.minutes)}</p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{a.patientName ?? '—'}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {a.service} · {a.professional}
                        </p>
                      </div>
                      <Badge variant={STATUS_VARIANT[a.status] ?? 'secondary'}>{a.status}</Badge>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Semana + pedidos */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="rounded-2xl border-neutral-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="size-4 t-text-primary" aria-hidden /> Citas · próximos 7 días
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-1.5 h-24" role="img" aria-label="Gráfico de citas de la semana">
                {data.weekCounts.map((w) => (
                  <div key={w.date} className="flex-1 flex flex-col items-center gap-1" title={`${w.date}: ${w.count} citas`}>
                    <div
                      className="w-full rounded-t-md t-bg-primary/85 min-h-1"
                      style={{ height: `${Math.max(6, (w.count / maxWeek) * 84)}px` }}
                    />
                    <span className="text-[9px] text-muted-foreground">{formatQuitoDateShort(new Date(w.date + 'T12:00:00Z')).split(' ')[0]}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-neutral-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <ShoppingBag className="size-4 t-text-primary" aria-hidden /> Pedidos recientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.recentOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Sin pedidos todavía.</p>
              ) : (
                <ul className="divide-y">
                  {data.recentOrders.map((o) => (
                    <li key={o.id} className="flex items-center gap-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{o.customerName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatQuitoDateTime(new Date(o.createdAt))} · ${o.total.toFixed(2)}
                        </p>
                      </div>
                      <Badge variant={STATUS_VARIANT[o.status] ?? 'secondary'}>{o.status}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground text-center">
        Catálogo activo: <strong>{data.activeServices}</strong> servicios · <strong>{data.activeProfessionals}</strong> profesionales
      </p>
    </div>
  )
}
