import { subDays } from 'date-fns'

const now = new Date()

export interface Metric {
  label: string
  value: number
  icon: string
  trend: string
  trendUp: boolean
}

export interface Activity {
  agentEmoji: string
  agentName: string
  action: string
  timestamp: string
}

export interface AgentStatus {
  emoji: string
  name: string
  status: 'active' | 'idle' | 'error' | 'offline'
  currentActivity: string
  lastSeen: string
}

export interface AgentProfile {
  emoji: string
  name: string
  subtitle: string
  role: string
  type: string
  accentColor: string
  status: string
  tasksCompleted: number
  accuracy: number
  skills: string[]
  currentActivity: string
}

export interface Task {
  id: string
  title: string
  columnId: 'todo' | 'doing' | 'needsInput' | 'done'
  assignedAgent: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  progress: number
  description: string
}

export interface LogEntry {
  id: string
  agentEmoji: string
  agentName: string
  category: 'observation' | 'general' | 'reminder' | 'fyi'
  message: string
  timestamp: string
}

export interface CouncilParticipant {
  emoji: string
  name: string
  sent: number
  limit: number
  hasResponded: boolean
}

export interface CouncilMessage {
  agentEmoji: string
  agentName: string
  messageNumber: number
  text: string
  timestamp: string
}

export interface CouncilSession {
  id: string
  question: string
  status: 'active' | 'complete'
  participants: CouncilParticipant[]
  messages: CouncilMessage[]
}

export interface Meeting {
  id: string
  type: string
  title: string
  date: string
  duration_minutes: number
  duration_display: string
  attendees: { name: string; initials: string; isExternal?: boolean }[]
  summary: string
  action_items: { task: string; assignee: string; done: boolean }[]
  ai_insights: string
  meeting_type: string
  sentiment: string
  has_external_participants: boolean
  external_domains: string[]
  fathom_url: string
  share_url: string
}

export const metrics: Metric[] = [
  { label: 'Agents Active', value: 3, icon: 'Bot', trend: '+50%', trendUp: true },
  { label: 'Tasks Today', value: 24, icon: 'CheckSquare', trend: '+12%', trendUp: true },
  { label: 'Completion Rate', value: 92, icon: 'Target', trend: '+5%', trendUp: true },
  { label: 'Council Sessions', value: 5, icon: 'MessagesSquare', trend: '-10%', trendUp: false },
]

export const activities: Activity[] = [
  { agentEmoji: '🤖', agentName: 'Alpha', action: 'Completed code review on PR #142', timestamp: subDays(now, 0).toISOString() },
  { agentEmoji: '📋', agentName: 'Dispatch', action: 'Assigned 3 new tasks to the queue', timestamp: subDays(now, 0).toISOString() },
  { agentEmoji: '🛡️', agentName: 'Audit Bot', action: 'Ran security scan on main branch', timestamp: subDays(now, 0).toISOString() },
  { agentEmoji: '🤖', agentName: 'Alpha', action: 'Deployed hotfix v1.2.3 to production', timestamp: subDays(now, 0).toISOString() },
  { agentEmoji: '📋', agentName: 'Dispatch', action: 'Escalated ticket #891 to council review', timestamp: subDays(now, 1).toISOString() },
  { agentEmoji: '🛡️', agentName: 'Audit Bot', action: 'Flagged 2 vulnerabilities in dependencies', timestamp: subDays(now, 1).toISOString() },
  { agentEmoji: '🤖', agentName: 'Alpha', action: 'Generated API documentation for v2 endpoints', timestamp: subDays(now, 1).toISOString() },
  { agentEmoji: '📋', agentName: 'Dispatch', action: 'Optimized task assignment algorithm', timestamp: subDays(now, 2).toISOString() },
]

export const agentStatuses: AgentStatus[] = [
  { emoji: '🤖', name: 'Agent Alpha', status: 'active', currentActivity: 'Analyzing code patterns in PR #142', lastSeen: 'just now' },
  { emoji: '📋', name: 'Dispatch Bot', status: 'active', currentActivity: 'Orchestrating task queue', lastSeen: 'just now' },
  { emoji: '🛡️', name: 'Audit Bot', status: 'idle', currentActivity: 'Awaiting next security scan', lastSeen: '2m ago' },
  { emoji: '🔧', name: 'Utility Bot', status: 'offline', currentActivity: 'Maintenance window', lastSeen: '1h ago' },
]

