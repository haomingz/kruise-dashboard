"use client"

import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CheckCircle, Clock, ExternalLink, Loader2, RefreshCw, XCircle } from "lucide-react"
import Link from "next/link"
import { memo } from "react"

export interface TransformedWorkload {
  name: string
  namespace: string
  replicas: string
  status: string
  updateStrategy: string
  age: string
  image?: string
  workloadType: string
}

function StatusIcon({ status }: Readonly<{ status: string }>) {
  switch (status) {
    case 'Healthy':
      return <CheckCircle className="mr-2 h-4 w-4 text-green-500" aria-hidden="true" />
    case 'Updating':
      return <RefreshCw className="mr-2 h-4 w-4 text-amber-500 motion-safe:animate-spin" aria-hidden="true" />
    case 'Failed':
      return <XCircle className="mr-2 h-4 w-4 text-red-500" aria-hidden="true" />
    default:
      return <Clock className="mr-2 h-4 w-4 text-amber-500" aria-hidden="true" />
  }
}

interface WorkloadTableProps {
  workloadList: TransformedWorkload[]
  type: string
  showImage?: boolean
  loading?: boolean
}

export const WorkloadTable = memo(function WorkloadTable({ workloadList, type, showImage = true, loading = false }: WorkloadTableProps) {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-4">
        <Loader2 className="h-8 w-8 motion-safe:animate-spin" aria-hidden="true" />
        <span className="sr-only">Loading {type}…</span>
        <span className="ml-2">Loading {type}…</span>
      </div>
    )
  }

  if (workloadList.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        No {type} found
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Namespace</TableHead>
          <TableHead>Replicas</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Update Strategy</TableHead>
          {showImage && <TableHead>Image</TableHead>}
          <TableHead>Age</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {workloadList.map((workload, index) => (
          <TableRow key={`${workload.name}-${index}`}>
            <TableCell className="font-medium">
              <Link
                href={`/workloads/${workload.workloadType}/${workload.namespace}/${workload.name}`}
                className="text-primary hover:underline"
              >
                {workload.name}
              </Link>
            </TableCell>
            <TableCell>{workload.namespace}</TableCell>
            <TableCell>{workload.replicas}</TableCell>
            <TableCell>
              <div className="flex items-center">
                <StatusIcon status={workload.status} />
                {workload.status}
              </div>
            </TableCell>
            <TableCell>{workload.updateStrategy}</TableCell>
            {showImage && <TableCell className="max-w-xs truncate" title={workload.image}>{workload.image}</TableCell>}
            <TableCell>{workload.age}</TableCell>
            <TableCell className="text-right">
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/workloads/${workload.workloadType}/${workload.namespace}/${workload.name}`}>
                  <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
                  View
                </Link>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
})
