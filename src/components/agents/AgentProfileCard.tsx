import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import type { AgentProfile } from '@/data/mock'

interface AgentProfileCardProps {
  agent: AgentProfile
}

export function AgentProfileCard({ agent }: AgentProfileCardProps) {
  return (
    <div
      className="glass-card p-5 group hover:translate-y-[-2px] transition-all duration-200"
      style={{
        borderColor: `${agent.accentColor}22`,
        boxShadow: `0 0 20px ${agent.accentColor}08`,
      }}
    >
      <div className="flex items-start gap-4 mb-4">
        <span className="text-4xl flex-shrink-0">{agent.emoji}</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-heading font-semibold text-dvn-text-primary text-lg">{agent.name}</h3>
          <p className="text-sm text-dvn-text-secondary">{agent.subtitle}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={agent.accentColor === '#10b981' ? 'emerald' : agent.accentColor === '#f59e0b' ? 'amber' : 'cyan'}>
              {agent.type}
            </Badge>
            <span className="text-xs text-dvn-text-muted">{agent.role}</span>
          </div>
        </div>
        <span className={`status-dot ${agent.status === 'active' ? 'active' : 'idle'}`} />
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-dvn-text-muted">Tasks:</span>
          <span className="font-mono text-dvn-text-primary font-medium">{agent.tasksCompleted}</span>
        </div>
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-dvn-text-muted">Accuracy</span>
            <span className="font-mono text-dvn-text-primary">{agent.accuracy}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${agent.accuracy}%`, backgroundColor: agent.accentColor }}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {agent.skills.map((skill) => (
            <span
              key={skill}
              className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-dvn-text-secondary border border-white/5"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>

      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="w-full mt-4">
            View Details
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{agent.emoji}</span>
              {agent.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-dvn-text-muted">Role</p>
                <p className="text-dvn-text-primary">{agent.role}</p>
              </div>
              <div>
                <p className="text-dvn-text-muted">Status</p>
                <p className="text-dvn-text-primary capitalize">{agent.status}</p>
              </div>
              <div>
                <p className="text-dvn-text-muted">Tasks Completed</p>
                <p className="font-mono text-dvn-text-primary">{agent.tasksCompleted}</p>
              </div>
              <div>
                <p className="text-dvn-text-muted">Accuracy</p>
                <p className="font-mono text-dvn-text-primary">{agent.accuracy}%</p>
              </div>
            </div>
            <div>
              <p className="text-dvn-text-muted mb-1">Current Activity</p>
              <p className="text-dvn-text-primary">{agent.currentActivity}</p>
            </div>
            <div>
              <p className="text-dvn-text-muted mb-1">Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {agent.skills.map((skill) => (
                  <Badge key={skill} variant="secondary">{skill}</Badge>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
