import { ChevronLeft, ChevronRight } from 'lucide-react'

interface MeetingPaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function MeetingPagination({ currentPage, totalPages, onPageChange }: MeetingPaginationProps) {
  if (totalPages <= 1) return null

  const pages: number[] = []
  for (let i = 1; i <= totalPages; i++) {
    pages.push(i)
  }

  return (
    <div className="flex items-center justify-center gap-1">
      <button
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="p-2 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-30 text-dvn-text-secondary hover:text-dvn-text-primary"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      {pages.map((page) => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`w-8 h-8 rounded-lg text-sm font-mono transition-colors ${
            page === currentPage
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'text-dvn-text-muted hover:bg-white/5 hover:text-dvn-text-secondary'
          }`}
        >
          {page}
        </button>
      ))}
      <button
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="p-2 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-30 text-dvn-text-secondary hover:text-dvn-text-primary"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}
