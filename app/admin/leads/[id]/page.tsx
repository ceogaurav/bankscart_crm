"use server";

import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Save } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { updateLead } from "./actions"
import { QuickActions } from "@/components/quick-actions"

// Define types
interface EditLeadPageProps {
  params: {
    id: string
  }
}

interface Lead {
  id: string
  name: string
  email: string | null
  phone: string
  company: string | null
  designation: string | null
  source: string | null
  status: string
  priority: string
  created_at: string
  last_contacted: string | null
  next_follow_up: string | null
  assigned_to: string | null
  assigned_user: {
    id: string
    full_name: string
  } | null
  assigner: {
    id: string
    full_name: string
  } | null
  notes: string | null
}

interface Telecaller {
  id: string
  full_name: string
}

interface AttendanceRecord {
  user_id: string
  check_in: string | null
}

interface Note {
  id: string
  content: string
  created_at: string
  user: {
    full_name: string
  } | null
}

interface CallLog {
  id: string
  call_type: string
  duration: number | null
  outcome: string
  created_at: string
  user: {
    full_name: string
  } | null
}

export default async function EditLeadPage({ params }: EditLeadPageProps) {
  const supabase = await createClient()

  // Get lead data
  const { data: leadData, error } = await supabase
    .from("leads")
    .select(`
      *,
      assigned_user:users!leads_assigned_to_fkey(id, full_name),
      assigner:users!leads_assigned_by_fkey(id, full_name)
    `)
    .eq("id", params.id)
    .single()

  const lead = leadData as Lead | null

  if (error || !lead) {
    redirect("/admin/leads")
  }

  // Get telecallers for assignment
  const { data: telecallersData } = await supabase
    .from("users")
    .select("id, full_name")
    .eq("role", "telecaller")
    .eq("is_active", true)

  const telecallers = telecallersData as Telecaller[] | null

  // Get telecaller status for today
  let telecallerStatus: Record<string, boolean> = {}
  try {
    const today = new Date().toISOString().split('T')[0]
    const { data: attendanceRecords } = await supabase
      .from("attendance")
      .select("user_id, check_in")
      .eq("date", today)
    
    if (attendanceRecords) {
      // Create a map of telecaller ID to checked-in status
      telecallerStatus = attendanceRecords.reduce((acc: Record<string, boolean>, record: AttendanceRecord) => {
        acc[record.user_id] = !!record.check_in
        return acc
      }, {} as Record<string, boolean>)
    }
  } catch (err) {
    console.error("Error fetching telecaller status:", err)
  }

  // Get notes for this lead
  const { data: notesData } = await supabase
    .from("notes")
    .select(`
      *,
      user:users(full_name)
    `)
    .eq("lead_id", params.id)
    .order("created_at", { ascending: false })

  const notes = notesData as Note[] | null

  // Get call history
  const { data: callHistoryData } = await supabase
    .from("call_logs")
    .select(`
      *,
      user:users(full_name)
    `)
    .eq("lead_id", params.id)
    .order("created_at", { ascending: false })

  const callHistory = callHistoryData as CallLog[] | null

  const updateLeadWithId = updateLead.bind(null, params.id)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/leads">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Leads
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Lead</h1>
          <p className="text-gray-600 mt-1">Update lead information and status</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lead Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Lead Information</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={updateLeadWithId} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input id="name" name="name" defaultValue={lead.name} required />
                  </div>
                  <div>
                    <Label htmlFor="company">Company</Label>
                    <Input id="company" name="company" defaultValue={lead.company || ""} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" defaultValue={lead.email || ""} />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone *</Label>
                    <Input id="phone" name="phone" defaultValue={lead.phone} required />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select name="status" defaultValue={lead.status || "new"}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="Interested">Interested</SelectItem>
                    <SelectItem value="Documents_Sent">Documents Sent</SelectItem>
                    <SelectItem value="Login">Login</SelectItem>
                    <SelectItem value="Disbursed">Disbursed</SelectItem>
                    <SelectItem value="Not_Interested">Not Interested</SelectItem>
                    <SelectItem value="Call_Back">Call Back</SelectItem>
                    <SelectItem value="not_eligible">Not Eligible</SelectItem>
                    <SelectItem value="nr">NR</SelectItem>
                    <SelectItem value="self_employed">Self Employed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Select name="priority" defaultValue={lead.priority || "low"}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="assigned_to">Assign To</Label>
                    <Select name="assigned_to" defaultValue={lead.assigned_to || "unassigned"}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select telecaller" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {telecallers?.map((telecaller: Telecaller) => (
                          <SelectItem key={telecaller.id} value={telecaller.id}>
                            <div className="flex items-center gap-2">
                              {/* Status indicator for telecaller */}
                              <div className={`w-2 h-2 rounded-full ${telecallerStatus[telecaller.id] ? 'bg-green-500' : 'bg-red-500'}`} 
                                   title={telecallerStatus[telecaller.id] ? 'Checked in' : 'Not checked in'} />
                              {telecaller.full_name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="source">Source</Label>
                  <Input
                    id="source"
                    name="source"
                    defaultValue={lead.source || ""}
                    placeholder="e.g., Website, Referral, Cold Call"
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" name="notes" defaultValue={lead.notes || ""} rows={3} />
                </div>

                <Button type="submit" className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <QuickActions 
                phone={lead.phone} 
                email={lead.email} 
                leadId={lead.id} 
                onCallInitiated={() => {}} 
              />
            </CardContent>
          </Card>

          {/* Recent Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Notes ({notes?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {notes && notes.length > 0 ? (
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {notes.slice(0, 3).map((note: Note) => (
                    <div key={note.id} className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-900">{note.content}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        by {note.user?.full_name} • {new Date(note.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No notes yet</p>
              )}
            </CardContent>
          </Card>

          {/* Call History */}
          <Card>
            <CardHeader>
              <CardTitle>Call History ({callHistory?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {callHistory && callHistory.length > 0 ? (
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {callHistory.slice(0, 3).map((call: CallLog) => (
                    <div key={call.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium">{call.call_type}</p>
                          <p className="text-xs text-gray-500">
                            {call.duration ? `${call.duration} min` : "No duration"}
                          </p>
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            call.outcome === "answered"
                              ? "bg-green-100 text-green-800"
                              : call.outcome === "no_answer"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                          }`}
                        >
                          {call.outcome}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        by {call.user?.full_name} • {new Date(call.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No calls yet</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}