'use client'

import { WorkloadDetail } from "@/components/workload-detail"
import { useParams } from "next/navigation"

export default function WorkloadDetailPage() {
    const params = useParams()
    const workloadId = Array.isArray(params.id) ? params.id.join('-') : params.id || ''

    return <WorkloadDetail workloadId={workloadId} />
} 