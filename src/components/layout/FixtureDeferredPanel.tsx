import { DatabaseZap } from 'lucide-react'
import type { FixtureDeferredTab } from '@/lib/fixture-isolation'
import { fixtureDeferredSections } from '@/lib/fixture-isolation'

interface FixtureDeferredPanelProps {
  section: FixtureDeferredTab
}

export function FixtureDeferredPanel({ section }: FixtureDeferredPanelProps) {
  const content = fixtureDeferredSections[section]

  return (
    <section className="glass-card p-6 sm:p-8" aria-labelledby="fixture-deferred-title">
      <div className="flex max-w-2xl items-start gap-4">
        <div className="rounded-lg bg-amber-500/10 p-3 text-amber-400" aria-hidden="true">
          <DatabaseZap className="h-5 w-5" />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">Fixture preview</p>
          <h1 id="fixture-deferred-title" className="font-heading text-xl font-semibold text-dvn-text-primary">
            {content.title} is not connected in this preview
          </h1>
          <p className="text-sm leading-6 text-dvn-text-secondary">{content.description}</p>
          <p className="text-sm leading-6 text-dvn-text-muted">
            No legacy Supabase request has been made. Navigation remains available for route and responsive testing.
          </p>
        </div>
      </div>
    </section>
  )
}
