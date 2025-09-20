"use client"

import { useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { leadAssignmentNotificationManager } from "@/lib/lead-assignment-notifications"

export function useLeadAssignmentNotifications(userId?: string) {
  const supabase = createClient()

  useEffect(() => {
    if (!userId) return

    // Setup real-time subscription for lead assignments
    leadAssignmentNotificationManager.setupRealtimeSubscription(userId)

    // Request notification permission if not already granted
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission().then((permission) => {
          if (permission === "granted") {
            console.log("Notification permission granted")
          }
        })
      }
    }

    return () => {
      // Cleanup subscriptions when component unmounts
      supabase.removeAllChannels()
    }
  }, [userId, supabase])
}
