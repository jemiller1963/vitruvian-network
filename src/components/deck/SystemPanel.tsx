import type { SystemSummary } from '@shared/contracts'

const bytes = (value: number | null) => value === null ? 'Unavailable' : `${(value / 1e9).toFixed(1)} GB`

export function SystemPanel({ system }: { system: SystemSummary }) {
  const memoryUsed = system.memory.totalBytes - system.memory.freeBytes
  const swapUsed = system.swap.totalBytes === null || system.swap.freeBytes === null
    ? null
    : system.swap.totalBytes - system.swap.freeBytes
  const diskUsed = system.disk.totalBytes === null || system.disk.freeBytes === null
    ? null
    : system.disk.totalBytes - system.disk.freeBytes
  const cells = [
    ['Gateway', system.gateway.status],
    ['Service uptime', `${Math.floor(system.serviceUptimeSeconds / 3600)}h`],
    ['Load average', system.loadAverage[0]?.toFixed(2) ?? 'Unavailable'],
    ['Memory', system.memory.totalBytes ? `${bytes(memoryUsed)} / ${bytes(system.memory.totalBytes)}` : 'Unavailable'],
    ['Swap', swapUsed === null ? 'Unavailable' : `${bytes(swapUsed)} / ${bytes(system.swap.totalBytes)}`],
    ['Root disk', diskUsed === null ? 'Unavailable' : `${bytes(diskUsed)} / ${bytes(system.disk.totalBytes)}`],
  ]
  return <section className="glass-card p-5">
    <h2 className="mb-4 font-semibold">Leonardo System</h2>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cells.map(([label, value]) => <div key={label} className="rounded-lg bg-white/5 p-3">
        <p className="text-xs text-dvn-text-secondary">{label}</p>
        <p className="mt-2 font-mono capitalize">{value}</p>
      </div>)}
    </div>
    {system.gateway.reason && <p className="mt-3 text-xs text-dvn-text-secondary">{system.gateway.reason}</p>}
  </section>
}
