import type { TelemetryHealth } from '@shared/contracts'

export function TelemetryHealthPanel({ telemetry }: { telemetry: TelemetryHealth }) {
  return <section className="glass-card p-5">
    <div className="mb-4 flex items-baseline justify-between gap-3">
      <h2 className="font-semibold">Telemetry Quality</h2>
      <span className="text-xs text-dvn-text-secondary">{telemetry.backfillComplete ? 'Backfill complete' : 'Backfill incomplete'}</span>
    </div>
    {telemetry.collectors.length ? <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {telemetry.collectors.map((collector) => <div key={collector.source} className="rounded-lg bg-white/5 p-3">
        <div className="flex justify-between gap-2 text-sm">
          <span className="font-mono">{collector.source}</span>
          <span className="capitalize">{collector.state}</span>
        </div>
        <p className="mt-1 text-xs text-dvn-text-secondary">
          {collector.lastSuccessAt ? `Verified ${new Date(collector.lastSuccessAt).toLocaleString()}` : 'No verified sample'}
        </p>
        {collector.errorCode && <p className="mt-1 text-xs text-red-300">{collector.errorCode}</p>}
      </div>)}
    </div> : <p className="text-sm text-dvn-text-secondary">Telemetry collectors have not produced verified evidence.</p>}
    <p className="mt-3 text-xs text-dvn-text-secondary">
      {telemetry.gaps} recorded gaps · {(telemetry.databaseBytes / 1_048_576).toFixed(1)} MiB database
    </p>
  </section>
}
