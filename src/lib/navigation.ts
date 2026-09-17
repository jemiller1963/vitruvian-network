export const dashboardPaths = {
  deck: '/',
  agents: '/agents',
  tasks: '/tasks',
  log: '/log',
  council: '/council',
  meetings: '/meetings',
} as const

export type DashboardTab = keyof typeof dashboardPaths

const pathEntries = Object.entries(dashboardPaths) as [DashboardTab, string][]

export function tabFromPath(pathname: string): DashboardTab {
  const normalized = pathname.replace(/\/+$/, '') || '/'
  return pathEntries.find(([, path]) => path === normalized)?.[0] ?? 'deck'
}

export function pathForTab(tab: DashboardTab): string {
  return dashboardPaths[tab]
}
