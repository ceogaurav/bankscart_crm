// components/lead-status-updater.tsx
"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, X } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

interface LeadStatusUpdaterProps {
  leadId: string
  currentStatus: string
  onStatusUpdate?: (newStatus: string, note?: string, callbackDate?: string) => void
}

const statusOptions = [
  { value: "new", label: "New", color: "bg-blue-100 text-blue-800" },
  { value: "contacted", label: "Contacted", color: "bg-yellow-100 text-yellow-800" },
  { value: "Interested", label: "Interested", color: "bg-green-100 text-green-800" },
  { value: "Documents_Sent", label: "Documents Sent", color: "bg-purple-100 text-purple-800" },
  { value: "Login", label: "Login", color: "bg-orange-100 text-orange-800" },
  { value: "Disbursed", label: "Disbursed", color: "bg-green-100 text-green-800" },
  { value: "Not_Interested", label: "Not Interested", color: "bg-red-100 text-red-800" },
  { value: "follow_up", label: "Call Back", color: "bg-indigo-100 text-indigo-800" },
  { value: "not_eligible", label: "Not Eligible", color: "bg-red-100 text-red-800" },
  { value: "nr", label: "NR", color: "bg-gray-100 text-gray-800" },
  { value: "self_employed", label: "Self Employed", color: "bg-amber-100 text-amber-800" },
]

export function LeadStatusUpdater({ leadId, currentStatus, onStatusUpdate }: LeadStatusUpdaterProps) {
  const [status, setStatus] = useState(currentStatus)
  const [isUpdating, setIsUpdating] = useState(false)
  const [note, setNote] = useState("")
  const [remarks, setRemarks] = useState("") // New state for general remarks
  const [callbackDate, setCallbackDate] = useState<Date>()
  const supabase = createClient()

  const handleStatusUpdate = async () => {
    setIsUpdating(true)
    try {
      const updateData: any = { 
        status: status,
        last_contacted: new Date().toISOString()
      }

      // Add general remarks/notes if provided
      if (remarks.trim()) {
        updateData.notes = remarks
      }
      
      // Add specific note if provided for Not Eligible status
      if (status === "not_eligible" && note.trim()) {
        updateData.notes = updateData.notes ? `${updateData.notes}\n\nReason for Not Eligible: ${note}` : `Reason for Not Eligible: ${note}`
      }

      // Add callback date if provided for Call Back status
      if (status === "follow_up" && callbackDate) {
        updateData.next_follow_up = callbackDate.toISOString()
      }

      const { error } = await supabase
        .from("leads")
        .update(updateData)
        .eq("id", leadId)

      if (error) throw error

      onStatusUpdate?.(status, note, callbackDate?.toISOString())
      
      // Reset form
      setNote("")
      setRemarks("")
      setCallbackDate(undefined)
    } catch (error) {
      console.error("Error updating lead status:", error)
    } finally {
      setIsUpdating(false)
    }
  }

  const currentStatusOption = statusOptions.find((option) => option.value === status)

  const showNoteField = status === "not_eligible"
  const showCallbackField = status === "follow_up"

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Lead Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Current Status:</span>
          <Badge className={currentStatusOption?.color}>{currentStatusOption?.label}</Badge>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Update Status:</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* General remarks/notes field - always visible */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Remarks/Notes:</label>
            <Textarea
              placeholder="Add any remarks or notes about this status update..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
            />
          </div>

          {/* Note field for Not Eligible status */}
          {showNoteField && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason for Not Eligible:</label>
              <Textarea
                placeholder="Please specify the reason why this lead is not eligible..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
              />
            </div>
          )}

          {/* Callback date field for Call Back status */}
          {showCallbackField && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Schedule Call Back:</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !callbackDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {callbackDate ? format(callbackDate, "PPP") : "Pick a date and time"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={callbackDate}
                    onSelect={setCallbackDate}
                    initialFocus
                  />
                  <div className="p-3 border-t">
                    <Input
                      type="time"
                      value={callbackDate ? format(callbackDate, "HH:mm") : ""}
                      onChange={(e) => {
                        if (callbackDate && e.target.value) {
                          const [hours, minutes] = e.target.value.split(":").map(Number)
                          const newDate = new Date(callbackDate)
                          newDate.setHours(hours, minutes)
                          setCallbackDate(newDate)
                        }
                      }}
                      className="w-full"
                    />
                  </div>
                </PopoverContent>
              </Popover>
              {callbackDate && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <span>Callback scheduled for: {format(callbackDate, "PPP 'at' h:mm a")}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCallbackDate(undefined)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          )}

          <Button 
            onClick={handleStatusUpdate} 
            disabled={isUpdating || status === currentStatus}
            className="w-full"
          >
            {isUpdating ? "Updating..." : "Update Status"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}