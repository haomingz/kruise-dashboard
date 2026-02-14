import axiosInstance from "./axiosInstance"
import { createRolloutWatchClient, type RolloutWatchClientHandlers } from "../lib/watch-client"
import { config } from "../lib/config"

export interface RolloutStatus {
  status?: string
  phase?: string
  replicas?: number
  readyReplicas?: number
  [key: string]: unknown
}

export interface RolloutHistory {
  revision?: number
  createdAt?: string
  status?: string
  [key: string]: unknown
}

export interface Rollout {
  name: string
  namespace: string
  status: string
  [key: string]: unknown
}

export interface ContainerInfo {
  name: string
  image: string
  type?: "container" | "initContainer"
}

export interface RevisionInfo {
  name: string
  revision: string
  podTemplateHash: string
  isStable: boolean
  isCanary: boolean
  replicas: number
  readyReplicas: number
  pods: Record<string, unknown>[]
  containers: ContainerInfo[]
}

export interface RolloutPodsResponse {
  pods: Record<string, unknown>[]
  workloadRef: Record<string, unknown> | null
  revisions?: RevisionInfo[]
  containers?: ContainerInfo[]
}

export interface RolloutWatchEvent {
  type: string
  namespace: string
  name: string
  resourceVersion: string
  rollout: Record<string, unknown> | null
  ts: string
  message?: string
}

export interface RolloutAnalysisSummary {
  source: "placeholder" | string
  status: "not_configured" | "pending" | "running" | "completed"
  summary: string
  code?: string
}

export interface RolloutAnalysisRun {
  id?: string
  name?: string
  status?: string
  startedAt?: string
  finishedAt?: string
  message?: string
  [key: string]: unknown
}

export interface RolloutAnalysisResponse extends RolloutAnalysisSummary {
  runs: RolloutAnalysisRun[]
}

export interface RolloutRollbackResponse {
  message: string
  rollout: string
  namespace: string
  workloadKind: string
  workloadName: string
  stableRevision: string
}

export interface SetRolloutImagePayload {
  container: string
  image: string
  initContainer?: boolean
}

function resolveWatchURL(path: string): string {
  const base = config.apiBaseUrl.endsWith("/") ? config.apiBaseUrl.slice(0, -1) : config.apiBaseUrl
  return `${base}${path}`
}

export const getRollout = async (namespace: string, name: string): Promise<Record<string, unknown>> => {
  try {
    const response = await axiosInstance.get(`/rollout/${namespace}/${name}`)
    return response.data
  } catch (error) {
    console.error(`Error fetching rollout ${namespace}/${name}:`, error)
    throw error
  }
}

export const getRolloutStatus = async (namespace: string, name: string): Promise<RolloutStatus> => {
  try {
    const response = await axiosInstance.get(`/rollout/status/${namespace}/${name}`)
    return response.data
  } catch (error) {
    console.error(`Error fetching rollout status for ${namespace}/${name}:`, error)
    throw error
  }
}

export const getRolloutHistory = async (namespace: string, name: string): Promise<RolloutHistory[]> => {
  try {
    const response = await axiosInstance.get(`/rollout/history/${namespace}/${name}`)
    return response.data
  } catch (error) {
    console.error(`Error fetching rollout history for ${namespace}/${name}:`, error)
    throw error
  }
}

export const pauseRollout = async (namespace: string, name: string): Promise<void> => {
  try {
    await axiosInstance.post(`/rollout/pause/${namespace}/${name}`)
  } catch (error) {
    console.error(`Error pausing rollout ${namespace}/${name}:`, error)
    throw error
  }
}

export const resumeRollout = async (namespace: string, name: string): Promise<void> => {
  try {
    await axiosInstance.post(`/rollout/resume/${namespace}/${name}`)
  } catch (error) {
    console.error(`Error resuming rollout ${namespace}/${name}:`, error)
    throw error
  }
}

export const undoRollout = async (namespace: string, name: string): Promise<void> => {
  try {
    await axiosInstance.post(`/rollout/undo/${namespace}/${name}`)
  } catch (error) {
    console.error(`Error undoing rollout ${namespace}/${name}:`, error)
    throw error
  }
}

export const restartRollout = async (namespace: string, name: string): Promise<void> => {
  try {
    await axiosInstance.post(`/rollout/restart/${namespace}/${name}`)
  } catch (error) {
    console.error(`Error restarting rollout ${namespace}/${name}:`, error)
    throw error
  }
}

