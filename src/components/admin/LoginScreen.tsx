'use client'

/** ADMIN — Pantalla de login (email + contraseña). Muestra credenciales demo. */
import { useState } from 'react'
import { KeyRound, Loader2, LogIn, Mail, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/store/auth'

const DEMO_ACCOUNTS = [
  { label: 'OWNER (todo el panel)', email: 'admin@demo.com', password: 'demo1234' },
  { label: 'STAFF (operativo)', email: 'staff@demo.com', password: 'demo1234' },
  { label: 'SUPER_ADMIN (SaaS)', email: 'super@odontosite.com', password: 'admin1234' },
]

export function LoginScreen() {
  const login = useAuthStore((s) => s.login)
  const error = useAuthStore((s) => s.error)
  const [email, setEmail] = useState('admin@demo.com')
  const [password, setPassword] = useState('demo1234')
  const [busy, setBusy] = useState(false)

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setBusy(true)
    await login(email, password)
    setBusy(false)
  }

  return (
    <div className="flex-1 grid lg:grid-cols-2 min-h-[calc(100vh-3rem)]">
      {/* Lado visual */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 text-white overflow-hidden t-bg-primary">
        <div className="flex items-center gap-2.5 relative z-10">
          <ShieldCheck className="size-8" aria-hidden />
          <span className="font-heading text-xl font-bold">Panel del consultorio</span>
        </div>
        <div className="relative z-10">
          <h2 className="font-heading text-4xl font-extrabold leading-tight max-w-md">
            Gestiona tu agenda, tus servicios y tu web desde un solo lugar.
          </h2>
          <ul className="mt-6 space-y-2.5 text-white/85 text-sm">
            <li className="flex items-center gap-2">✓ Calendario real con disponibilidad y bloqueos</li>
            <li className="flex items-center gap-2">✓ Bandeja de pedidos desde la web pública</li>
            <li className="flex items-center gap-2">✓ Facturación PDF con IVA configurable</li>
            <li className="flex items-center gap-2">✓ Editor visual por secciones + temas</li>
          </ul>
        </div>
        <p className="relative z-10 text-white/60 text-xs">OdontoSite — demo: Clínica Dental Sonrisa Andina</p>
        <div className="absolute -right-24 -top-24 size-96 rounded-full bg-white/10" aria-hidden />
        <div className="absolute -left-16 -bottom-16 size-72 rounded-full bg-white/10" aria-hidden />
      </div>

      {/* Formulario */}
      <div className="flex items-center justify-center p-6 sm:p-10 bg-muted/30">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="mx-auto grid place-items-center size-14 rounded-2xl t-bg-primary text-white mb-4 shadow-lg">
              <LogIn className="size-6" aria-hidden />
            </div>
            <h1 className="font-heading text-2xl font-extrabold">Ingresar al panel</h1>
            <p className="text-sm text-muted-foreground mt-1">Acceso exclusivo del equipo del consultorio</p>
          </div>

          <form onSubmit={submit} className="bg-white rounded-3xl border shadow-sm p-6 sm:p-8 space-y-4">
            <div>
              <label htmlFor="login-email" className="text-sm font-medium flex items-center gap-1.5">
                <Mail className="size-3.5 text-muted-foreground" aria-hidden /> Email
              </label>
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                className="mt-1.5 h-11"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="login-pass" className="text-sm font-medium flex items-center gap-1.5">
                <KeyRound className="size-3.5 text-muted-foreground" aria-hidden /> Contraseña
              </label>
              <Input
                id="login-pass"
                type="password"
                autoComplete="current-password"
                className="mt-1.5 h-11"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" className="t-btn-primary w-full h-11 rounded-full font-bold" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : 'Ingresar'}
            </Button>
          </form>

          <div className="mt-5 rounded-2xl border border-dashed bg-white/60 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
              Cuentas demo (clic para rellenar)
            </p>
            <div className="grid gap-1.5">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => {
                    setEmail(acc.email)
                    setPassword(acc.password)
                  }}
                  className="flex items-center justify-between gap-2 text-left text-xs rounded-xl hover:bg-muted px-3 py-2 transition-colors"
                >
                  <span className="min-w-0">
                    <Badge variant="secondary" className="mr-1.5 text-[10px]">{acc.label}</Badge>
                    <span className="text-muted-foreground font-mono">{acc.email}</span>
                  </span>
                  <span className="text-muted-foreground/70 font-mono">{acc.password}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
