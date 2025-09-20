// components/lead-status-dialog.tsx
"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { LeadStatusUpdater } from "@/components/lead-status-updater"

interface LeadStatusDialogProps {
  leadId: string
  currentStatus: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onStatusUpdate?: (newStatus: string) => void
  title?: string
  description?: string
}

export function LeadStatusDialog({ 
  leadId, 
  currentStatus, 
  open, 
  onOpenChange, 
  onStatusUpdate,
  title = "Update Lead Status",
  description = "Update the status of this lead."
}: LeadStatusDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <LeadStatusUpdater 
          leadId={leadId} 
          currentStatus={currentStatus} 
          onStatusUpdate={onStatusUpdate}
        />
      </DialogContent>
    </Dialog>
  )
}
