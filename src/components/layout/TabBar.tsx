import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { motion } from 'framer-motion'

const tabs = [
  { id: 'deck', label: 'Command Deck' },
  { id: 'agents', label: 'Agents' },
  { id: 'tasks', label: 'Task Board' },
  { id: 'log', label: 'AI Log' },
  { id: 'council', label: 'Council' },
  { id: 'meetings', label: 'Meetings' },
]

interface TabBarProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mb-6"
    >
      <Tabs value={activeTab} onValueChange={onTabChange}>
        <TabsList className="w-full flex-wrap gap-1">
          {tabs.map((tab, i) => (
            <motion.div
              key={tab.id}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.2 }}
            >
              <TabsTrigger value={tab.id} className="text-sm">
                {tab.label}
              </TabsTrigger>
            </motion.div>
          ))}
        </TabsList>
      </Tabs>
    </motion.div>
  )
}
