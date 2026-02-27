"use client"

import { useState } from "react"
import { Maximize2 } from "lucide-react"
import {
  Background,
  Controls,
  ReactFlow,
  type Edge,
  type EdgeTypes,
  type FitViewOptions,
  type Node,
  type NodeTypes,
} from "@xyflow/react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

export interface FlowFullscreenButtonProps {
  title: string
  nodes: Node[]
  edges: Edge[]
  edgeTypes?: EdgeTypes
  nodeTypes?: NodeTypes
  fitViewOptions?: FitViewOptions
  minZoom?: number
  maxZoom?: number
  bgGap?: number
  bgSize?: number
  bgColor?: string
  className?: string
}

export function FlowFullscreenButton({
  title,
  nodes,
  edges,
  edgeTypes,
  nodeTypes,
  fitViewOptions = { padding: 0.12 },
  minZoom = 0.3,
  maxZoom = 2.5,
  bgGap = 18,
  bgSize = 1,
  bgColor = "#cbd5e1",
  className,
}: Readonly<FlowFullscreenButtonProps>) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className={cn("h-7 w-7 p-0", className)}
        onClick={() => setOpen(true)}
        aria-label="全屏查看流程图"
        title="全屏查看"
      >
        <Maximize2 className="h-3.5 w-3.5" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex h-[92vh] w-full max-w-[94vw] flex-col gap-0 overflow-hidden p-0 sm:rounded-xl">
          <div className="flex shrink-0 items-center border-b px-5 py-3 pr-14">
            <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
          </div>
          <div className="min-h-0 flex-1">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              edgeTypes={edgeTypes}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={fitViewOptions}
              minZoom={minZoom}
              maxZoom={maxZoom}
              nodesDraggable
              nodesConnectable={false}
              panOnDrag
              panOnScroll
              zoomOnScroll
              zoomOnPinch
              zoomOnDoubleClick={false}
            >
              <Background gap={bgGap} size={bgSize} color={bgColor} />
              <Controls position="bottom-right" />
            </ReactFlow>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
