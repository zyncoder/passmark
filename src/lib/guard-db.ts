"use client"

import { openDB, type DBSchema, type IDBPDatabase } from "idb"

/**
 * IndexedDB layer used by the Guard PWA for offline credential lookup
 * and an outbox of scan logs that need to sync when network returns.
 */

export interface CachedCredential {
  credentialId: string
  eventId: string
  applicationId: string
  applicantName: string
  designation: string | null
  photoUrl: string | null
  orgName: string | null
  zones: string[] // zone_id list
  serialNumber: string | null
  isActive: boolean
  syncedAt: number
}

export interface CachedZone {
  id: string
  name: string
  eventId: string
}

export interface OutboxScan {
  id?: number
  credentialId: string | null
  guardId: string
  eventId: string
  zoneId: string
  zoneLabel: string
  outcome: ScanOutcome
  reason: string | null
  scannedAt: string // ISO timestamp
  deviceId: string | null
  rawPayload: string
}

export type ScanOutcome =
  | "ALLOW"
  | "DENY_ZONE"
  | "DENY_REVOKED"
  | "DENY_INVALID"
  | "ALREADY_SCANNED"

interface GuardDB extends DBSchema {
  credentials: {
    key: string
    value: CachedCredential
    indexes: { byEvent: string }
  }
  zones: {
    key: string
    value: CachedZone
    indexes: { byEvent: string }
  }
  scans: {
    key: string // credentialId — local "already scanned" guard
    value: { credentialId: string; scannedAt: string; zoneId: string }
  }
  outbox: {
    key: number
    value: OutboxScan
    indexes: { byScannedAt: string }
  }
  meta: {
    key: string
    value: { key: string; value: unknown }
  }
}

const DB_NAME = "passmark-guard"
const DB_VERSION = 1

let _db: Promise<IDBPDatabase<GuardDB>> | null = null

export function getDB() {
  if (!_db) {
    _db = openDB<GuardDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("credentials")) {
          const s = db.createObjectStore("credentials", { keyPath: "credentialId" })
          s.createIndex("byEvent", "eventId")
        }
        if (!db.objectStoreNames.contains("zones")) {
          const s = db.createObjectStore("zones", { keyPath: "id" })
          s.createIndex("byEvent", "eventId")
        }
        if (!db.objectStoreNames.contains("scans")) {
          db.createObjectStore("scans", { keyPath: "credentialId" })
        }
        if (!db.objectStoreNames.contains("outbox")) {
          const s = db.createObjectStore("outbox", { keyPath: "id", autoIncrement: true })
          s.createIndex("byScannedAt", "scannedAt")
        }
        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta", { keyPath: "key" })
        }
      },
    })
  }
  return _db
}

export async function setMeta(key: string, value: unknown) {
  const db = await getDB()
  await db.put("meta", { key, value })
}

export async function getMeta<T = unknown>(key: string): Promise<T | undefined> {
  const db = await getDB()
  const row = await db.get("meta", key)
  return row?.value as T | undefined
}

export async function replaceCredentials(creds: CachedCredential[]) {
  const db = await getDB()
  const tx = db.transaction("credentials", "readwrite")
  await tx.objectStore("credentials").clear()
  for (const c of creds) {
    await tx.objectStore("credentials").put(c)
  }
  await tx.done
  await setMeta("credentials_last_sync", Date.now())
}

export async function replaceZones(zones: CachedZone[]) {
  const db = await getDB()
  const tx = db.transaction("zones", "readwrite")
  await tx.objectStore("zones").clear()
  for (const z of zones) await tx.objectStore("zones").put(z)
  await tx.done
}

export async function getCredential(credentialId: string) {
  const db = await getDB()
  return db.get("credentials", credentialId)
}

export async function listZones(eventId: string) {
  const db = await getDB()
  return db.getAllFromIndex("zones", "byEvent", eventId)
}

export async function markScanned(credentialId: string, zoneId: string) {
  const db = await getDB()
  await db.put("scans", {
    credentialId,
    zoneId,
    scannedAt: new Date().toISOString(),
  })
}

export async function getLocalScan(credentialId: string) {
  const db = await getDB()
  return db.get("scans", credentialId)
}

export async function enqueueScan(scan: OutboxScan) {
  const db = await getDB()
  await db.add("outbox", scan)
}

export async function drainOutbox(): Promise<OutboxScan[]> {
  const db = await getDB()
  return db.getAll("outbox")
}

export async function removeOutboxEntries(ids: number[]) {
  if (!ids.length) return
  const db = await getDB()
  const tx = db.transaction("outbox", "readwrite")
  for (const id of ids) await tx.objectStore("outbox").delete(id)
  await tx.done
}

export async function clearAll() {
  const db = await getDB()
  const tx = db.transaction(
    ["credentials", "zones", "scans", "outbox", "meta"],
    "readwrite"
  )
  await Promise.all([
    tx.objectStore("credentials").clear(),
    tx.objectStore("zones").clear(),
    tx.objectStore("scans").clear(),
    tx.objectStore("outbox").clear(),
    tx.objectStore("meta").clear(),
  ])
  await tx.done
}
