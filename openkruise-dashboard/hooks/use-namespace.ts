"use client"

import { createContext, useContext } from 'react'
import useSWR from 'swr'
import { listNamespaces } from '../api/namespace'

const REFRESH_INTERVAL = 60000

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
  return useContext(NamespaceContext)
}

export function useNamespaceList() {
  return useSWR('namespaces', () => listNamespaces(), {
    refreshInterval: REFRESH_INTERVAL,
  })
}
