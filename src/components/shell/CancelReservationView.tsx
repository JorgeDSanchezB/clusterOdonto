'use client'

/**
 * SHELL — Vista de cancelación de reserva por el paciente.
 * Llega desde el link `/?cancel=ID&token=…` que devuelve la reserva.
 */
import { useQuery } from '@tanstack/react-query'
import { CalendarX2, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { api, apiErrMessage } from '@/lib/api-client'

interface AppointmentPreview {
  id: string
  status: string
  patientName: string | null
  dateLabel: string
  startTime: string
  endTime: string
  service: { name: string } | null
  professional: { name: string } | null
}

export default function CancelReservationView({
  slug,
  id,
  token,
  onClose,
}: {
  slug: string
  id: string
  token: string
  onClose: () => void
}) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['appointment-preview', slug, id, token],
    queryFn: () => api<AppointmentPreview>(`/api/${slug}/appointments/${id}?token=${encodeURIComponent(token)}`),
  })

  const cancel = async () => {
    try {
      await api(`/api/${slug}/appointments/${id}/cancel?token=${encodeURIComponent(token)}`, { method: 'POST' })
      await refetch()
    } catch (err) {
      alert(apiErrMessage(err))
    }
  }

  const cancelled = data?.status === 'CANCELLED'

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-neutral-950/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 animate-fade-up">
        <div className="grid place-items-center size-14 rounded-full t-bg-soft t-text-primary mb-4">
          {cancelled ? <CheckCircle2 className="size-7" /> : <CalendarX2 className="size-7" />}
        </div>
        <h2 className="font-heading text-xl font-bold text-center">
          {cancelled ? 'Reserva cancelada' : '¿Cancelar tu reserva?'}
        </h2>

        {isLoading ? (
          <p className="text-center text-muted-foreground mt-4 flex items-center justify-center gap-2">
            <Loader2 className="size-4 animate-spin" /> Cargando…
          </p>
        ) : error || !data ? (
          <p className="text-center text-destructive mt-4 flex items-center justify-center gap-2">
            <AlertTriangle className="size-4" /> {apiErrMessage(error)}
          </p>
        ) : (
          <>
            <div className="mt-5 rounded-xl border bg-muted/40 divide-y text-sm">
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-muted-foreground">Paciente</span>
                <span className="font-medium">{data.patientName}</span>
              </div>
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-muted-foreground">Servicio</span>
                <span className="font-medium">{data.service?.name ?? '—'}</span>
              </div>
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-muted-foreground">Profesional</span>
                <span className="font-medium">{data.professional?.name ?? '—'}</span>
              </div>
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-muted-foreground">Fecha</span>
                <span className="font-medium">{data.dateLabel}</span>
              </div>
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-muted-foreground">Hora</span>
                <span className="font-medium">
                  {data.startTime} – {data.endTime}
                </span>
              </div>
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-muted-foreground">Estado</span>
                <Badge variant={cancelled ? 'outline' : 'secondary'}>{data.status}</Badge>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse sm:flex-row gap-2">
              <Button variant="outline" className="flex-1" onClick={onClose}>
                Cerrar
              </Button>
              {!cancelled && (
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => void cancel()}
                  disabled={data.endTime === undefined}
                >
                  Sí, cancelar mi reserva
                </Button>
              )}
            </div>
            {cancelled && (
              <p className="text-center text-sm text-muted-foreground mt-3">
                El horario quedó liberado para otros pacientes. ¡Esperamos verte pronto!
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
