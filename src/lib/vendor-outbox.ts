"use client"

import { openDB, type DBSchema, type IDBPDatabase } from "idb"

/**
 * Vendor-side outbox for application submissions that failed because
 * the network was unavailable. Replayed when the SW signals "sync" or
 * when the next page-load detects the browser is back online.
 */

export interface PendingSubmission {
  id?: number
  applicationId: string
  createdAt: string
}

interface VendorDB extends DBSchema {
  pending: {
    key: number
    value: PendingSubmission
  }
}

let _db: Promise<IDBPDatabase<VendorDB>> | null = null

function getDB() {
  if (!_db) {
    _db = openDB<VendorDB>("passmark-vendor", 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("pending")) {
          db.createObjectStore("pending", { keyPath: "id", autoIncrement: true })
        }
      },
    })
  }
  return _db
}

export async function enqueuePending(applicationId: string) {
  const db = await getDB()
  await db.add("pending", { applicationId, createdAt: new Date().toISOString() })
}

export async function listPending(): Promise<PendingSubmission[]> {
  const db = await getDB()
  return db.getAll("pending")
}

export async function clearPending(ids: number[]) {
  if (ids.length === 0) return
  const db = await getDB()
  const tx = db.transaction("pending", "readwrite")
  for (const id of ids) await tx.objectStore("pending").delete(id)
  await tx.done
}
