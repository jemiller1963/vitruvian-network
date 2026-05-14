import { useState, useMemo } from 'react'
import { Calendar, CalendarCheck, ListChecks, Clock } from 'lucide-react'
import { subDays } from 'date-fns'
import { MeetingKpiCard } from './MeetingKpiCard'
import { MeetingCharts } from './MeetingCharts'
import { MeetingFilters } from './MeetingFilters'
import { MeetingCard } from './MeetingCard'
import { MeetingPagination } from './MeetingPagination'
import { useMeetings } from '@/hooks/useMeetings'
import type { Meeting } from '@/data/mock'

const ITEMS_PER_PAGE = 25

export function MeetingIntelligence() {
  const { meetings, loading, error } = useMeetings()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTypes, setActiveTypes] = useState<string[]>([])
  const [dateRange, setDateRange] = useState('all')
  const [hasActionItems, setHasActionItems] = useState(false)
  const [externalOnly, setExternalOnly] = useState(false)
  const [sortBy, setSortBy] = useState('newest')
  const [currentPage, setCurrentPage] = useState(1)

  function toggleType(type: string) {
    setActiveTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    )
    setCurrentPage(1)
  }

  const filtered = useMemo(() => {
    let result: Meeting[] = [...meetings]

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.type.toLowerCase().includes(q) ||
          m.summary.toLowerCase().includes(q)
      )
    }

    if (activeTypes.length > 0) {
      result = result.filter((m) => activeTypes.includes(m.type))
    }

    if (dateRange !== 'all') {
      const days = parseInt(dateRange)
      const cutoff = subDays(new Date(), days)
      result = result.filter((m) => new Date(m.date) >= cutoff)
    }

    if (hasActionItems) {
      result = result.filter((m) => m.action_items.some((a) => !a.done))
    }

    if (externalOnly) {
      result = result.filter((m) => m.has_external_participants)
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.date).getTime() - new Date(b.date).getTime()
        case 'longest':
          return b.duration_minutes - a.duration_minutes
        case 'newest':
        default:
          return new Date(b.date).getTime() - new Date(a.date).getTime()
      }
    })

    return result
  }, [meetings, searchQuery, activeTypes, dateRange, hasActionItems, externalOnly, sortBy])

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const kpiData = useMemo(() => {
    const thisWeek = meetings.filter((m) => new Date(m.date) >= subDays(new Date(), 7))
    const openItems = meetings.reduce((sum, m) => sum + m.action_items.filter((a) => !a.done).length, 0)
    const avgDuration = meetings.length
      ? Math.round(meetings.reduce((sum, m) => sum + m.duration_minutes, 0) / meetings.length)
      : 0
    return { total: meetings.length, thisWeek: thisWeek.length, openItems, avgDuration }
  }, [meetings])

  if (loading) return <div className="text-center py-12">Loading meetings...</div>
  if (error) return <div className="text-red-400 text-center py-12">Error: {error}</div>

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MeetingKpiCard icon={Calendar} label="Total Meetings" value={kpiData.total} description="All time" />
        <MeetingKpiCard icon={CalendarCheck} label="This Week" value={kpiData.thisWeek} description="Last 7 days" />
        <MeetingKpiCard icon={ListChecks} label="Open Action Items" value={kpiData.openItems} description="Needs attention" />
        <MeetingKpiCard icon={Clock} label="Avg Duration" value={`${kpiData.avgDuration}m`} description="Per meeting" />
      </div>

      <MeetingCharts meetings={meetings} />

      <MeetingFilters
        searchQuery={searchQuery}
        onSearchChange={(v) => { setSearchQuery(v); setCurrentPage(1) }}
        activeTypes={activeTypes}
        onTypeToggle={toggleType}
        dateRange={dateRange}
        onDateRangeChange={(v) => { setDateRange(v); setCurrentPage(1) }}
        hasActionItems={hasActionItems}
        onHasActionItemsChange={(v) => { setHasActionItems(v); setCurrentPage(1) }}
        externalOnly={externalOnly}
        onExternalOnlyChange={(v) => { setExternalOnly(v); setCurrentPage(1) }}
        sortBy={sortBy}
        onSortChange={(v) => { setSortBy(v); setCurrentPage(1) }}
      />

      <div className="space-y-3">
        {paginated.length === 0 ? (
          <p className="text-sm text-dvn-text-muted text-center py-8">No meetings match your filters.</p>
        ) : (
          paginated.map((meeting) => (
            <MeetingCard key={meeting.id} meeting={meeting} />
          ))
        )}
      </div>

      <MeetingPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </div>
  )
}
