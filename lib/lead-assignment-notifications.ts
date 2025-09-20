"use client"

import { createClient } from "@/lib/supabase/client"
import { notificationService } from "@/lib/notification-service"
import { toast } from "sonner"

export interface LeadAssignmentNotification {
  leadId: string
  leadName: string
  leadPhone: string
  leadEmail?: string
  assignedTo: string
  assignedBy: string
  assignedAt: string
  priority?: string
  loanAmount?: number
  loanType?: string
}

export class LeadAssignmentNotificationManager {
  private supabase = createClient()

  // Send notification when lead is assigned
  async notifyLeadAssignment(notification: LeadAssignmentNotification): Promise<void> {
    try {
      // Get assigned user details
      const { data: assignedUser, error: userError } = await this.supabase
        .from("users")
        .select("full_name, email, notification_preferences")
        .eq("id", notification.assignedTo)
        .single()

      if (userError || !assignedUser) {
        console.error("Error fetching assigned user:", userError)
        return
      }

      // Check if user has assignment notifications enabled
      const preferences = assignedUser.notification_preferences || {}
      if (preferences.assignment_notifications === false) {
        return // User has disabled assignment notifications
      }

      // Create notification content
      const title = "🎯 New Lead Assigned"
      const body = `${notification.leadName} has been assigned to you`
      const details = this.formatLeadDetails(notification)

      // Show browser notification
      await notificationService.showBrowserNotification({
        title,
        body: `${body}${details}`,
        tag: `lead-assignment-${notification.leadId}`,
        requireInteraction: true,
        // REMOVED ACTIONS - they are not supported in regular notifications
      })

      // Show toast notification
      toast.success(title, {
        description: `${body}${details}`,
        action: {
          label: "View Lead",
          onClick: () => {
            window.open(`/telecaller/leads/${notification.leadId}`, "_blank")
          },
        },
        duration: 8000,
      })

      // Send push notification if user has subscription
      await this.sendPushNotification(notification, assignedUser)

      // Store notification in database for history
      await this.storeNotificationHistory(notification, assignedUser)
    } catch (error) {
      console.error("Error sending lead assignment notification:", error)
    }
  }

  // Send push notification
  private async sendPushNotification(notification: LeadAssignmentNotification, user: any): Promise<void> {
    try {
      const response = await fetch("/api/notifications/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: notification.assignedTo,
          title: "🎯 New Lead Assigned",
          body: `${notification.leadName} has been assigned to you${this.formatLeadDetails(notification)}`,
          url: `/telecaller/leads/${notification.leadId}`,
          data: {
            type: "lead_assignment",
            leadId: notification.leadId,
            leadName: notification.leadName,
            leadPhone: notification.leadPhone,
            priority: notification.priority,
          },
        }),
      })

      if (!response.ok) {
        console.error("Failed to send push notification:", await response.text())
      }
    } catch (error) {
      console.error("Error sending push notification:", error)
    }
  }

  // Store notification in database for history tracking
  private async storeNotificationHistory(notification: LeadAssignmentNotification, user: any): Promise<void> {
    try {
      const { error } = await this.supabase.from("notification_history").insert({
        user_id: notification.assignedTo,
        type: "lead_assignment",
        title: "New Lead Assigned",
        message: `${notification.leadName} has been assigned to you`,
        data: {
          leadId: notification.leadId,
          leadName: notification.leadName,
          leadPhone: notification.leadPhone,
          assignedBy: notification.assignedBy,
          priority: notification.priority,
          loanAmount: notification.loanAmount,
          loanType: notification.loanType,
        },
        read: false,
        created_at: new Date().toISOString(),
      })

      if (error) {
        console.error("Error storing notification history:", error)
      }
    } catch (error) {
      console.error("Error storing notification history:", error)
    }
  }

  // Format lead details for notification
  private formatLeadDetails(notification: LeadAssignmentNotification): string {
    const details = []

    if (notification.priority && notification.priority !== "medium") {
      details.push(`Priority: ${notification.priority.toUpperCase()}`)
    }

    if (notification.loanAmount) {
      details.push(`Amount: ₹${notification.loanAmount.toLocaleString()}`)
    }

    if (notification.loanType) {
      details.push(`Type: ${notification.loanType}`)
    }

    return details.length > 0 ? ` (${details.join(", ")})` : ""
  }

  // Bulk notification for multiple assignments
  async notifyBulkAssignment(assignments: LeadAssignmentNotification[], assignedTo: string): Promise<void> {
    try {
      // Get assigned user details
      const { data: assignedUser, error: userError } = await this.supabase
        .from("users")
        .select("full_name, email, notification_preferences")
        .eq("id", assignedTo)
        .single()

      if (userError || !assignedUser) {
        console.error("Error fetching assigned user:", userError)
        return
      }

      // Check if user has assignment notifications enabled
      const preferences = assignedUser.notification_preferences || {}
      if (preferences.assignment_notifications === false) {
        return
      }

      const count = assignments.length
      const title = `🎯 ${count} New Leads Assigned`
      const body = `${count} leads have been assigned to you`

      // Show browser notification
      await notificationService.showBrowserNotification({
        title,
        body,
        tag: `bulk-assignment-${Date.now()}`,
        requireInteraction: true,
        // REMOVED ACTIONS - they are not supported in regular notifications
      })

      // Show toast notification
      toast.success(title, {
        description: body,
        action: {
          label: "View Leads",
          onClick: () => {
            window.open("/telecaller/leads", "_blank")
          },
        },
        duration: 8000,
      })

      // Send push notification
      await fetch("/api/notifications/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: assignedTo,
          title,
          body,
          url: "/telecaller/leads",
          data: {
            type: "bulk_lead_assignment",
            count,
            leadIds: assignments.map((a) => a.leadId),
          },
        }),
      })
    } catch (error) {
      console.error("Error sending bulk assignment notification:", error)
    }
  }

  // Setup real-time subscription for lead assignments
  setupRealtimeSubscription(userId: string): void {
    const channel = this.supabase
      .channel("lead-assignments")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "leads",
          filter: `assigned_to=eq.${userId}`,
        },
        (payload) => {
          // Check if this is a new assignment (assigned_to changed from null)
          if (payload.old.assigned_to === null && payload.new.assigned_to === userId) {
            this.handleRealtimeAssignment(payload.new)
          }
        },
      )
      .subscribe()
  }

  // Handle real-time assignment notification
  private async handleRealtimeAssignment(lead: any): Promise<void> {
    const notification: LeadAssignmentNotification = {
      leadId: lead.id,
      leadName: lead.name,
      leadPhone: lead.phone,
      leadEmail: lead.email,
      assignedTo: lead.assigned_to,
      assignedBy: lead.assigned_by,
      assignedAt: lead.assigned_at,
      priority: lead.priority,
      loanAmount: lead.loan_amount,
      loanType: lead.loan_type,
    }

    await this.notifyLeadAssignment(notification)
  }
}

export const leadAssignmentNotificationManager = new LeadAssignmentNotificationManager()
