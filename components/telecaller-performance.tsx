"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

interface TelecallerPerformanceProps {
  startDate: string
  endDate: string
  telecallerId?: string
}

interface PerformanceData {
  id: string
  name: string
  totalLeads: number
  totalCalls: number
  connectedCalls: number
  connectRate: number
  newLeads: number
  convertedLeads: number
  conversionRate: number
  isCheckedIn: boolean
}

export function TelecallerPerformance({ startDate, endDate, telecallerId }: TelecallerPerformanceProps) {
  const [data, setData] = useState<PerformanceData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get telecallers to analyze
        let telecallers
        if (telecallerId) {
          const { data } = await supabase.from("users").select("id, full_name").eq("id", telecallerId).single()
          telecallers = data ? [data] : []
        } else {
          const { data } = await supabase
            .from("users")
            .select("id, full_name")
            .eq("role", "telecaller")
            .eq("is_active", true)
          telecallers = data || []
        }

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
            telecallerStatus = attendanceRecords.reduce((acc, record) => {
              acc[record.user_id] = !!record.check_in
              return acc
            }, {} as Record<string, boolean>)
          }
        } catch (err) {
          console.error("Error fetching telecaller status:", err)
        }

        const performanceData: PerformanceData[] = []

        for (const telecaller of telecallers) {
          // Get leads assigned to this telecaller
          const { data: leads } = await supabase
            .from("leads")
            .select("status, created_at")
            .eq("assigned_to", telecaller.id)
            .gte("created_at", startDate)
            .lte("created_at", `${endDate}T23:59:59`)

          // Get calls made by this telecaller
          const { data: calls } = await supabase
            .from("call_logs")
            .select("call_status, call_type")
            .eq("user_id", telecaller.id)
            .gte("created_at", startDate)
            .lte("created_at", `${endDate}T23:59:59`)

          const totalLeads = leads?.length || 0
          const totalCalls = calls?.length || 0
          
          // Update connected calls to include various successful call statuses
          const connectedCalls = calls?.filter((call) => 
            call.call_status === "connected" || 
            call.call_status === "completed" ||
            call.call_status === "successful" ||
            call.call_type === "outbound"
          ).length || 0
          
          // Update new leads to include all initial statuses
          const newLeads = leads?.filter((lead) => 
            lead.status === "new" || 
            lead.status === "contacted" ||
            lead.status === "Interested"
          ).length || 0
          
          // Update converted leads to include all successful conversion statuses
          const convertedLeads = leads?.filter((lead) => 
            lead.status === "closed_won" ||
            lead.status === "Disbursed" ||
            lead.status === "Login" ||
            lead.status === "Documents_Sent" ||
            lead.status === "qualified"
          ).length || 0

          performanceData.push({
            id: telecaller.id,
            name: telecaller.full_name,
            totalLeads,
            totalCalls,
            connectedCalls,
            connectRate: totalCalls > 0 ? (connectedCalls / totalCalls) * 100 : 0,
            newLeads,
            convertedLeads,
            conversionRate: totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0,
            isCheckedIn: telecallerStatus[telecaller.id] || false
          })
        }

        // Sort by total calls descending
        performanceData.sort((a, b) => b.totalCalls - a.totalCalls)
        setData(performanceData)
      } catch (error) {
        console.error("Error fetching telecaller performance:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [startDate, endDate, telecallerId, supabase])

  const getPerformanceBadge = (rate: number, type: "connect" | "conversion") => {
    const thresholds = type === "connect" ? [60, 40] : [15, 8] // Adjusted thresholds for more realistic goals

    if (rate >= thresholds[0]) {
      return (
        <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
          <TrendingUp className="h-3 w-3" />
          Excellent
        </Badge>
      )
    } else if (rate >= thresholds[1]) {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 flex items-center gap-1">
          <Minus className="h-3 w-3" />
          Good
        </Badge>
      )
    } else {
      return (
        <Badge className="bg-red-100 text-red-800 flex items-center gap-1">
          <TrendingDown className="h-3 w-3" />
          Needs Improvement
        </Badge>
      )
    }
  }

  if (isLoading) {
    return <div className="text-center py-4">Loading performance data...</div>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b bg-gray-50">
            <th className="text-left p-4 font-semibold">Telecaller</th>
            <th className="text-left p-4 font-semibold">Status</th>
            <th className="text-left p-4 font-semibold">Total Leads</th>
            <th className="text-left p-4 font-semibold">New Leads</th>
            <th className="text-left p-4 font-semibold">Total Calls</th>
            <th className="text-left p-4 font-semibold">Connected Calls</th>
            <th className="text-left p-4 font-semibold">Connect Rate</th>
            <th className="text-left p-4 font-semibold">Conversions</th>
            <th className="text-left p-4 font-semibold">Conversion Rate</th>
            <th className="text-left p-4 font-semibold">Performance</th>
          </tr>
        </thead>
        <tbody>
          {data.map((telecaller) => (
            <tr key={telecaller.id} className="border-b hover:bg-gray-50">
              <td className="p-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-sm">
                      {telecaller.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="font-medium">{telecaller.name}</span>
                </div>
              </td>
              <td className="p-4">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${telecaller.isCheckedIn ? 'bg-green-500' : 'bg-red-500'}`} 
                       title={telecaller.isCheckedIn ? 'Checked in' : 'Not checked in'} />
                  <span className="text-sm">
                    {telecaller.isCheckedIn ? 'Checked In' : 'Not Checked In'}
                  </span>
                </div>
              </td>
              <td className="p-4 text-center">
                <div className="font-semibold text-lg">{telecaller.totalLeads}</div>
              </td>
              <td className="p-4 text-center">
                <div className="font-semibold text-blue-600">{telecaller.newLeads}</div>
              </td>
              <td className="p-4 text-center">
                <div className="font-semibold text-lg">{telecaller.totalCalls}</div>
              </td>
              <td className="p-4 text-center">
                <div className="font-semibold text-green-600">{telecaller.connectedCalls}</div>
              </td>
              <td className="p-4">
                <div className="text-center">
                  <div className="font-semibold">{telecaller.connectRate.toFixed(1)}%</div>
                  {getPerformanceBadge(telecaller.connectRate, "connect")}
                </div>
              </td>
              <td className="p-4 text-center">
                <div className="font-semibold text-purple-600">{telecaller.convertedLeads}</div>
              </td>
              <td className="p-4">
                <div className="text-center">
                  <div className="font-semibold">{telecaller.conversionRate.toFixed(1)}%</div>
                  {getPerformanceBadge(telecaller.conversionRate, "conversion")}
                </div>
              </td>
              <td className="p-4">
                <div className="flex flex-col gap-2">
                  <div className="text-sm">
                    <span className="text-gray-600">Calls/Lead: </span>
                    <span className="font-medium">
                      {telecaller.totalLeads > 0 ? (telecaller.totalCalls / telecaller.totalLeads).toFixed(1) : "0"}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-600">Activity: </span>
                    <span
                      className={`font-medium ${telecaller.totalCalls >= 20 ? "text-green-600" : telecaller.totalCalls >= 10 ? "text-yellow-600" : "text-red-600"}`}
                    >
                      {telecaller.totalCalls >= 20 ? "High" : telecaller.totalCalls >= 10 ? "Medium" : "Low"}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-600">Efficiency: </span>
                    <span
                      className={`font-medium ${telecaller.conversionRate >= 15 ? "text-green-600" : telecaller.conversionRate >= 8 ? "text-yellow-600" : "text-red-600"}`}
                    >
                      {telecaller.conversionRate >= 15 ? "High" : telecaller.conversionRate >= 8 ? "Medium" : "Low"}
                    </span>
                  </div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {data.length === 0 && (
        <div className="text-center py-8 text-gray-500">No performance data available for the selected period.</div>
      )}
    </div>
  )
}