export const promoteRollout = async (namespace: string, name: string): Promise<void> => {
  try {
    await axiosInstance.post(`/rollout/promote/${namespace}/${name}`)
  } catch (error) {
    console.error(`Error promoting rollout ${namespace}/${name}:`, error)
    throw error
  }
}

export const approveRollout = async (namespace: string, name: string): Promise<void> => {
  try {
    await axiosInstance.post(`/rollout/approve/${namespace}/${name}`)
  } catch (error) {
    console.error(`Error approving rollout ${namespace}/${name}:`, error)
    throw error
  }
}

export const enableRollout = async (namespace: string, name: string): Promise<void> => {
  try {
    await axiosInstance.post(`/rollout/enable/${namespace}/${name}`)
  } catch (error) {
    console.error(`Error enabling rollout ${namespace}/${name}:`, error)
    throw error
  }
}

export const disableRollout = async (namespace: string, name: string): Promise<void> => {
  try {
    await axiosInstance.post(`/rollout/disable/${namespace}/${name}`)
  } catch (error) {
    console.error(`Error disabling rollout ${namespace}/${name}:`, error)
    throw error
  }
}

export const abortRollout = async (namespace: string, name: string): Promise<void> => {
  try {
    await axiosInstance.post(`/rollout/abort/${namespace}/${name}`)
  } catch (error) {
    console.error(`Error aborting rollout ${namespace}/${name}:`, error)
    throw error
  }
}

export const retryRollout = async (namespace: string, name: string): Promise<void> => {
  try {
    await axiosInstance.post(`/rollout/retry/${namespace}/${name}`)
  } catch (error) {
    console.error(`Error retrying rollout ${namespace}/${name}:`, error)
    throw error
  }
}

export const rollbackRollout = async (namespace: string, name: string): Promise<RolloutRollbackResponse> => {
  try {
    const response = await axiosInstance.post(`/rollout/rollback/${namespace}/${name}`)
    return response.data as RolloutRollbackResponse
  } catch (error) {
    console.error(`Error rolling back rollout ${namespace}/${name}:`, error)
    throw error
  }
}

export const listAllRollouts = async (
  namespace: string,
): Promise<{ rollouts: Rollout[]; total: number; namespace: string }> => {
  try {
    const response = await axiosInstance.get(`/rollout/list/${namespace}`)
    return response.data
  } catch (error) {
    console.error(`Error listing all rollouts in namespace ${namespace}:`, error)
    throw error
  }
}

export const listActiveRollouts = async (namespace: string): Promise<Rollout[]> => {
  try {
    const response = await axiosInstance.get(`/rollout/active/${namespace}`)
    return response.data
  } catch (error) {
    console.error(`Error listing active rollouts in namespace ${namespace}:`, error)
    throw error
  }
}

export const listDefaultRollouts = async (): Promise<{
  rollouts: Rollout[]
  total: number
  namespace: string
  apiVersions: string[]
}> => {
  try {
    const response = await axiosInstance.get(`/rollout/default`)
    return response.data
  } catch (error) {
    console.error("Error listing rollouts in default namespace:", error)
    throw error
  }
}

export const getRolloutPods = async (namespace: string, name: string): Promise<RolloutPodsResponse> => {
  try {
    const response = await axiosInstance.get(`/rollout/${namespace}/${name}/pods`)
    return response.data
  } catch (error) {
    console.error(`Error fetching rollout pods for ${namespace}/${name}:`, error)
    throw error
  }
}

export const getRolloutAnalysis = async (namespace: string, name: string): Promise<RolloutAnalysisResponse> => {
  try {
    const response = await axiosInstance.get(`/rollout/${namespace}/${name}/analysis`)
    return response.data as RolloutAnalysisResponse
  } catch (error) {
    console.error(`Error fetching rollout analysis for ${namespace}/${name}:`, error)
    throw error
  }
}

export const setRolloutImage = async (
  namespace: string,
  name: string,
  payload: SetRolloutImagePayload,
): Promise<void> => {
  try {
    await axiosInstance.post(`/rollout/set-image/${namespace}/${name}`, payload)
  } catch (error) {
    console.error(`Error setting rollout image for ${namespace}/${name}:`, error)
    throw error
  }
}

export function watchRollouts(namespace: string, handlers: RolloutWatchClientHandlers) {
  return createRolloutWatchClient(resolveWatchURL(`/rollout/watch/${namespace}`), handlers)
}

export function watchRollout(namespace: string, name: string, handlers: RolloutWatchClientHandlers) {
  return createRolloutWatchClient(resolveWatchURL(`/rollout/watch/${namespace}/${name}`), handlers)
}
