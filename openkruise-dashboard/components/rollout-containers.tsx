"use client"

import { useState } from "react"
import { setRolloutImage, type ContainerInfo } from "@/api/rollout"
import { Package, Pencil, Save, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

interface RolloutContainersProps {
  containers: ContainerInfo[]
  namespace: string
  rolloutName: string
  onUpdated?: () => void
}

export function RolloutContainers({
  containers,
  namespace,
  rolloutName,
  onUpdated,
}: Readonly<RolloutContainersProps>) {
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [draftImage, setDraftImage] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  if (!containers || containers.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-2">
        No container info available
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {containers.map((c) => (
        <ContainerRow
          key={`${c.type || "container"}-${c.name}`}
          container={c}
          isEditing={editingKey === `${c.type || "container"}-${c.name}`}
          draftImage={draftImage}
          isSaving={isSaving}
          onStartEdit={() => {
            setEditingKey(`${c.type || "container"}-${c.name}`)
            setDraftImage(c.image)
            setSaveError(null)
          }}
          onCancelEdit={() => {
            setEditingKey(null)
            setDraftImage("")
            setSaveError(null)
          }}
          onDraftImageChange={setDraftImage}
          onSave={async () => {
            setIsSaving(true)
            setSaveError(null)
            try {
              await setRolloutImage(namespace, rolloutName, {
                container: c.name,
                image: draftImage,
                initContainer: c.type === "initContainer",
              })
              setEditingKey(null)
              setDraftImage("")
              onUpdated?.()
            } catch (error) {
              setSaveError("Failed to update image")
              console.error("Failed to update container image:", error)
            } finally {
              setIsSaving(false)
            }
          }}
          error={saveError}
        />
      ))}
    </div>
  )
}

function ContainerRow({
  container,
  isEditing,
  draftImage,
  isSaving,
  onStartEdit,
  onCancelEdit,
  onDraftImageChange,
  onSave,
  error,
}: Readonly<{
  container: ContainerInfo
  isEditing: boolean
  draftImage: string
  isSaving: boolean
  onStartEdit: () => void
  onCancelEdit: () => void
  onDraftImageChange: (image: string) => void
  onSave: () => Promise<void>
  error: string | null
}>) {
  return (
    <div className="space-y-1 rounded-md border bg-muted/30 p-2">
      <div className="flex items-center gap-2">
        <Package className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-sm font-medium">{container.name}</span>
        <Badge variant="outline" className="text-[10px]">
          {container.type === "initContainer" ? "init" : "container"}
        </Badge>
        <div className="ml-auto">
          {!isEditing ? (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onStartEdit}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCancelEdit} disabled={isSaving}>
                <X className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => void onSave()} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              </Button>
            </div>
          )}
        </div>
      </div>

      {!isEditing ? (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">&rarr;</span>
          <span className="font-mono text-muted-foreground truncate">{container.image}</span>
        </div>
      ) : (
        <Input
          value={draftImage}
          onChange={(e) => onDraftImageChange(e.target.value)}
          placeholder="image:tag"
          className="h-8 font-mono text-xs"
        />
      )}
      {isEditing && error && <div className="text-xs text-red-600">{error}</div>}
    </div>
  )
}
