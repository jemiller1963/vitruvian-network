import { useEffect, useState } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { Header } from '@/components/layout/Header'
import { TabBar } from '@/components/layout/TabBar'
import { FixtureDeferredPanel } from '@/components/layout/FixtureDeferredPanel'
import { CommandDeck } from '@/components/deck/CommandDeck'
import { AgentProfiles } from '@/components/agents/AgentProfiles'
import { TaskBoard } from '@/components/tasks/TaskBoard'
import { AiLog } from '@/components/log/AiLog'
import { Council } from '@/components/council/Council'
import { MeetingIntelligence } from '@/components/meetings/MeetingIntelligence'
import { pathForTab, tabFromPath, type DashboardTab } from '@/lib/navigation'
import { isFixturePreview } from '@/lib/api'
import { isFixtureDeferredTab } from '@/lib/fixture-isolation'

const tabs = {
  deck: CommandDeck,
  agents: AgentProfiles,
  tasks: TaskBoard,
  log: AiLog,
  council: Council,
  meetings: MeetingIntelligence,
} as const

const deploymentLabel = import.meta.env.VITE_VITRUVIAN_DEPLOYMENT_LABEL

export default function App() {
  const [activeTab, setActiveTab] = useState<DashboardTab>(() => tabFromPath(window.location.pathname))

  useEffect(() => {
    const syncFromHistory = () => setActiveTab(tabFromPath(window.location.pathname))
    window.addEventListener('popstate', syncFromHistory)
    return () => window.removeEventListener('popstate', syncFromHistory)
  }, [])

  const selectTab = (tab: DashboardTab) => {
    const path = pathForTab(tab)
    if (window.location.pathname !== path) window.history.pushState({ tab }, '', path)
    setActiveTab(tab)
  }

  const ActiveComponent = tabs[activeTab]
  const showFixtureDeferredPanel = isFixturePreview && isFixtureDeferredTab(activeTab)

  return (
    <MotionConfig reducedMotion="user"><div className="min-h-screen bg-dvn-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {deploymentLabel && (
          <p role="status" className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-center text-sm font-medium text-amber-400">
            {deploymentLabel}
          </p>
        )}
        <Header />
        <TabBar activeTab={activeTab} onTabChange={selectTab} />
        <main><AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {showFixtureDeferredPanel ? (
              <FixtureDeferredPanel section={activeTab} />
            ) : (
              <ActiveComponent />
            )}
          </motion.div>
        </AnimatePresence></main>
      </div>
    </div></MotionConfig>
  )
}
