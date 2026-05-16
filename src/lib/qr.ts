import { createHmac, timingSafeEqual } from "node:crypto"
import QRCode from "qrcode"

const HMAC_ALG = "sha256"

function getSecret(): string {
  const s = process.env.PASSMARK_QR_HMAC_SECRET
  if (!s || s.length < 16) {
    throw new Error(
      "PASSMARK_QR_HMAC_SECRET is missing or too short. " +
        "Set a 32+ char secret in .env.local before minting credentials."
    )
  }
  return s
}

export interface QrPayload {
  credentialId: string
  eventId: string
  applicationId: string
  ts: number
}

const SEP = "|"

export function encodePayload(p: QrPayload): string {
  return [p.credentialId, p.eventId, p.applicationId, p.ts].join(SEP)
}

export function decodePayload(raw: string): QrPayload | null {
  const parts = raw.split(SEP)
  if (parts.length !== 4) return null
  const [credentialId, eventId, applicationId, tsStr] = parts
  const ts = Number(tsStr)
  if (!credentialId || !eventId || !applicationId || !Number.isFinite(ts)) return null
  return { credentialId, eventId, applicationId, ts }
}

export function signPayload(payload: string): string {
  return createHmac(HMAC_ALG, getSecret()).update(payload).digest("hex")
}

export function verifySignature(payload: string, signature: string): boolean {
  const expected = signPayload(payload)
  const a = Buffer.from(expected, "hex")
  const b = Buffer.from(signature, "hex")
  if (a.length !== b.length) return false
  try {
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

/**
 * The full string we serialise inside the QR image.
 * Format: <payload>.<signature>
 */
export function encodeSignedToken(p: QrPayload): { payload: string; signature: string; token: string } {
  const payload = encodePayload(p)
  const signature = signPayload(payload)
  return { payload, signature, token: `${payload}.${signature}` }
}

export function parseSignedToken(token: string):
  | { payload: QrPayload; raw: string; signature: string; ok: true }
  | { ok: false; reason: string } {
  const idx = token.lastIndexOf(".")
  if (idx < 0) return { ok: false, reason: "Malformed token" }
  const raw = token.slice(0, idx)
  const signature = token.slice(idx + 1)
  const payload = decodePayload(raw)
  if (!payload) return { ok: false, reason: "Malformed payload" }
  return { ok: true, payload, raw, signature }
}

export async function renderQrPng(token: string): Promise<string> {
  return QRCode.toDataURL(token, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 512,
  })
}

export async function mintCredentialQr(p: QrPayload): Promise<{
  payload: string
  signature: string
  token: string
  dataUrl: string
}> {
  const { payload, signature, token } = encodeSignedToken(p)
  const dataUrl = await renderQrPng(token)
  return { payload, signature, token, dataUrl }
}
