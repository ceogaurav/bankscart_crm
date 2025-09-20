"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function updateLead(leadId: string, formData: FormData) {
  const supabase = await createClient()

  const updates = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    phone: formData.get("phone") as string,
    company: formData.get("company") as string,
    status: formData.get("status") as string,
    priority: formData.get("priority") as string,
    assigned_to: (formData.get("assigned_to") as string) || null,
    source: formData.get("source") as string,
    notes: formData.get("notes") as string,
  }

  const { error } = await supabase.from("leads").update(updates).eq("id", leadId)

  if (!error) {
    redirect("/admin/leads")
  }
}