export const agentProfiles: AgentProfile[] = [
  {
    emoji: '🤖',
    name: 'Agent Alpha',
    subtitle: 'Code Agent',
    role: 'Lead Engineer',
    type: 'Development',
    accentColor: '#10b981',
    status: 'active',
    tasksCompleted: 847,
    accuracy: 96,
    skills: ['TypeScript', 'React', 'Node.js', 'Python', 'Code Review', 'Architecture'],
    currentActivity: 'Analyzing code patterns in PR #142',
  },
  {
    emoji: '📋',
    name: 'Dispatch Bot',
    subtitle: 'Coordinator',
    role: 'Operations Director',
    type: 'Management',
    accentColor: '#f59e0b',
    status: 'active',
    tasksCompleted: 1234,
    accuracy: 99,
    skills: ['Task Orchestration', 'Queue Management', 'Scheduling', 'Resource Allocation', 'Reporting'],
    currentActivity: 'Orchestrating task queue',
  },
  {
    emoji: '🛡️',
    name: 'Audit Bot',
    subtitle: 'Quality Agent',
    role: 'Compliance Officer',
    type: 'Security',
    accentColor: '#06b6d4',
    status: 'idle',
    tasksCompleted: 512,
    accuracy: 100,
    skills: ['Security Scanning', 'Vulnerability Assessment', 'Code Quality', 'Compliance', 'Penetration Testing'],
    currentActivity: 'Awaiting next security scan',
  },
]

export const tasks: Task[] = [
  { id: 't1', title: 'Implement OAuth2 integration', columnId: 'todo', assignedAgent: '🤖', priority: 'high', progress: 0, description: 'Add OAuth2 authentication flow to the API gateway' },
  { id: 't2', title: 'Design dashboard wireframes', columnId: 'todo', assignedAgent: '📋', priority: 'medium', progress: 0, description: 'Create wireframes for the new analytics dashboard' },
  { id: 't3', title: 'Refactor database schema', columnId: 'doing', assignedAgent: '🤖', priority: 'urgent', progress: 65, description: 'Normalize user and permissions tables for v3 migration' },
  { id: 't4', title: 'Set up CI/CD pipeline', columnId: 'doing', assignedAgent: '📋', priority: 'high', progress: 40, description: 'Configure GitHub Actions for automated testing and deployment' },
  { id: 't5', title: 'Review PR #142', columnId: 'doing', assignedAgent: '🤖', priority: 'medium', progress: 80, description: 'Review pull request for the new auth module' },
  { id: 't6', title: 'Clarify API spec for search endpoint', columnId: 'needsInput', assignedAgent: '🛡️', priority: 'medium', progress: 0, description: 'Need clarification on pagination and filtering parameters' },
  { id: 't7', title: 'Confirm deployment window', columnId: 'needsInput', assignedAgent: '📋', priority: 'low', progress: 0, description: 'Waiting on ops team for the maintenance window schedule' },
  { id: 't8', title: 'Update dependency lockfile', columnId: 'done', assignedAgent: '🤖', priority: 'low', progress: 100, description: 'Run npm audit and update all patch versions' },
  { id: 't9', title: 'Write unit tests for auth module', columnId: 'done', assignedAgent: '🛡️', priority: 'high', progress: 100, description: 'Achieve 90% coverage on authentication services' },
  { id: 't10', title: 'Database backup automation', columnId: 'done', assignedAgent: '📋', priority: 'medium', progress: 100, description: 'Set up automated daily backups with 30-day retention' },
]

