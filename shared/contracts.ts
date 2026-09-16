import { z } from 'zod'
export const runtimeStatuses=['working','idle','blocked','error','offline','unknown'] as const
export type RuntimeStatus=typeof runtimeStatuses[number]
export interface AgentSummary{id:string;displayName:string;configuredModel:string|null;allowedSubagents:string[];runtimeStatus:RuntimeStatus;currentActivity:string|null;lastSeenAt:string|null;observedAt:string;stale:boolean}
export interface CanonicalEvent{id:string;sourceEventId:string|null;eventType:string;agentId:string|null;description:string|null;status:string;occurredAt:string;observedAt:string}
export interface EventPage{items:CanonicalEvent[];nextCursor:string|null}
export interface MetricSummary{activeAgents:number;tasksCompleted:number;failedEvents:number;observedAt:string}
export interface ActivityBucket{start:string;total:number;completed:number}
export interface AgentActivityBucket{agentId:string;hour:number;count:number}
export interface ActivityMetrics{timezone:string;days:number;daily:ActivityBucket[];byAgentHour:AgentActivityBucket[];observedAt:string}
export interface SystemSummary{gateway:{status:'healthy'|'degraded'|'unknown';version:string|null;observedAt:string;reason?:string};loadAverage:number[];memory:{totalBytes:number;freeBytes:number};observedAt:string}
export interface ApiResponse<T>{data:T}
export const activityQuerySchema=z.object({days:z.coerce.number().int().min(1).max(30).default(7),timezone:z.string().max(100).default('UTC')})
export const eventQuerySchema=z.object({limit:z.coerce.number().int().min(1).max(100).default(25),cursor:z.string().max(512).optional(),agentId:z.string().max(100).optional()})
