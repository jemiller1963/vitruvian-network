import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useMemo } from 'react'
import type { Meeting } from '@/data/mock'
import { meetingTypeColors } from '@/data/mock'

interface MeetingChartsProps {
  meetings: Meeting[]
}

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const tooltipStyle = {
  background: '#1f2937',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: '8px',
  color: '#f9fafb',
  fontSize: '13px',
  fontWeight: 600,
  boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
}

const labelStyle = { color: '#d1d5db', fontWeight: 700, fontSize: '13px' }

export function MeetingCharts({ meetings }: MeetingChartsProps) {
  const typeDistribution = useMemo(() => {
    const counts: Record<string, number> = {}
    meetings.forEach((m) => {
      counts[m.type] = (counts[m.type] || 0) + 1
    })
    return Object.entries(counts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color: meetingTypeColors[name] || '#6b7280',
    }))
  }, [meetings])

  const monthlyData = useMemo(() => {
    const counts: Record<string, number> = {}
    meetings.forEach((m) => {
      const d = new Date(m.date)
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`
      counts[key] = (counts[key] || 0) + 1
    })
    return Object.entries(counts).map(([name, count]) => ({ name, count }))
  }, [meetings])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="glass-card p-5">
        <h3 className="font-heading font-semibold text-sm text-dvn-text-primary mb-4">Meeting Type Distribution</h3>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={typeDistribution}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={3}
              dataKey="value"
            >
              {typeDistribution.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={tooltipStyle}
              labelStyle={labelStyle}
              itemStyle={{ color: '#f9fafb', fontWeight: 600 }}
              formatter={(value: number, name: string) => [`${value} meeting${value !== 1 ? 's' : ''}`, name]}
            />
            <Legend
              wrapperStyle={{ fontSize: '12px', color: '#d1d5db' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="glass-card p-5">
        <h3 className="font-heading font-semibold text-sm text-dvn-text-primary mb-4">Meetings by Month</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={monthlyData}>
            <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={tooltipStyle}
              labelStyle={labelStyle}
              itemStyle={{ color: '#f9fafb', fontWeight: 600 }}
              formatter={(value: number) => [`${value} meeting${value !== 1 ? 's' : ''}`, 'Count']}
            />
            <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