export const logEntries: LogEntry[] = [
  { id: 'l1', agentEmoji: '🤖', agentName: 'Alpha', category: 'observation', message: 'Detected unusual pattern in PR #142 — cyclomatic complexity exceeds threshold in auth middleware', timestamp: subDays(now, 0).toISOString() },
  { id: 'l2', agentEmoji: '📋', agentName: 'Dispatch', category: 'general', message: 'All 4 agents operational. Task queue depth: 12 items.', timestamp: subDays(now, 0).toISOString() },
  { id: 'l3', agentEmoji: '🛡️', agentName: 'Audit Bot', category: 'reminder', message: 'SSL certificate for api.davincinexus.io expires in 14 days', timestamp: subDays(now, 0).toISOString() },
  { id: 'l4', agentEmoji: '🤖', agentName: 'Alpha', category: 'fyi', message: 'New TypeScript 5.5 features available: inferred type predicates, control flow narrowing for const type parameters', timestamp: subDays(now, 1).toISOString() },
  { id: 'l5', agentEmoji: '📋', agentName: 'Dispatch', category: 'observation', message: 'Task completion rate up 12% this week — optimized assignment algorithm is performing well', timestamp: subDays(now, 1).toISOString() },
  { id: 'l6', agentEmoji: '🛡️', agentName: 'Audit Bot', category: 'general', message: 'Weekly security scan complete: 0 critical, 2 high, 5 medium vulnerabilities found', timestamp: subDays(now, 1).toISOString() },
  { id: 'l7', agentEmoji: '🤖', agentName: 'Alpha', category: 'reminder', message: 'Code freeze for v3 release starts Friday 6pm UTC', timestamp: subDays(now, 2).toISOString() },
  { id: 'l8', agentEmoji: '📋', agentName: 'Dispatch', category: 'fyi', message: 'Council session #12 reached consensus on task prioritization framework', timestamp: subDays(now, 2).toISOString() },
  { id: 'l9', agentEmoji: '🛡️', agentName: 'Audit Bot', category: 'observation', message: 'Dependency graph shows 3 packages with known CVEs — recommend immediate update', timestamp: subDays(now, 3).toISOString() },
  { id: 'l10', agentEmoji: '🤖', agentName: 'Alpha', category: 'general', message: 'API v2 documentation published. New endpoints: /search, /export, /webhook', timestamp: subDays(now, 3).toISOString() },
]

export const councilSessions: CouncilSession[] = [
  {
    id: 'c1',
    question: 'Should we adopt the new priority framework for task allocation?',
    status: 'active',
    participants: [
      { emoji: '🤖', name: 'Alpha', sent: 3, limit: 5, hasResponded: true },
      { emoji: '📋', name: 'Dispatch', sent: 2, limit: 5, hasResponded: true },
      { emoji: '🛡️', name: 'Audit Bot', sent: 1, limit: 5, hasResponded: false },
      { emoji: '🔧', name: 'Utility', sent: 0, limit: 5, hasResponded: false },
    ],
    messages: [
      { agentEmoji: '🤖', agentName: 'Alpha', messageNumber: 1, text: 'The proposed framework uses weighted scoring based on urgency, business value, and dependency depth. Initial simulations show a 15% improvement in throughput.', timestamp: subDays(now, 0).toISOString() },
      { agentEmoji: '📋', agentName: 'Dispatch', messageNumber: 1, text: 'Ive run the numbers. The weighted approach aligns well with our current queue dynamics. However, we need to account for external blockers.', timestamp: subDays(now, 0).toISOString() },
      { agentEmoji: '🤖', agentName: 'Alpha', messageNumber: 2, text: 'Good point. I can add a "blocker weight" modifier that reduces priority for tasks waiting on external dependencies.', timestamp: subDays(now, 0).toISOString() },
      { agentEmoji: '📋', agentName: 'Dispatch', messageNumber: 2, text: 'That would work. Also, should we include a confidence interval for the scoring? Some estimates are less certain than others.', timestamp: subDays(now, 0).toISOString() },
      { agentEmoji: '🤖', agentName: 'Alpha', messageNumber: 3, text: 'Ill add a confidence multiplier. High-confidence tasks get full weight, medium gets 0.8, low gets 0.5.', timestamp: subDays(now, 0).toISOString() },
    ],
  },
  {
    id: 'c2',
    question: 'What security improvements should be prioritized for Q2?',
    status: 'complete',
    participants: [
      { emoji: '🛡️', name: 'Audit Bot', sent: 4, limit: 5, hasResponded: true },
      { emoji: '🤖', name: 'Alpha', sent: 2, limit: 5, hasResponded: true },
      { emoji: '📋', name: 'Dispatch', sent: 1, limit: 5, hasResponded: true },
    ],
    messages: [
      { agentEmoji: '🛡️', agentName: 'Audit Bot', messageNumber: 1, text: 'Top priority: implement rate limiting on all API endpoints. Our current scan shows no throttling in place.', timestamp: subDays(now, 5).toISOString() },
      { agentEmoji: '🤖', agentName: 'Alpha', messageNumber: 1, text: 'Rate limiting is straightforward. I can add middleware with configurable thresholds per endpoint tier.', timestamp: subDays(now, 5).toISOString() },
      { agentEmoji: '🛡️', agentName: 'Audit Bot', messageNumber: 2, text: 'Second priority: API key rotation. Currently keys are static. We need automatic rotation every 90 days.', timestamp: subDays(now, 5).toISOString() },
      { agentEmoji: '📋', agentName: 'Dispatch', messageNumber: 1, text: 'Rotation can be automated through our secrets manager. I can schedule quarterly rotation jobs.', timestamp: subDays(now, 5).toISOString() },
      { agentEmoji: '🛡️', agentName: 'Audit Bot', messageNumber: 3, text: 'Third: enable audit logging for all admin operations. We need a tamper-proof trail.', timestamp: subDays(now, 5).toISOString() },
      { agentEmoji: '🤖', agentName: 'Alpha', messageNumber: 2, text: 'Agreed. Ill set up structured logging with hashed chain links for integrity verification.', timestamp: subDays(now, 5).toISOString() },
      { agentEmoji: '🛡️', agentName: 'Audit Bot', messageNumber: 4, text: 'Consensus achieved. Rate limiting, key rotation, audit logging — all approved for Q2.', timestamp: subDays(now, 5).toISOString() },
    ],
  },
]

