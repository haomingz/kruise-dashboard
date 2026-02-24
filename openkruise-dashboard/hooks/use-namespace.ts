"use client"

import { createContext, use } from 'react'
import useSWR from 'swr'
import { listNamespaces } from '../api/namespace'

// Namespaces change rarely; refresh at most every 5 minutes, and do not refetch on tab focus.
const NAMESPACES_REFRESH_INTERVAL_MS = 5 * 60 * 1000

export interface NamespaceContextType {
  namespace: string
  setNamespace: (ns: string) => void
  namespaces: string[]
  isLoading: boolean
}

export const NamespaceContext = createContext<NamespaceContextType>({
  namespace: 'default',
  setNamespace: () => {},
  namespaces: [],
  isLoading: false,
})

export function useNamespace() {
  return use(NamespaceContext)
}

export function useNamespaceList() {
  return useSWR('namespaces', () => listNamespaces(), {
    refreshInterval: NAMESPACES_REFRESH_INTERVAL_MS,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 10 * 1000,
  })
}
