import { CouncilSession } from './CouncilSession'
import { councilSessions } from '@/data/mock'

export function Council() {
  return (
    <div className="space-y-4">
      {councilSessions.map((session) => (
        <CouncilSession key={session.id} session={session} />
      ))}
    </div>
  )
}