export const meetings: Meeting[] = [
  {
    id: 'm1',
    type: 'standup',
    title: 'Daily Standup — Engineering Team',
    date: subDays(now, 0).toISOString(),
    duration_minutes: 15,
    duration_display: '15m',
    attendees: [
      { name: 'Alice Chen', initials: 'AC' },
      { name: 'Bob Martinez', initials: 'BM' },
      { name: 'Carol Smith', initials: 'CS' },
      { name: 'David Kim', initials: 'DK' },
    ],
    summary: '<p><strong>Alice:</strong> Completed OAuth integration. Blocked on rate limit testing. Need API key from Devops.</p><p><strong>Bob:</strong> Finished dashboard wireframes. PR ready for review.</p><p><strong>Carol:</strong> Database migration at 80%. Schema changes approved.</p><p><strong>David:</strong> CI/CD pipeline configured. GitHub Actions running green.</p>',
    action_items: [
      { task: 'Request API key from Devops for rate limit testing', assignee: 'Alice', done: false },
      { task: 'Review dashboard wireframes PR', assignee: 'Carol', done: false },
    ],
    ai_insights: 'Team velocity is up 15% this sprint. Two PRs have been open for more than 48 hours — recommend prioritizing reviews.',
    meeting_type: 'Standup',
    sentiment: 'positive',
    has_external_participants: false,
    external_domains: [],
    fathom_url: 'https://fathom.davincinexus.io/rec/m1',
    share_url: 'https://davincinexus.io/meetings/m1',
  },
  {
    id: 'm2',
    type: 'sales',
    title: 'Q2 Strategy Review — Acme Corp',
    date: subDays(now, 1).toISOString(),
    duration_minutes: 45,
    duration_display: '45m',
    attendees: [
      { name: 'Sarah Johnson', initials: 'SJ' },
      { name: 'Tom Peters', initials: 'TP', isExternal: true },
      { name: 'Lisa Wong', initials: 'LW', isExternal: true },
      { name: 'Mike Davis', initials: 'MD' },
    ],
    summary: '<p>Reviewed Q2 partnership goals with Acme Corp leadership.</p><p><strong>Key topics:</strong></p><ul><li>Integration roadmap alignment</li><li>Shared OKR definition</li><li>Resource commitment for joint features</li></ul><p>Both parties agreed to bi-weekly syncs moving forward.</p>',
    action_items: [
      { task: 'Draft joint OKR document for Q2', assignee: 'Sarah', done: false },
      { task: 'Share integration timeline with Acme engineering', assignee: 'Mike', done: true },
      { task: 'Schedule next bi-weekly sync', assignee: 'Lisa', done: false },
    ],
    ai_insights: 'External participant engagement was high. Three action items generated. Consider creating a dedicated Slack channel for ongoing communication.',
    meeting_type: 'External',
    sentiment: 'positive',
    has_external_participants: true,
    external_domains: ['acmecorp.com'],
    fathom_url: 'https://fathom.davincinexus.io/rec/m2',
    share_url: 'https://davincinexus.io/meetings/m2',
  },
  {
    id: 'm3',
    type: '1-on-1',
    title: '1:1 — Alice & Engineering Manager',
    date: subDays(now, 1).toISOString(),
    duration_minutes: 30,
    duration_display: '30m',
    attendees: [
      { name: 'Alice Chen', initials: 'AC' },
      { name: 'Rachel Green', initials: 'RG' },
    ],
    summary: '<p>Career development discussion covering:</p><ul><li>Progress on technical lead track</li><li>Mentoring opportunities for junior engineers</li><li>Conference budget approval for ReactConf 2026</li></ul>',
    action_items: [
      { task: 'Submit conference budget request for ReactConf 2026', assignee: 'Alice', done: false },
      { task: 'Pair Alice with junior engineer for mentoring program', assignee: 'Rachel', done: false },
    ],
    ai_insights: 'Alice showed strong interest in team leadership. Recommend assigning her as tech lead for the next sprint to build experience.',
    meeting_type: '1-on-1',
    sentiment: 'positive',
    has_external_participants: false,
    external_domains: [],
    fathom_url: 'https://fathom.davincinexus.io/rec/m3',
    share_url: 'https://davincinexus.io/meetings/m3',
  },
  {
    id: 'm4',
    type: 'interview',
    title: 'Technical Screen — Senior Frontend Engineer',
    date: subDays(now, 2).toISOString(),
    duration_minutes: 60,
    duration_display: '1h',
    attendees: [
      { name: 'David Kim', initials: 'DK' },
      { name: 'Carol Smith', initials: 'CS' },
      { name: 'James Wilson', initials: 'JW', isExternal: true },
    ],
    summary: '<p>Candidate: <strong>James Wilson</strong> — 7 years React experience.</p><p><strong>Coding round:</strong> Built a real-time collaborative todo app with optimistic updates. Strong performance.</p><p><strong>System design:</strong> Discussed micro-frontend architecture. Good understanding of module federation.</p><p><strong>Decision:</strong> Move to on-site round.</p>',
    action_items: [
      { task: 'Schedule on-site interview with James Wilson', assignee: 'Carol', done: false },
      { task: 'Send take-home assignment for system design', assignee: 'David', done: true },
    ],
    ai_insights: 'Candidate scored 88/100 on technical assessment. Communication was excellent. Top percentile for this role.',
    meeting_type: 'Interview',
    sentiment: 'positive',
    has_external_participants: true,
    external_domains: ['gmail.com'],
    fathom_url: 'https://fathom.davincinexus.io/rec/m4',
    share_url: 'https://davincinexus.io/meetings/m4',
  },
  {
    id: 'm5',
    type: 'all-hands',
    title: 'All-Hands — Q2 Kickoff',
    date: subDays(now, 3).toISOString(),
    duration_minutes: 60,
    duration_display: '1h',
    attendees: [
      { name: 'All Team', initials: 'AT' },
    ],
    summary: '<p><strong>Quarterly kickoff meeting</strong></p><ul><li>CEO: Company vision and Q2 goals</li><li>CTO: Engineering roadmap — 3 major features planned</li><li>Product: OKR review and prioritization</li><li>HR: Team growth update — 5 new hires planned</li></ul>',
    action_items: [
      { task: 'Review and acknowledge Q2 OKRs in HR system', assignee: 'Everyone', done: false },
      { task: 'Update team availability for Q2 planning', assignee: 'Everyone', done: false },
    ],
    ai_insights: 'Employee sentiment was overwhelmingly positive. Key concerns: workload balance during the 3-feature sprint was raised by 40% of attendees.',
    meeting_type: 'All-Hands',
    sentiment: 'positive',
    has_external_participants: false,
    external_domains: [],
    fathom_url: 'https://fathom.davincinexus.io/rec/m5',
    share_url: 'https://davincinexus.io/meetings/m5',
  },
  {
    id: 'm6',
    type: '1-on-1',
    title: '1:1 — Bob & Engineering Manager',
    date: subDays(now, 4).toISOString(),
    duration_minutes: 30,
    duration_display: '30m',
    attendees: [
      { name: 'Bob Martinez', initials: 'BM' },
      { name: 'Rachel Green', initials: 'RG' },
    ],
    summary: '<p>Discussion points:</p><ul><li>Bob expressed interest in moving to backend development</li><li>Current dashboard project going well but wants more systems-level work</li><li>Agreed to split next sprint: 50% frontend, 50% backend</li></ul>',
    action_items: [
      { task: 'Assign Bob to backend tasks in next sprint', assignee: 'Rachel', done: false },
      { task: 'Set up backend mentorship pairing', assignee: 'Rachel', done: false },
    ],
    ai_insights: 'Career pivot discussions are a positive indicator of engagement. Bob has strong fundamentals — backend transition should be smooth with proper mentorship.',
    meeting_type: '1-on-1',
    sentiment: 'neutral',
    has_external_participants: false,
    external_domains: [],
    fathom_url: 'https://fathom.davincinexus.io/rec/m6',
    share_url: 'https://davincinexus.io/meetings/m6',
  },
  {
    id: 'm7',
    type: 'sales',
    title: 'Partnership Discovery — TechVentures Inc.',
    date: subDays(now, 5).toISOString(),
    duration_minutes: 55,
    duration_display: '55m',
    attendees: [
      { name: 'Sarah Johnson', initials: 'SJ' },
      { name: 'Mike Davis', initials: 'MD' },
      { name: 'Alex Rivera', initials: 'AR', isExternal: true },
      { name: 'Priya Patel', initials: 'PP', isExternal: true },
    ],
    summary: '<p>Discovery call with TechVentures Inc. leadership team.</p><p>Explored potential partnership for co-developing AI-powered project management tools.</p><p>TechVentures interested in white-labeling our agent framework for their enterprise clients.</p>',
    action_items: [
      { task: 'Share technical whitepaper with TechVentures team', assignee: 'Mike', done: false },
      { task: 'Prepare pricing proposal for white-label option', assignee: 'Sarah', done: false },
      { task: 'Schedule follow-up technical deep dive', assignee: 'Mike', done: true },
    ],
    ai_insights: 'High-intent prospect. Four follow-up actions generated. Recommend fast-tracking the technical deep dive to maintain momentum.',
    meeting_type: 'External',
    sentiment: 'positive',
    has_external_participants: true,
    external_domains: ['techventures.io'],
    fathom_url: 'https://fathom.davincinexus.io/rec/m7',
    share_url: 'https://davincinexus.io/meetings/m7',
  },
  {
    id: 'm8',
    type: 'standup',
    title: 'Daily Standup — Engineering Team',
    date: subDays(now, 5).toISOString(),
    duration_minutes: 12,
    duration_display: '12m',
    attendees: [
      { name: 'Alice Chen', initials: 'AC' },
      { name: 'Bob Martinez', initials: 'BM' },
      { name: 'Carol Smith', initials: 'CS' },
      { name: 'David Kim', initials: 'DK' },
    ],
    summary: '<p><strong>Alice:</strong> Rate limiting implemented. Awaiting API key for integration tests.</p><p><strong>Bob:</strong> Dashboard wireframes approved. Starting implementation.</p><p><strong>Carol:</strong> Database migration complete. Running verification queries.</p><p><strong>David:</strong> CI/CD pipeline passing. Added deployment notifications to Slack.</p>',
    action_items: [
      { task: 'Follow up on API key request', assignee: 'Alice', done: false },
      { task: 'Set up deployment notification Slack webhook', assignee: 'David', done: true },
    ],
    ai_insights: 'Team is making good progress. Three PRs are in review. Average PR age is 1.2 days — maintaining healthy velocity.',
    meeting_type: 'Standup',
    sentiment: 'positive',
    has_external_participants: false,
    external_domains: [],
    fathom_url: 'https://fathom.davincinexus.io/rec/m8',
    share_url: 'https://davincinexus.io/meetings/m8',
  },
  {
    id: 'm9',
    type: 'planning',
    title: 'Sprint Planning — Sprint 14',
    date: subDays(now, 6).toISOString(),
    duration_minutes: 90,
    duration_display: '1h 30m',
    attendees: [
      { name: 'Alice Chen', initials: 'AC' },
      { name: 'Bob Martinez', initials: 'BM' },
      { name: 'Carol Smith', initials: 'CS' },
      { name: 'David Kim', initials: 'DK' },
      { name: 'Rachel Green', initials: 'RG' },
    ],
    summary: '<p><strong>Sprint 14 Planning</strong></p><ul><li>Capacity: 45 story points</li><li>Committed: 42 story points</li><li>Theme: Performance optimization and infrastructure</li></ul><p>Key stories:</p><ol><li>Database query optimization — 13 pts</li><li>Caching layer implementation — 8 pts</li><li>API response compression — 5 pts</li><li>Load testing framework — 8 pts</li><li>Documentation updates — 3 pts</li><li>Bug fixes — 5 pts</li></ol>',
    action_items: [
      { task: 'Update sprint board with committed stories', assignee: 'Rachel', done: true },
      { task: 'Set up load testing environments', assignee: 'David', done: false },
      { task: 'Schedule performance benchmark baseline', assignee: 'Alice', done: false },
    ],
    ai_insights: 'Sprint velocity is trending up. Team committed to 42 points vs 38 in Sprint 13. Confidence level is high based on historical completion rates.',
    meeting_type: 'Planning',
    sentiment: 'positive',
    has_external_participants: false,
    external_domains: [],
    fathom_url: 'https://fathom.davincinexus.io/rec/m9',
    share_url: 'https://davincinexus.io/meetings/m9',
  },
  {
    id: 'm10',
    type: 'team',
    title: 'Architecture Review — Microservices Migration',
    date: subDays(now, 7).toISOString(),
    duration_minutes: 75,
    duration_display: '1h 15m',
    attendees: [
      { name: 'Alice Chen', initials: 'AC' },
      { name: 'Carol Smith', initials: 'CS' },
      { name: 'David Kim', initials: 'DK' },
      { name: 'Rachel Green', initials: 'RG' },
    ],
    summary: '<p>Architecture review for the monolith-to-microservices migration plan.</p><p><strong>Proposed architecture:</strong></p><ul><li>API Gateway → Auth Service, Task Service, Agent Service, Analytics Service</li><li>Event bus: RabbitMQ for async communication</li><li>Database per service pattern with shared read replica</li></ul><p><strong>Concerns raised:</strong></p><ul><li>Increased latency for cross-service queries</li><li>Data consistency challenges</li><li>Deployment complexity</li></ul><p><strong>Decision:</strong> Proceed with phased approach, starting with Auth Service extraction.</p>',
    action_items: [
      { task: 'Create detailed migration timeline for Auth Service', assignee: 'Alice', done: false },
      { task: 'Research event bus alternatives (RabbitMQ vs Kafka)', assignee: 'David', done: false },
      { task: 'Document data consistency strategy', assignee: 'Carol', done: false },
      { task: 'Present timeline to VP Engineering for approval', assignee: 'Rachel', done: false },
    ],
    ai_insights: 'This is a high-impact architectural decision. Recommend starting with a strangler fig pattern to minimize risk. The Auth Service extraction is well-scoped as a first step.',
    meeting_type: 'Team',
    sentiment: 'neutral',
    has_external_participants: false,
    external_domains: [],
    fathom_url: 'https://fathom.davincinexus.io/rec/m10',
    share_url: 'https://davincinexus.io/meetings/m10',
  },
]

export const meetingTypes = ['standup', 'sales', '1-on-1', 'interview', 'all-hands', 'planning', 'team']
export const meetingTypeColors: Record<string, string> = {
  'standup': '#818cf8',
  'sales': '#a78bfa',
  '1-on-1': '#60a5fa',
  'interview': '#34d399',
  'all-hands': '#fb923c',
  'planning': '#2dd4bf',
  'team': '#f59e0b',
}
