"use client"

import { NotificationPermission } from "@/components/notification-permission"
import { PWAInstallPrompt } from "@/components/pwa-install-prompt"
import { PWAUpdatePrompt } from "@/components/pwa-update-prompt"
import { AppStatusBar } from "@/components/pwa/app-status-bar"
import { NativeInteractions } from "@/components/pwa/native-interactions"
import { AppShortcuts } from "@/components/pwa/app-shortcuts"
import { OfflineIndicator } from "@/components/offline-indicator"
import { CallLogPermission } from "@/components/device/call-log-permission"
import { useEffect } from "react"

export default function PWAComponents() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("SW registered: ", registration)
          })
          .catch((registrationError) => {
            console.log("SW registration failed: ", registrationError)
          })
      })
    }
  }, [])

  const handlePermissionGranted = () => {
    console.log("Call log permission granted")
    // Here you could initialize call log tracking
  }

  const handlePermissionDenied = () => {
    console.log("Call log permission denied")
    // Here you could show alternative options
  }

  return (
    <>
      <AppStatusBar />
      <NativeInteractions />
      <AppShortcuts />
      <NotificationPermission />
      <CallLogPermission 
        onPermissionGranted={handlePermissionGranted}
        onPermissionDenied={handlePermissionDenied}
      />
      <PWAInstallPrompt />
      <PWAUpdatePrompt />
      <OfflineIndicator />
    </>
  )
}