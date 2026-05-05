import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Header } from '@/components/layout/Header'
import { TabBar } from '@/components/layout/TabBar'
import { CommandDeck } from '@/components/deck/CommandDeck'
import { AgentProfiles } from '@/components/agents/AgentProfiles'
import { TaskBoard } from '@/components/tasks/TaskBoard'
import { AiLog } from '@/components/log/AiLog'
import { Council } from '@/components/council/Council'
import { MeetingIntelligence } from '@/components/meetings/MeetingIntelligence'

const tabs = {
  deck: CommandDeck,
  agents: AgentProfiles,
  tasks: TaskBoard,
  log: AiLog,
  council: Council,
  meetings: MeetingIntelligence,
} as const

export default function App() {
  const [activeTab, setActiveTab] = useState('deck')

  const ActiveComponent = tabs[activeTab as keyof typeof tabs]

  return (
    <div className="min-h-screen bg-dvn-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Header />
        <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <ActiveComponent />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
