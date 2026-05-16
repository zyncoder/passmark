import { NextRequest, NextResponse } from "next/server"
import { assertCaller, createAdminClient } from "@/lib/supabase-admin"

export const runtime = "nodejs"

/**
 * Pre-event credential sync for the Guard PWA. Returns:
 *   - eventId        — the event the guard is bound to
 *   - assignedZones  — zones this guard can validate
 *   - credentials    — all active credentials in this event with the zones they grant
 *
 * The Guard app caches this in IndexedDB and uses it for offline lookups.
 */
export async function GET(request: NextRequest) {
  const caller = await assertCaller(request.headers.get("Authorization"), "guard")
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = createAdminClient()

  const { data: guard } = await admin
    .from("guards")
    .select("id, event_id, is_active")
    .eq("id", caller.userId)
    .single()

  if (!guard || !guard.is_active) {
    return NextResponse.json({ error: "Guard inactive" }, { status: 403 })
  }
  if (!guard.event_id) {
    return NextResponse.json({ error: "Guard not assigned to an event" }, { status: 409 })
  }

  const [
    { data: assignedZones },
    { data: zones },
    { data: credentials },
  ] = await Promise.all([
    admin.from("guard_zones").select("zone_id, zones ( name )").eq("guard_id", caller.userId),
    admin.from("zones").select("id, name").eq("event_id", guard.event_id),
    admin
      .from("credentials")
      .select(`
        id, event_id, application_id, serial_number, is_active,
        applications ( first_name, last_name, designation, photo_url, vendor_profiles ( org_name ) ),
        credential_zones ( zone_id )
      `)
      .eq("event_id", guard.event_id)
      .eq("is_active", true),
  ])

  const out = (credentials ?? []).map((c: any) => ({
    credentialId: c.id,
    eventId: c.event_id,
    applicationId: c.application_id,
    applicantName: `${c.applications?.first_name ?? ""} ${c.applications?.last_name ?? ""}`.trim(),
    designation: c.applications?.designation ?? null,
    photoUrl: c.applications?.photo_url ?? null,
    orgName: c.applications?.vendor_profiles?.org_name ?? null,
    serialNumber: c.serial_number,
    isActive: c.is_active,
    zones: (c.credential_zones ?? []).map((z: any) => z.zone_id),
  }))

  return NextResponse.json({
    eventId: guard.event_id,
    assignedZones: (assignedZones ?? []).map((z: any) => ({
      id: z.zone_id,
      name: z.zones?.name,
    })),
    zones: (zones ?? []).map((z: any) => ({
      id: z.id,
      name: z.name,
      eventId: guard.event_id,
    })),
    credentials: out,
    syncedAt: new Date().toISOString(),
  })
}
