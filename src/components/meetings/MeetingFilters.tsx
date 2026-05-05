import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Toggle } from '@/components/ui/toggle'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const meetingTypes = ['standup', 'sales', '1-on-1', 'interview', 'all-hands', 'planning', 'team']

interface MeetingFiltersProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  activeTypes: string[]
  onTypeToggle: (type: string) => void
  dateRange: string
  onDateRangeChange: (value: string) => void
  hasActionItems: boolean
  onHasActionItemsChange: (value: boolean) => void
  externalOnly: boolean
  onExternalOnlyChange: (value: boolean) => void
  sortBy: string
  onSortChange: (value: string) => void
}

export function MeetingFilters({
  searchQuery,
  onSearchChange,
  activeTypes,
  onTypeToggle,
  dateRange,
  onDateRangeChange,
  hasActionItems,
  onHasActionItemsChange,
  externalOnly,
  onExternalOnlyChange,
  sortBy,
  onSortChange,
}: MeetingFiltersProps) {
  return (
    <div className="glass-card p-4 space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dvn-text-muted" />
        <Input
          placeholder="Search meetings..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-dvn-text-muted font-medium mr-1">Type:</span>
        {meetingTypes.map((type) => (
          <Toggle
            key={type}
            pressed={activeTypes.includes(type)}
            onPressedChange={() => onTypeToggle(type)}
            variant="outline"
            size="sm"
            className="text-xs capitalize"
          >
            {type}
          </Toggle>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-dvn-text-muted font-medium">Date:</span>
          {['7d', '30d', '90d', 'all'].map((range) => (
            <Toggle
              key={range}
              pressed={dateRange === range}
              onPressedChange={() => onDateRangeChange(range)}
              variant="outline"
              size="sm"
              className="text-xs uppercase"
            >
              {range === 'all' ? 'All' : range}
            </Toggle>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Toggle
            pressed={hasActionItems}
            onPressedChange={onHasActionItemsChange}
            variant="outline"
            size="sm"
            className="text-xs"
          >
            Has Action Items
          </Toggle>
          <Toggle
            pressed={externalOnly}
            onPressedChange={onExternalOnlyChange}
            variant="outline"
            size="sm"
            className="text-xs"
          >
            External Only
          </Toggle>
          <Select value={sortBy} onValueChange={onSortChange}>
            <SelectTrigger className="w-[140px] h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Most Recent</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="longest">Longest Duration</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
