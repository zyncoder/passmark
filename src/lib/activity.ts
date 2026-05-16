import type { SupabaseClient } from "@supabase/supabase-js"

export type ActivityAction =
  | "FORM_SUBMITTED"
  | "FORM_APPROVED"
  | "FORM_REJECTED"
  | "FORM_REOPENED"
  | "CREDENTIAL_MINTED"
  | "CREDENTIAL_INVALIDATED"
  | "PRINT_STARTED"
  | "PRINT_COMPLETED"
  | "QR_MAPPED"
  | "SCAN_ALLOW"
  | "SCAN_DENY"
  | "SCAN_ANOMALY"

export interface ActivityInput {
  eventId?: string | null
  actorId?: string | null
  actorRole?: string | null
  action: ActivityAction
  subjectType?: string | null
  subjectId?: string | null
  metadata?: Record<string, unknown> | null
}

export async function logActivity(supabase: SupabaseClient, input: ActivityInput) {
  const { error } = await supabase.from("activity_events").insert({
    event_id: input.eventId ?? null,
    actor_id: input.actorId ?? null,
    actor_role: input.actorRole ?? null,
    action: input.action,
    subject_type: input.subjectType ?? null,
    subject_id: input.subjectId ?? null,
    metadata: input.metadata ?? null,
  })
  if (error) {
    // Activity logging must never break the primary action.
    console.warn("activity_events insert failed", error.message)
  }
}
