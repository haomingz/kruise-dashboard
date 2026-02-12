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
    <div className="min-w-0 -mx-2 sm:mx-0 [&_th]:h-9 [&_th]:py-1.5 [&_td]:py-1.5 [&_th]:px-2 [&_td]:px-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[100px]">Name</TableHead>
            <TableHead className="hidden md:table-cell">Namespace</TableHead>
            <TableHead className="whitespace-nowrap">Replicas</TableHead>
            <TableHead className="whitespace-nowrap">Status</TableHead>
            <TableHead className="hidden lg:table-cell">Update Strategy</TableHead>
            {showImage && <TableHead className="hidden xl:table-cell max-w-[120px]">Image</TableHead>}
            <TableHead className="whitespace-nowrap">Age</TableHead>
            <TableHead className="text-right w-[80px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {workloadList.map((workload, index) => (
            <TableRow key={`${workload.name}-${index}`}>
              <TableCell className="font-medium min-w-0">
                <Link
                  href={`/workloads/${workload.workloadType}/${workload.namespace}/${workload.name}`}
                  className="text-primary hover:underline truncate block max-w-[200px] sm:max-w-none"
                >
                  {workload.name}
                </Link>
              </TableCell>
              <TableCell className="hidden md:table-cell">{workload.namespace}</TableCell>
              <TableCell className="tabular-nums">{workload.replicas}</TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <StatusIcon status={workload.status} />
                  <span className="whitespace-nowrap">{workload.status}</span>
                </div>
              </TableCell>
              <TableCell className="hidden lg:table-cell">{workload.updateStrategy}</TableCell>
              {showImage && <TableCell className="hidden xl:table-cell max-w-[120px] truncate" title={workload.image}>{workload.image}</TableCell>}
              <TableCell className="tabular-nums">{workload.age}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" asChild className="shrink-0">
                  <Link href={`/workloads/${workload.workloadType}/${workload.namespace}/${workload.name}`}>
                    <ExternalLink className="h-4 w-4 sm:mr-2" aria-hidden="true" />
                    <span className="hidden sm:inline">View</span>
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
})
