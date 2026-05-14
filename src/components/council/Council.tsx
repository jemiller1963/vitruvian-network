import { CouncilSession } from './CouncilSession'
import { useCouncil } from '@/hooks/useCouncil'

export function Council() {
  const { sessions, loading, error } = useCouncil()

  if (loading) return <div className="text-center py-12">Loading council sessions...</div>
  if (error) return <div className="text-red-400 text-center py-12">Error: {error}</div>

  return (
    <div className="space-y-4">
      {sessions.map((session) => (
        <CouncilSession key={session.id} session={session} />
      ))}
    </div>
  )
}
