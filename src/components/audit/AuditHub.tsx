'use client'

/**
 * AUDIT — Hub de auditoría de las Fases 1–5. El dueño no programador puede
 * verificar cada fase visualmente y "probar" los mecanismos (API real,
 * metadata extensible, virtualización y tema en vivo).
 */
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useState } from 'react'
import Phase1Plan from './Phase1Plan'
import Phase2Data from './Phase2Data'
import Phase3Api from './Phase3Api'
import Phase4Metadata from './Phase4Metadata'
import Phase5Render from './Phase5Render'

const PHASES = [
  { id: 'f1', label: 'Fase 1 · Plan' },
  { id: 'f2', label: 'Fase 2 · Datos' },
  { id: 'f3', label: 'Fase 3 · API' },
  { id: 'f4', label: 'Fase 4 · Extensible' },
  { id: 'f5', label: 'Fase 5 · Render' },
] as const

export default function AuditHub() {
  const [phase, setPhase] = useState<string>('f1')

  return (
    <div className="flex-1 bg-neutral-50">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        <header className="mb-6">
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold">Auditoría de fases</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl leading-relaxed">
            Cada fase del plan estratégico con su demo interactiva: wireframes, modelo de datos,
            contratos API (reales), la regla de inserción extensible y la estrategia de renderizado.
          </p>
        </header>

        <Tabs value={phase} onValueChange={setPhase}>
          <TabsList className="flex-wrap h-auto mb-6">
            {PHASES.map((p) => (
              <TabsTrigger key={p.id} value={p.id} className="text-xs sm:text-sm">
                {p.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {phase === 'f1' && <Phase1Plan />}
          {phase === 'f2' && <Phase2Data />}
          {phase === 'f3' && <Phase3Api />}
          {phase === 'f4' && <Phase4Metadata />}
          {phase === 'f5' && <Phase5Render />}
        </Tabs>
      </div>
    </div>
  )
}
