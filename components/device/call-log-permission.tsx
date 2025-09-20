"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Phone, Shield, AlertCircle, CheckCircle } from "lucide-react"
import { callLogsManager } from "@/lib/device/call-logs"
import { toast } from "sonner"

interface CallLogPermissionProps {
  onPermissionGranted?: () => void
  onPermissionDenied?: () => void
}

export function CallLogPermission({ onPermissionGranted, onPermissionDenied }: CallLogPermissionProps) {
  const [permissionState, setPermissionState] = useState<PermissionState>("prompt")
  const [isLoading, setIsLoading] = useState(false)
  const [isSupported, setIsSupported] = useState(true)

  useEffect(() => {
    checkPermissionStatus()
  }, [])

  const checkPermissionStatus = async () => {
    try {
      // Check if call logs API is available
      // @ts-ignore - TypeScript doesn't recognize static methods on instance
      const available = callLogsManager.isAvailable()
      setIsSupported(available)

      if (!available) {
        setPermissionState("denied")
        return
      }

      // In a real implementation, we would check the actual permission status
      // For now, we'll set it to prompt
      setPermissionState("prompt")
    } catch (error) {
      console.error("Error checking call log permission status:", error)
      setPermissionState("denied")
      setIsSupported(false)
    }
  }

  const requestPermission = async () => {
    setIsLoading(true)
    try {
      // @ts-ignore - TypeScript doesn't recognize static methods on instance
      const result = await callLogsManager.requestPermission()
      setPermissionState(result)

      if (result === "granted") {
        toast.success("Call log access granted!", {
          description: "You can now track your calls automatically"
        })
        onPermissionGranted?.()
      } else if (result === "denied") {
        toast.error("Call log access denied", {
          description: "You can still log calls manually"
        })
        onPermissionDenied?.()
      } else {
        toast.info("Call log access request pending", {
          description: "Please check your device settings"
        })
      }
    } catch (error) {
      console.error("Error requesting call log permission:", error)
      toast.error("Failed to request call log permission", {
        description: "Please try again or check your device settings"
      })
      setPermissionState("denied")
      onPermissionDenied?.()
    } finally {
      setIsLoading(false)
    }
  }

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Call Log Access Unavailable
          </CardTitle>
          <CardDescription>
            Call log access is not supported on this device or browser. You can still log calls manually.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4" />
            <span>Manual call logging is always available</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5" />
          Call Log Access
        </CardTitle>
        <CardDescription>
          Allow access to your call logs for automatic tracking and reporting
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="text-sm font-medium">Permission Status</span>
          </div>
          <Badge variant={permissionState === "granted" ? "default" : "secondary"}>
            {permissionState === "granted" ? (
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Granted
              </div>
            ) : permissionState === "denied" ? (
              "Denied"
            ) : (
              "Not Requested"
            )}
          </Badge>
        </div>

        {permissionState !== "granted" && (
          <Button 
            onClick={requestPermission} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? "Requesting Access..." : "Request Call Log Access"}
          </Button>
        )}

        {permissionState === "granted" && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Call log access granted</span>
            </div>
            <p className="text-sm text-green-700 mt-1">
              Your calls will be automatically tracked and logged
            </p>
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p>
            • Call log access helps automatically track your calls for reporting
          </p>
          <p>
            • Your call data is stored securely and never shared with third parties
          </p>
          <p>
            • You can revoke this permission at any time in your device settings
          </p>
        </div>
      </CardContent>
    </Card>
  )
}