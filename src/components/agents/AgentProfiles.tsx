import { motion } from 'framer-motion'
import { AgentProfileCard } from './AgentProfileCard'
import { useAgents } from '@/hooks/useAgents'

export function AgentProfiles() {
  const { agents, loading, error } = useAgents()

  if (loading) return <div className="text-center py-12">Loading agents...</div>
  if (error) return <div className="text-red-400 text-center py-12">Error: {error}</div>

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {agents.map((agent, i) => (
        <motion.div
          key={agent.name}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1, duration: 0.3 }}
        >
          <AgentProfileCard agent={agent} />
        </motion.div>
      ))}
    </div>
  )
}
