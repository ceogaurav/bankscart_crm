"use client"

import type React from "react"

import { useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useLeadAssignmentNotifications } from "@/hooks/use-lead-assignment-notifications"

interface NotificationProviderProps {
  children: React.ReactNode
  userId?: string
}

export function NotificationProvider({ children, userId }: NotificationProviderProps) {
  const supabase = createClient()

  // Setup lead assignment notifications
  useLeadAssignmentNotifications(userId)

  useEffect(() => {
    if (!userId) return

    // Request notification permission on app load
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission().then((permission) => {
          if (permission === "granted") {
            console.log("Notification permission granted")
          }
        })
      }
    }

    // Setup service worker for push notifications
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("Service Worker registered:", registration)
        })
        .catch((error) => {
          console.error("Service Worker registration failed:", error)
        })
    }
  }, [userId])

  return <>{children}</>
}
