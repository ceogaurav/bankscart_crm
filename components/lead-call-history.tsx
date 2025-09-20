// components/lead-call-history.tsx
"use client"
import { EnhancedCallHistory } from "./enhanced-call-history"

interface CallLog {
  id: string
  call_type: string
  duration: number
  notes: string
  created_at: string
  users: {
    full_name: string
  }
}

interface LeadCallHistoryProps {
  leadId: string
  leadPhone?: string
}

export function LeadCallHistory({ leadId, leadPhone }: LeadCallHistoryProps) {
  return <EnhancedCallHistory leadId={leadId} leadPhone={leadPhone} />
}
