import { Settings } from 'lucide-react'

export function Header() {
  return (
    <header className="glass-card-emerald-left flex items-center justify-between px-6 py-4 mb-6">
      <div className="flex items-center gap-3">
        <img src="/Vitruvian_Logo_digital_small.svg" alt="Vitruvian Network Logo" className="h-8 w-auto" />
        <div>
          <h1 className="font-heading text-xl font-bold text-dvn-text-primary">
            The Da Vinci Nexus
          </h1>
          <p className="text-xs text-dvn-text-muted">AI Agent Command Center</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="status-dot active" />
          <span className="text-sm text-dvn-text-secondary font-medium">Agent Alpha: Online</span>
        </div>
        <span className="text-xs text-dvn-text-muted">Last seen: just now</span>
        <button className="p-2 rounded-lg hover:bg-white/5 transition-colors text-dvn-text-secondary hover:text-dvn-text-primary">
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
