"use client"

import { useMemo, useState } from "react"
import { NamespaceContext, useNamespaceList } from "../hooks/use-namespace"
import { config } from "../lib/config"

export function NamespaceProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [namespace, setNamespace] = useState(config.defaultNamespace)
  const { data: namespaces, isLoading } = useNamespaceList()
  const contextValue = useMemo(
    () => ({
      namespace,
      setNamespace,
      namespaces: namespaces || [],
      isLoading,
    }),
    [namespace, namespaces, isLoading],
  )

  return (
    <NamespaceContext value={contextValue}>
      {children}
    </NamespaceContext>
  )
}
