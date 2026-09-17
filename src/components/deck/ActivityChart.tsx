import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { ActivityMetrics } from '@shared/contracts'

export function ActivityChart({ activity }: { activity: ActivityMetrics }) {
  const data = activity.daily.map((item) => ({
    ...item,
    label: new Date(item.start).toLocaleDateString(undefined, { weekday: 'short' }),
  }))
  return <section className="glass-card p-5">
    <div className="mb-4 flex flex-wrap justify-between gap-2">
      <div>
        <h2 className="font-semibold">Seven-Day Activity</h2>
        <p className="text-xs text-dvn-text-secondary">Agent runs and durable tasks remain separate.</p>
      </div>
      <span className="text-xs text-dvn-text-secondary">Timezone: {activity.timezone} · <span className="capitalize">{activity.status}</span></span>
    </div>
    <div className="h-64" aria-hidden="true">
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)"/>
          <XAxis dataKey="label"/>
          <YAxis allowDecimals={false}/>
          <Tooltip/>
          <Legend/>
          <Bar stackId="runs" dataKey="successfulRuns" name="Successful runs" fill="#10b981"/>
          <Bar stackId="runs" dataKey="failedRuns" name="Failed runs" fill="#ef4444"/>
          <Bar stackId="tasks" dataKey="successfulTasks" name="Successful tasks" fill="#06b6d4"/>
          <Bar stackId="tasks" dataKey="failedTasks" name="Failed tasks" fill="#f59e0b"/>
        </BarChart>
      </ResponsiveContainer>
    </div>
    <div className="sr-only">
      <table>
        <caption>Seven-day activity totals</caption>
        <thead><tr><th>Day</th><th>Successful runs</th><th>Failed runs</th><th>Successful tasks</th><th>Failed tasks</th></tr></thead>
        <tbody>{data.map((row) => <tr key={row.start}><th>{row.label}</th><td>{row.successfulRuns}</td><td>{row.failedRuns}</td><td>{row.successfulTasks}</td><td>{row.failedTasks}</td></tr>)}</tbody>
      </table>
    </div>
  </section>
}
