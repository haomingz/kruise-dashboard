"use client"

import { useState } from "react"
import { NamespaceContext, useNamespaceList } from "../hooks/use-namespace"
import { config } from "../lib/config"

export function NamespaceProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [namespace, setNamespace] = useState(config.defaultNamespace)
  const { data: namespaces, isLoading } = useNamespaceList()

  return (
    <NamespaceContext
      value={{
        namespace,
        setNamespace,
        namespaces: namespaces || [],
        isLoading,
      }}
    >
      {children}
    </NamespaceContext>
  )
}
