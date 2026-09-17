import type { AgentActivityBucket } from '@shared/contracts'

export function AgentActivityHeatmap({ buckets }: { buckets: AgentActivityBucket[] }) {
  const max = Math.max(0, ...buckets.map((item) => item.count))
  const days = [...new Set(buckets.map((item) => item.day))].sort()
  const byKey = new Map(buckets.map((item) => [`${item.day}|${item.hour}`, item]))
  return <div>
    <div className="mb-2 flex justify-between text-xs text-dvn-text-secondary">
      <span>Activity · seven days by hour</span>
      <span>{buckets.reduce((sum, item) => sum + item.count, 0)} events</span>
    </div>
    <div className="overflow-x-auto">
      <div className="min-w-[34rem] space-y-1" role="img" aria-label="Seven-day activity heatmap with 24 hourly cells per day">
        {days.map((day) => <div key={day} className="grid grid-cols-[4.5rem_repeat(24,minmax(0,1fr))] items-center gap-1">
          <span className="text-[10px] text-dvn-text-secondary">{new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'numeric', day: 'numeric' })}</span>
          {Array.from({ length: 24 }, (_, hour) => {
            const bucket = byKey.get(`${day}|${hour}`)
            const count = bucket?.count ?? 0
            return <span
              key={hour}
              title={`${day} ${String(hour).padStart(2, '0')}:00 — ${count} events`}
              className="aspect-square rounded-sm border border-white/5"
              style={{ backgroundColor: count && max ? `rgba(16,185,129,${0.18 + count / max * 0.72})` : 'rgba(255,255,255,.025)' }}
            />
          })}
        </div>)}
        <div aria-hidden="true" className="ml-[4.75rem] flex justify-between text-[10px] text-dvn-text-secondary">
          <span>00</span><span>06</span><span>12</span><span>18</span><span>23</span>
        </div>
      </div>
    </div>
    <table className="sr-only">
      <caption>Agent activity by day and hour</caption>
      <thead><tr><th>Day</th><th>Hour</th><th>Events</th></tr></thead>
      <tbody>{buckets.map((bucket) => <tr key={`${bucket.day}-${bucket.hour}`}><td>{bucket.day}</td><td>{bucket.hour}</td><td>{bucket.count}</td></tr>)}</tbody>
    </table>
  </div>
}
